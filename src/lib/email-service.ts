/**
 * FlowSphere Email Service
 * Uses Resend for transactional emails (OTP, notifications, etc.)
 *
 * Setup:
 * 1. Create account at https://resend.com
 * 2. Add your domain (e.g., flowsphere.com) and verify DNS
 * 3. Get API key from dashboard
 * 4. Add to .env: VITE_RESEND_API_KEY=re_xxxxx
 *
 * For custom domain emails (noreply@flowsphere.com):
 * - Go to Resend Dashboard → Domains → Add Domain
 * - Add the DNS records they provide
 * - Wait for verification (usually 5-10 minutes)
 */

import { logger } from '@/lib/security-utils'

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || ''
const FROM_EMAIL = import.meta.env.VITE_EMAIL_FROM || 'FlowSphere <noreply@flowsphere.com>'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Check if server-side OTP is available (Edge Functions deployed)
 */
export function isServerOTPEnabled(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Check if email service is configured
 */
export function isEmailServiceEnabled(): boolean {
  return !!RESEND_API_KEY
}

/**
 * Send email via Resend
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    logger.warn('Resend API key not configured', null, 'EmailService')
    return {
      success: false,
      error: 'Email service not configured. Add VITE_RESEND_API_KEY to .env',
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error('Resend API error', data, 'EmailService')
      return {
        success: false,
        error: data.message || 'Failed to send email',
      }
    }

    logger.info('Email sent successfully', { id: data.id }, 'EmailService')
    return {
      success: true,
      id: data.id,
    }
  } catch (error) {
    logger.error('Email send failed', error, 'EmailService')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// ==========================================
// OTP Email Service
// ==========================================

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate OTP with expiry time
 */
export function generateOTPWithExpiry(expiryMinutes: number = 10): {
  code: string
  expiresAt: number
} {
  return {
    code: generateOTP(),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
  }
}

/**
 * Store OTP in localStorage (for demo/dev)
 * In production, store in database with proper security
 */
export function storeOTP(email: string, code: string, expiresAt: number): void {
  const otpData = {
    code,
    expiresAt,
    attempts: 0,
  }
  localStorage.setItem(`flowsphere_otp_${email}`, JSON.stringify(otpData))
}

/**
 * Verify OTP
 */
export function verifyOTP(email: string, inputCode: string): {
  valid: boolean
  error?: string
} {
  try {
    const stored = localStorage.getItem(`flowsphere_otp_${email}`)
    if (!stored) {
      return { valid: false, error: 'No OTP found. Please request a new code.' }
    }

    const otpData = JSON.parse(stored)

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      localStorage.removeItem(`flowsphere_otp_${email}`)
      return { valid: false, error: 'OTP expired. Please request a new code.' }
    }

    // Check attempts (max 3)
    if (otpData.attempts >= 3) {
      localStorage.removeItem(`flowsphere_otp_${email}`)
      return { valid: false, error: 'Too many attempts. Please request a new code.' }
    }

    // Check code
    if (otpData.code !== inputCode) {
      otpData.attempts++
      localStorage.setItem(`flowsphere_otp_${email}`, JSON.stringify(otpData))
      return { valid: false, error: `Invalid code. ${3 - otpData.attempts} attempts remaining.` }
    }

    // Success - clear OTP
    localStorage.removeItem(`flowsphere_otp_${email}`)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Verification failed. Please try again.' }
  }
}

// ==========================================
// Server-Side OTP Functions (Edge Functions)
// ==========================================

/**
 * Send OTP via Edge Function (server-side storage)
 * Falls back to localStorage if Edge Functions not deployed
 */
