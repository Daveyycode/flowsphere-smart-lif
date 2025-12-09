/**
 * Resend Email Service
 * SECURITY UPDATE (Dec 9, 2025): Now uses Edge Function to keep API key server-side
 * Falls back to direct API call if Edge Function not deployed (for dev)
 */

// Supabase configuration for Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const EMAIL_EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/send-email`

// Fallback for local development
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'FlowSphere <noreply@myflowsphere.com>'

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  html?: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Check if Resend is configured (Edge Function or direct API)
 */
export function isResendConfigured(): boolean {
  const hasEdgeFunction = !!SUPABASE_URL && !!SUPABASE_ANON_KEY
  const hasDirectAPI = !!RESEND_API_KEY
  return hasEdgeFunction || hasDirectAPI
}

/**
 * Send email using Edge Function (secure) or direct Resend API (fallback)
 */
export async function sendEmailWithResend(options: SendEmailOptions): Promise<SendEmailResult> {
  // Try Edge Function first (secure - API key hidden server-side)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(EMAIL_EDGE_FUNCTION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          body: options.body,
          html: options.html,
          replyTo: options.replyTo,
        }),
      })

      const data = await response.json()

      if (data.success) {
        return { success: true, id: data.id }
      }

      // If Edge Function explicitly fails, return its error
      if (data.error) {
        console.warn('[Resend] Edge Function error:', data.error)
        // Don't fall through - if Edge Function is configured but fails, report it
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.warn('[Resend] Edge Function unavailable, using direct API')
    }
  }

  // Fallback: Direct API call (for development or if Edge Function not deployed)
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [options.to],
        subject: options.subject,
        text: options.body,
        html: options.html || options.body.replace(/\n/g, '<br>'),
        reply_to: options.replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('[Resend] Error:', error)

      if (response.status === 401) {
        return { success: false, error: 'Invalid Resend API key' }
      }
      if (response.status === 403) {
        return { success: false, error: 'Domain not verified in Resend' }
      }

      return { success: false, error: error.message || 'Failed to send email' }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error) {
    console.error('[Resend] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Send meeting notes email with optional raw transcript
 */
export async function sendMeetingNotesEmail(options: {
  to: string
  subject: string
  formattedContent: string
  noteTitle: string
  noteDate: string
  noteDuration: string
  formatType: string
  includeRawTranscript?: boolean
  rawTranscript?: string
  senderEmail?: string
}): Promise<SendEmailResult> {
  const {
    to,
    subject,
    formattedContent,
    noteTitle,
    noteDate,
    noteDuration,
    formatType,
    includeRawTranscript,
    rawTranscript,
    senderEmail,
  } = options

  // Build HTML email
  let htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">FlowSphere Meeting Notes</h1>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Meeting:</strong></td>
            <td style="padding: 8px 0;">${noteTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Date:</strong></td>
            <td style="padding: 8px 0;">${noteDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Duration:</strong></td>
            <td style="padding: 8px 0;">${noteDuration}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Format:</strong></td>
            <td style="padding: 8px 0;">${formatType}</td>
          </tr>
        </table>
      </div>

      <div style="background: white; padding: 20px; border: 1px solid #e9ecef; border-top: none;">
        <h2 style="color: #8B5CF6; margin-top: 0;">${formatType} Transcript</h2>
        <div style="white-space: pre-wrap; line-height: 1.6;">
${formattedContent}
        </div>
      </div>
  `

  // Add raw transcript if requested
  if (includeRawTranscript && rawTranscript) {
    htmlBody += `
      <div style="background: #fff3cd; padding: 20px; border: 1px solid #e9ecef; border-top: none;">
        <h2 style="color: #856404; margin-top: 0;">Original Recording (Raw Transcript)</h2>
        <div style="white-space: pre-wrap; line-height: 1.6; color: #856404;">
${rawTranscript}
        </div>
      </div>
    `
  }

  htmlBody += `
      <div style="background: #f8f9fa; padding: 15px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="margin: 0; color: #6c757d; font-size: 12px;">
          Generated by FlowSphere Meeting Notes<br>
          <a href="https://myflowsphere.com" style="color: #8B5CF6;">myflowsphere.com</a>
        </p>
      </div>
    </div>
  `

  // Plain text version
  let textBody = `
FlowSphere Meeting Notes
========================

Meeting: ${noteTitle}
Date: ${noteDate}
Duration: ${noteDuration}
Format: ${formatType}

${formatType} Transcript
------------------------
${formattedContent}
`

  if (includeRawTranscript && rawTranscript) {
    textBody += `

Original Recording (Raw Transcript)
-----------------------------------
${rawTranscript}
`
  }

  textBody += `

---
Generated by FlowSphere Meeting Notes
https://myflowsphere.com
`

  return sendEmailWithResend({
    to,
    subject,
    body: textBody,
    html: htmlBody,
    replyTo: senderEmail,
  })
}
