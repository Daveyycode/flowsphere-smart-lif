/**
 * OTP Email Verification System
 * Real-time email verification for user registration
 */

import { logger } from '@/lib/security-utils'

/**
 * OTP Configuration
 */
interface OTPConfig {
  length: number // OTP code length (4-8 digits)
  expiryMinutes: number // How long OTP is valid
  maxAttempts: number // Max verification attempts
  resendCooldown: number // Seconds before allowing resend
  emailProvider: 'sendgrid' | 'mailgun' | 'smtp' | 'mock'
}

/**
 * OTP Record
 */
interface OTPRecord {
  email: string
  code: string
  createdAt: string
  expiresAt: string
  attempts: number
  verified: boolean
  lastResent?: string
}

/**
 * User Registration Data
 */
export interface RegistrationData {
  email: string
  name: string
  password: string
  phone?: string
  metadata?: Record<string, any>
}

/**
 * Verification Result
 */
export interface VerificationResult {
  success: boolean
  message: string
  error?: string
  attemptsRemaining?: number
  canResend?: boolean
  nextResendIn?: number
}

/**
 * Email Template
 */
interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * OTP Verification Manager
 */
export class OTPVerificationManager {
  private otpKey = 'flowsphere-otp-records'
  private registrationKey = 'flowsphere-pending-registrations'
  private config: OTPConfig = {
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 5,
    resendCooldown: 60,
    emailProvider: 'mock'
  }

  /**
   * Initialize with custom config
   */
  constructor(config?: Partial<OTPConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * Start registration process with OTP
   */
  async startRegistration(data: RegistrationData): Promise<{
    success: boolean
    message: string
    email: string
    error?: string
  }> {
    try {
      // Validate email
      if (!this.isValidEmail(data.email)) {
        return {
          success: false,
          message: 'Invalid email address',
          email: data.email,
          error: 'INVALID_EMAIL'
        }
      }

      // Check if email already registered
      if (this.isEmailAlreadyRegistered(data.email)) {
        return {
          success: false,
          message: 'Email already registered',
          email: data.email,
          error: 'EMAIL_EXISTS'
        }
      }

      // Check rate limiting
      const canSend = this.canSendOTP(data.email)
      if (!canSend.allowed) {
        return {
          success: false,
          message: `Please wait ${canSend.waitSeconds}s before requesting another code`,
          email: data.email,
          error: 'RATE_LIMITED'
        }
      }

      // Generate OTP
      const otpCode = this.generateOTP()

      // Create OTP record
      const otpRecord: OTPRecord = {
        email: data.email,
        code: otpCode,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.expiryMinutes * 60 * 1000).toISOString(),
        attempts: 0,
        verified: false
      }

      // Save OTP record
      this.saveOTPRecord(otpRecord)

      // Save registration data (without password in plain text - hash it first)
      this.savePendingRegistration(data.email, {
        ...data,
        password: await this.hashPassword(data.password)
      })

      // Send email
      const emailSent = await this.sendOTPEmail(data.email, data.name, otpCode)

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to send verification email',
          email: data.email,
          error: 'EMAIL_SEND_FAILED'
        }
      }