export async function sendOTPServerSide(
  email: string,
  purpose: string = 'login'
): Promise<{ success: boolean; error?: string }> {
  if (!isServerOTPEnabled()) {
    logger.debug('Server OTP not enabled, using localStorage fallback')
    return { success: false, error: 'Server OTP not configured' }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/otp-send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, purpose }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error('OTP send failed', data, 'EmailService')
      return { success: false, error: data.error || 'Failed to send OTP' }
    }

    logger.info('OTP sent via Edge Function', { email }, 'EmailService')
    return { success: true }
  } catch (error) {
    logger.error('OTP send error', error, 'EmailService')
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Verify OTP via Edge Function (server-side verification)
 * Falls back to localStorage if Edge Functions not deployed
 */
export async function verifyOTPServerSide(
  email: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  if (!isServerOTPEnabled()) {
    logger.debug('Server OTP not enabled, using localStorage fallback')
    return verifyOTP(email, code) // Fall back to localStorage
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/otp-verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.error('OTP verify failed', data, 'EmailService')
      return { valid: false, error: data.error || 'Verification failed' }
    }

    logger.info('OTP verified via Edge Function', { email }, 'EmailService')
    return { valid: data.valid, error: data.error }
  } catch (error) {
    logger.error('OTP verify error', error, 'EmailService')
    return { valid: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(
  email: string,
  options?: {
    purpose?: 'login' | 'verify' | 'reset' | 'security'
    expiryMinutes?: number
  }
): Promise<{ success: boolean; error?: string }> {
  const { purpose = 'verify', expiryMinutes = 10 } = options || {}

  // Generate OTP
  const { code, expiresAt } = generateOTPWithExpiry(expiryMinutes)

  // Store OTP
  storeOTP(email, code, expiresAt)

  // Purpose-specific messages
  const purposeMessages = {
    login: {
      subject: 'Your FlowSphere Login Code',
      heading: 'Sign In to FlowSphere',
      message: 'Use this code to sign in to your FlowSphere account:',
    },
    verify: {
      subject: 'Verify Your Email - FlowSphere',
      heading: 'Verify Your Email',
      message: 'Use this code to verify your email address:',
    },
    reset: {
      subject: 'Reset Your Password - FlowSphere',
      heading: 'Password Reset',
      message: 'Use this code to reset your password:',
    },
    security: {
      subject: 'Security Verification - FlowSphere',
      heading: 'Security Check',
      message: 'A security action requires verification. Use this code:',
    },
  }

  const msg = purposeMessages[purpose]

  // Email HTML template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${msg.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🌐 FlowSphere
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                ${msg.heading}
              </h2>
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.5;">
                ${msg.message}
              </p>

              <!-- OTP Code -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px;">
                ⏱️ This code expires in <strong>${expiryMinutes} minutes</strong>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 14px;">
                🔒 If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} FlowSphere. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: #a1a1aa; font-size: 12px;">
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  // Plain text version
  const text = `
${msg.heading}

${msg.message}

Your verification code: ${code}

This code expires in ${expiryMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

© ${new Date().getFullYear()} FlowSphere
`

  // Send email
  const result = await sendEmail({
    to: email,
    subject: msg.subject,
    html,
    text,
  })

  return result
}

// ==========================================
// Notification Emails
// ==========================================

/**
 * Send security alert email
 */
export async function sendSecurityAlertEmail(
  email: string,
  alert: {
    title: string
    message: string
    action?: string
    actionUrl?: string
  }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Security Alert - FlowSphere</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #ef4444; padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px;">
                ⚠️ Security Alert
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 18px;">
                ${alert.title}
              </h2>
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 15px; line-height: 1.6;">
                ${alert.message}
              </p>
              ${alert.action && alert.actionUrl ? `
              <a href="${alert.actionUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                ${alert.action}
              </a>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                If this wasn't you, please secure your account immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return sendEmail({
    to: email,
    subject: `⚠️ Security Alert: ${alert.title}`,
    html,
  })
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to FlowSphere!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px;">
                🎉 Welcome to FlowSphere!
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Your smart home, simplified.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px 0; color: #18181b; font-size: 16px;">
                Hi ${name || 'there'}! 👋
              </p>
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 15px; line-height: 1.6;">
                Thank you for joining FlowSphere. We're excited to help you manage your smart home, stay connected with family, and boost your productivity.
              </p>

              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px 0; color: #18181b; font-weight: 600;">Here's what you can do:</p>
                <ul style="margin: 0; padding-left: 20px; color: #52525b; font-size: 14px; line-height: 1.8;">
                  <li>Control smart devices with AI voice commands</li>
                  <li>Track family members' locations (with consent)</li>
                  <li>Secure your data with encrypted vault storage</li>
                  <li>Stay organized with smart notifications</li>
                </ul>
              </div>

              <p style="margin: 0; color: #71717a; font-size: 14px;">
                Need help? Just ask the AI assistant or check our support docs.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} FlowSphere. Made with ❤️
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return sendEmail({
    to: email,
    subject: '🎉 Welcome to FlowSphere!',
    html,
  })
}