      return {
        success: true,
        message: `Verification code sent to ${data.email}`,
        email: data.email
      }
    } catch (error) {
      logger.error('Registration error', error, 'OTPVerification')
      return {
        success: false,
        message: 'Registration failed',
        email: data.email,
        error: 'UNKNOWN_ERROR'
      }
    }
  }

  /**
   * Verify OTP code
   */
  verifyOTP(email: string, code: string): VerificationResult {
    try {
      // Get OTP record
      const otpRecord = this.getOTPRecord(email)

      if (!otpRecord) {
        return {
          success: false,
          message: 'No verification code found. Please request a new one.',
          error: 'NO_OTP_FOUND'
        }
      }

      // Check if already verified
      if (otpRecord.verified) {
        return {
          success: false,
          message: 'Email already verified',
          error: 'ALREADY_VERIFIED'
        }
      }

      // Check if expired
      if (this.isOTPExpired(otpRecord)) {
        return {
          success: false,
          message: 'Verification code expired. Please request a new one.',
          error: 'OTP_EXPIRED',
          canResend: true
        }
      }

      // Check max attempts
      if (otpRecord.attempts >= this.config.maxAttempts) {
        return {
          success: false,
          message: 'Too many failed attempts. Please request a new code.',
          error: 'MAX_ATTEMPTS_EXCEEDED',
          canResend: true
        }
      }

      // Increment attempts
      otpRecord.attempts++
      this.saveOTPRecord(otpRecord)

      // Verify code
      if (otpRecord.code !== code) {
        const remaining = this.config.maxAttempts - otpRecord.attempts
        return {
          success: false,
          message: `Incorrect code. ${remaining} attempts remaining.`,
          error: 'INCORRECT_CODE',
          attemptsRemaining: remaining
        }
      }

      // Success - mark as verified
      otpRecord.verified = true
      this.saveOTPRecord(otpRecord)

      // Complete registration
      const registrationData = this.getPendingRegistration(email)
      if (registrationData) {
        this.completeRegistration(email, registrationData)
      }

      return {
        success: true,
        message: 'Email verified successfully!'
      }
    } catch (error) {
      logger.error('Verification error', error, 'OTPVerification')
      return {
        success: false,
        message: 'Verification failed',
        error: 'VERIFICATION_ERROR'
      }
    }
  }

  /**
   * Resend OTP code
   */
  async resendOTP(email: string): Promise<VerificationResult> {
    try {
      // Check if can resend
      const canSend = this.canSendOTP(email)
      if (!canSend.allowed) {
        return {
          success: false,
          message: `Please wait ${canSend.waitSeconds}s before requesting another code`,
          error: 'RATE_LIMITED',
          canResend: false,
          nextResendIn: canSend.waitSeconds
        }
      }

      // Get existing record
      const existingRecord = this.getOTPRecord(email)
      if (!existingRecord) {
        return {
          success: false,
          message: 'No pending verification found',
          error: 'NO_PENDING_VERIFICATION'
        }
      }

      // Get registration data for name
      const registrationData = this.getPendingRegistration(email)
      if (!registrationData) {
        return {
          success: false,
          message: 'Registration data not found',
          error: 'NO_REGISTRATION_DATA'
        }
      }

      // Generate new OTP
      const newCode = this.generateOTP()

      // Update record
      existingRecord.code = newCode
      existingRecord.createdAt = new Date().toISOString()
      existingRecord.expiresAt = new Date(Date.now() + this.config.expiryMinutes * 60 * 1000).toISOString()
      existingRecord.attempts = 0
      existingRecord.lastResent = new Date().toISOString()

      this.saveOTPRecord(existingRecord)

      // Send email
      const emailSent = await this.sendOTPEmail(email, registrationData.name, newCode)

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to send verification email',
          error: 'EMAIL_SEND_FAILED'
        }
      }

      return {
        success: true,
        message: 'New verification code sent',
        canResend: false,
        nextResendIn: this.config.resendCooldown
      }
    } catch (error) {
      logger.error('Resend error', error, 'OTPVerification')
      return {
        success: false,
        message: 'Failed to resend code',
        error: 'RESEND_ERROR'
      }
    }
  }

  /**
   * Check verification status
   */
  getVerificationStatus(email: string): {
    pending: boolean
    verified: boolean
    expired: boolean
    attemptsRemaining: number
    canResend: boolean
    expiresIn?: number
  } {
    const otpRecord = this.getOTPRecord(email)

    if (!otpRecord) {
      return {
        pending: false,
        verified: false,
        expired: false,
        attemptsRemaining: 0,
        canResend: false
      }
    }

    const expired = this.isOTPExpired(otpRecord)
    const canSend = this.canSendOTP(email)
    const expiresIn = expired ? 0 : Math.floor((new Date(otpRecord.expiresAt).getTime() - Date.now()) / 1000)

    return {
      pending: !otpRecord.verified && !expired,
      verified: otpRecord.verified,
      expired,
      attemptsRemaining: Math.max(0, this.config.maxAttempts - otpRecord.attempts),
      canResend: canSend.allowed,
      expiresIn: expiresIn > 0 ? expiresIn : undefined
    }
  }

  /**
   * Cancel registration
   */
  cancelRegistration(email: string): void {
    this.deleteOTPRecord(email)
    this.deletePendingRegistration(email)
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOTPs(): number {
    const records = this.getAllOTPRecords()
    let cleaned = 0

    records.forEach(record => {
      if (this.isOTPExpired(record)) {
        this.deleteOTPRecord(record.email)
        this.deletePendingRegistration(record.email)
        cleaned++
      }
    })

    return cleaned
  }

  // Private methods

  /**
   * Generate random OTP code
   */
  private generateOTP(): string {
    const digits = '0123456789'
    let code = ''

    for (let i = 0; i < this.config.length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)]
    }

    return code
  }

  /**
   * Send OTP email
   */
  private async sendOTPEmail(email: string, name: string, code: string): Promise<boolean> {
    const template = this.getEmailTemplate(name, code)

    switch (this.config.emailProvider) {
      case 'sendgrid':
        return await this.sendViaSendGrid(email, template)
      case 'mailgun':
        return await this.sendViaMailgun(email, template)
      case 'smtp':
        return await this.sendViaSMTP(email, template)
      case 'mock':
      default:
        return this.sendViaMock(email, template, code)
    }
  }

  /**
   * Get email template
   */
  private getEmailTemplate(name: string, code: string): EmailTemplate {
    const subject = `Your FlowSphere Verification Code: ${code}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #007AFF; }
    .logo { font-size: 24px; font-weight: bold; color: #007AFF; }
    .content { padding: 30px 0; }
    .otp-box { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007AFF; font-family: monospace; }
    .info { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌊 FlowSphere</div>
    </div>

    <div class="content">
      <h2>Welcome, ${name}!</h2>
      <p>Thank you for registering with FlowSphere. To complete your registration, please verify your email address using the code below:</p>

      <div class="otp-box">
        <div class="otp-code">${code}</div>
      </div>

      <div class="info">
        ⏱️ <strong>This code expires in ${this.config.expiryMinutes} minutes</strong>
      </div>

      <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>

      <p><strong>Security Tips:</strong></p>
      <ul>
        <li>Never share your verification code with anyone</li>
        <li>FlowSphere will never ask for your code via phone or email</li>
        <li>If you suspect fraud, contact us immediately</li>
      </ul>
    </div>

    <div class="footer">
      <p>This is an automated message from FlowSphere.</p>
      <p>© ${new Date().getFullYear()} FlowSphere. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `

    const text = `
Welcome to FlowSphere!

Your verification code is: ${code}

This code expires in ${this.config.expiryMinutes} minutes.

If you didn't request this code, please ignore this email.

Never share your verification code with anyone.

© ${new Date().getFullYear()} FlowSphere. All rights reserved.
    `

    return { subject, html, text }
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(email: string, template: EmailTemplate): Promise<boolean> {
    // In production, use SendGrid API
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@flowsphere.com',
    //   subject: template.subject,
    //   text: template.text,
    //   html: template.html
    // })
    logger.info('[SendGrid] Would send email', { email }, 'OTPVerification')
    return true
  }

  /**
   * Send via Mailgun
   */
  private async sendViaMailgun(email: string, template: EmailTemplate): Promise<boolean> {
    // In production, use Mailgun API
    // const mailgun = require('mailgun-js')
    // const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN})
    // await mg.messages().send({
    //   from: 'FlowSphere <noreply@flowsphere.com>',
    //   to: email,
    //   subject: template.subject,
    //   text: template.text,
    //   html: template.html
    // })
    logger.info('[Mailgun] Would send email', { email }, 'OTPVerification')
    return true
  }

  /**
   * Send via SMTP
   */
  private async sendViaSMTP(email: string, template: EmailTemplate): Promise<boolean> {
    // In production, use nodemailer with SMTP
    // const nodemailer = require('nodemailer')
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS
    //   }
    // })
    // await transporter.sendMail({
    //   from: 'FlowSphere <noreply@flowsphere.com>',
    //   to: email,
    //   subject: template.subject,
    //   text: template.text,
    //   html: template.html
    // })
    logger.info('[SMTP] Would send email', { email }, 'OTPVerification')
    return true
  }

  /**
   * Mock email sending (for development)
   */
  private sendViaMock(email: string, template: EmailTemplate, code: string): boolean {
    // SECURITY: Never log OTP codes to console, even in development
    // The code is stored in localStorage for UI access during testing
    logger.info('[Mock Email] Verification email sent', {
      email,
      expiresInMinutes: this.config.expiryMinutes
    }, 'OTPVerification')

    // Store in localStorage for easy access in development UI (not logged to console)
    const mockEmails = JSON.parse(localStorage.getItem('flowsphere-mock-emails') || '[]')
    mockEmails.unshift({
      to: email,
      subject: template.subject,
      code,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.expiryMinutes * 60 * 1000).toISOString()
    })
    if (mockEmails.length > 10) mockEmails.pop()
    localStorage.setItem('flowsphere-mock-emails', JSON.stringify(mockEmails))

    return true
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or similar
    // const bcrypt = require('bcrypt')
    // return await bcrypt.hash(password, 10)

    // For now, simple base64 encoding (NOT SECURE - use bcrypt in production)
    return btoa(password)
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Check if email already registered
   */
  private isEmailAlreadyRegistered(email: string): boolean {
    // In production, check against user database
    const users = JSON.parse(localStorage.getItem('flowsphere-users') || '[]')
    return users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())
  }

  /**
   * Check if OTP expired
   */
  private isOTPExpired(record: OTPRecord): boolean {
    return Date.now() > new Date(record.expiresAt).getTime()
  }

  /**
   * Check if can send OTP (rate limiting)
   */
  private canSendOTP(email: string): { allowed: boolean; waitSeconds: number } {
    const record = this.getOTPRecord(email)

    if (!record) {
      return { allowed: true, waitSeconds: 0 }
    }

    const lastSentTime = record.lastResent ? new Date(record.lastResent).getTime() : new Date(record.createdAt).getTime()
    const elapsed = (Date.now() - lastSentTime) / 1000

    if (elapsed < this.config.resendCooldown) {
      return {
        allowed: false,
        waitSeconds: Math.ceil(this.config.resendCooldown - elapsed)
      }
    }

    return { allowed: true, waitSeconds: 0 }
  }

  /**
   * Complete registration
   */
  private completeRegistration(email: string, data: RegistrationData): void {
    // Get existing users
    const users = JSON.parse(localStorage.getItem('flowsphere-users') || '[]')

    // Add new user
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      name: data.name,
      phone: data.phone,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      ...data.metadata
    }

    users.push(newUser)
    localStorage.setItem('flowsphere-users', JSON.stringify(users))

    // Clean up
    this.deleteOTPRecord(email)
    this.deletePendingRegistration(email)
  }

  // Storage methods

  private getAllOTPRecords(): OTPRecord[] {
    try {
      const data = localStorage.getItem(this.otpKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      logger.error('Failed to get OTP records from storage', error, 'OTPVerification')
      return []
    }
  }

  private getOTPRecord(email: string): OTPRecord | null {
    const records = this.getAllOTPRecords()
    return records.find(r => r.email.toLowerCase() === email.toLowerCase()) || null
  }

  private saveOTPRecord(record: OTPRecord): void {
    const records = this.getAllOTPRecords()
    const index = records.findIndex(r => r.email.toLowerCase() === record.email.toLowerCase())

    if (index >= 0) {
      records[index] = record
    } else {
      records.push(record)
    }

    localStorage.setItem(this.otpKey, JSON.stringify(records))
  }

  private deleteOTPRecord(email: string): void {
    const records = this.getAllOTPRecords().filter(r => r.email.toLowerCase() !== email.toLowerCase())
    localStorage.setItem(this.otpKey, JSON.stringify(records))
  }

  private getPendingRegistration(email: string): RegistrationData | null {
    try {
      const data = localStorage.getItem(this.registrationKey)
      const registrations = data ? JSON.parse(data) : {}
      return registrations[email.toLowerCase()] || null
    } catch (error) {
      logger.error('Failed to get pending registration', error, 'OTPVerification')
      return null
    }
  }

  private savePendingRegistration(email: string, data: RegistrationData): void {
    const registrations = JSON.parse(localStorage.getItem(this.registrationKey) || '{}')
    registrations[email.toLowerCase()] = data
    localStorage.setItem(this.registrationKey, JSON.stringify(registrations))
  }

  private deletePendingRegistration(email: string): void {
    const registrations = JSON.parse(localStorage.getItem(this.registrationKey) || '{}')
    delete registrations[email.toLowerCase()]
    localStorage.setItem(this.registrationKey, JSON.stringify(registrations))
  }

  /**
   * Get mock emails (for development UI)
   */
  getMockEmails(): Array<{
    to: string
    subject: string
    code: string
    timestamp: string
    expiresAt: string
  }> {
    try {
      return JSON.parse(localStorage.getItem('flowsphere-mock-emails') || '[]')
    } catch (error) {
      logger.error('Failed to get mock emails', error, 'OTPVerification')
      return []
    }
  }
}

/**
 * Auto cleanup service
 */
export class OTPCleanupService {
  private intervalId: NodeJS.Timeout | null = null
  private manager: OTPVerificationManager

  constructor(manager: OTPVerificationManager) {
    this.manager = manager
  }

  /**
   * Start auto cleanup (runs every hour)
   */
  start(): void {
    if (this.intervalId) return

    // Clean up expired OTPs every hour
    this.intervalId = setInterval(() => {
      const cleaned = this.manager.cleanupExpiredOTPs()
      if (cleaned > 0) {
        logger.info('[OTP Cleanup] Removed expired OTP records', { count: cleaned }, 'OTPVerification')
      }
    }, 60 * 60 * 1000) // 1 hour

    // Initial cleanup
    this.manager.cleanupExpiredOTPs()
  }

  /**
   * Stop auto cleanup
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
