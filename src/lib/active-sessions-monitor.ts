/**
 * Active Sessions Monitor
 * Tracks all login attempts (successful and failed) with face capture integration
 * Monitors social media accounts and suspicious activities
 */

import {
  FaceCaptureSecurityManager,
  CapturedFace,
  SuspiciousActivityDetector,
} from './face-capture-security'
import { logger } from '@/lib/security-utils'

export interface LoginSession {
  id: string
  timestamp: string
  type: 'successful' | 'failed' | 'first-time'
  user: {
    email?: string
    username?: string
    name?: string
  }
  device: {
    browser: string
    os: string
    platform: string
    screenResolution: string
    userAgent: string
  }
  location?: {
    lat: number
    lon: number
    city?: string
    country?: string
    ipAddress?: string
  }
  capturedFaceId?: string // Reference to captured face photo
  suspicious: boolean
  suspicionReasons: string[]
  acknowledged: boolean
  notes?: string
}

export interface SocialMediaAccount {
  id: string
  platform: 'facebook' | 'google' | 'instagram' | 'twitter' | 'linkedin' | 'other'
  username?: string
  email?: string
  lastKnownActivity?: string
  monitoringEnabled: boolean
  alerts: SocialMediaAlert[]
}

export interface SocialMediaAlert {
  id: string
  accountId: string
  platform: string
  type:
    | 'first-time-login'
    | 'suspicious-login'
    | 'password-change'
    | 'new-device'
    | 'unusual-location'
  timestamp: string
  details: string
  location?: {
    city?: string
    country?: string
    ipAddress?: string
  }
  capturedFaceId?: string
  acknowledged: boolean
}

/**
 * Active Sessions Monitor Manager
 */
export class ActiveSessionsMonitor {
  private sessionsKey = 'flowsphere-active-sessions'
  private socialAccountsKey = 'flowsphere-social-accounts'
  private faceCapture: FaceCaptureSecurityManager
  private suspiciousDetector: SuspiciousActivityDetector

  constructor() {
    this.faceCapture = new FaceCaptureSecurityManager()
    this.suspiciousDetector = new SuspiciousActivityDetector()
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(
    email: string,
    username?: string,
    name?: string
  ): Promise<LoginSession> {
    // Check if this is first-time login
    const isFirstTime = this.isFirstTimeLogin(email)

    // Capture face silently (for first-time logins)
    let capturedFaceId: string | undefined
    if (isFirstTime) {
      const face = await this.faceCapture.captureOnFirstTimeLogin(email, {
        username,
        ipAddress: await this.getIPAddress(),
        location: await this.getLocation(),
      })
      capturedFaceId = face?.id
    }

    // Record attempt in suspicious detector
    this.suspiciousDetector.recordAttempt(email, true, await this.getIPAddress())

    // Create session record
    const session: LoginSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: isFirstTime ? 'first-time' : 'successful',
      user: { email, username, name },
      device: this.getDeviceInfo(),
      location: await this.getLocationWithIP(),
      capturedFaceId,
      suspicious: false,
      suspicionReasons: [],
      acknowledged: false,
    }

    // Save session
    this.saveSession(session)

    return session
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(email: string, reason?: string): Promise<LoginSession> {
    // Capture face silently on failed login
    const face = await this.faceCapture.captureOnFailedLogin(email, {
      username: email,
      ipAddress: await this.getIPAddress(),
      location: await this.getLocation(),
    })

    // Record attempt in suspicious detector
    const ipAddress = await this.getIPAddress()
    this.suspiciousDetector.recordAttempt(email, false, ipAddress)

    // Check if suspicious
    const isSuspicious = this.suspiciousDetector.isSuspicious(email)
    const suspicionReasons: string[] = []

    if (isSuspicious) {
      suspicionReasons.push('Multiple failed login attempts')
    }

    // Check for other suspicious patterns
    const otherReasons = this.detectSuspiciousPatterns(email, ipAddress)
    suspicionReasons.push(...otherReasons)

    // Create session record
    const session: LoginSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'failed',
      user: { email },
      device: this.getDeviceInfo(),
      location: await this.getLocationWithIP(),
      capturedFaceId: face?.id,
      suspicious: isSuspicious || suspicionReasons.length > 0,
      suspicionReasons,
      acknowledged: false,
      notes: reason,
    }

    // Save session
    this.saveSession(session)

    // If highly suspicious, capture additional photo
    if (suspicionReasons.length >= 2) {
      await this.faceCapture.captureOnSuspiciousActivity(
        `Multiple suspicious indicators: ${suspicionReasons.join(', ')}`,
        {
          email,
          ipAddress,
          location: await this.getLocation(),
        }
      )
    }

    return session
  }

  /**
   * Get all sessions
   */
  getAllSessions(): LoginSession[] {
    try {
      const stored = localStorage.getItem(this.sessionsKey)
      if (!stored) return []

      const sessions: LoginSession[] = JSON.parse(stored)

      // Clean up old sessions (keep last 90 days)
      const retentionMs = 90 * 24 * 60 * 60 * 1000
      const now = Date.now()

      const validSessions = sessions.filter(session => {
        const sessionTime = new Date(session.timestamp).getTime()
        return now - sessionTime < retentionMs
      })

      // Save cleaned list if any were removed
      if (validSessions.length !== sessions.length) {
        localStorage.setItem(this.sessionsKey, JSON.stringify(validSessions))
      }

      return validSessions
    } catch (error) {
      logger.error('Failed to get sessions from storage', error, 'ActiveSessionsMonitor')
      return []
    }
  }

  /**
   * Get sessions by type
   */
  getSessionsByType(type: 'successful' | 'failed' | 'first-time'): LoginSession[] {
    return this.getAllSessions().filter(s => s.type === type)
  }

  /**
   * Get suspicious sessions
   */
  getSuspiciousSessions(): LoginSession[] {
    return this.getAllSessions().filter(s => s.suspicious)
  }

  /**
   * Get unacknowledged sessions
   */
  getUnacknowledgedSessions(): LoginSession[] {
    return this.getAllSessions().filter(s => !s.acknowledged)
  }

  /**
   * Get sessions for specific user
   */
  getSessionsForUser(email: string): LoginSession[] {
    return this.getAllSessions().filter(s => s.user.email === email)
  }

  /**
   * Acknowledge a session
   */
  acknowledgeSession(sessionId: string, notes?: string): void {
    const sessions = this.getAllSessions()
    const session = sessions.find(s => s.id === sessionId)

    if (session) {
      session.acknowledged = true
      if (notes) session.notes = notes
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessions))
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const sessions = this.getAllSessions()
    const filtered = sessions.filter(s => s.id !== sessionId)
    localStorage.setItem(this.sessionsKey, JSON.stringify(filtered))
  }

  /**
   * Get session statistics
   */
  getStatistics(days: number = 7): {
    total: number
    successful: number
    failed: number
    firstTime: number
    suspicious: number
    unacknowledged: number
    uniqueUsers: number
    uniqueIPs: number
    topFailedEmails: Array<{ email: string; count: number }>
  } {
    const sessions = this.getAllSessions()
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const recent = sessions.filter(s => new Date(s.timestamp).getTime() > cutoff)

    // Count unique users and IPs
    const uniqueUsers = new Set(recent.map(s => s.user.email).filter(Boolean)).size
    const uniqueIPs = new Set(recent.map(s => s.location?.ipAddress).filter(Boolean)).size

    // Top failed emails
    const failedAttempts = recent.filter(s => s.type === 'failed')
    const emailCounts = new Map<string, number>()
    failedAttempts.forEach(s => {
      if (s.user.email) {
        emailCounts.set(s.user.email, (emailCounts.get(s.user.email) || 0) + 1)
      }
    })

    const topFailedEmails = Array.from(emailCounts.entries())
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      total: recent.length,
      successful: recent.filter(s => s.type === 'successful').length,
      failed: recent.filter(s => s.type === 'failed').length,
      firstTime: recent.filter(s => s.type === 'first-time').length,
      suspicious: recent.filter(s => s.suspicious).length,
      unacknowledged: recent.filter(s => !s.acknowledged).length,
      uniqueUsers,
      uniqueIPs,
      topFailedEmails,
    }
  }

  // Social Media Monitoring

  /**
   * Add social media account for monitoring
   */
  addSocialMediaAccount(
    platform: SocialMediaAccount['platform'],
    username?: string,
    email?: string
  ): SocialMediaAccount {
    const account: SocialMediaAccount = {
      id: `social-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform,
      username,
      email,
      monitoringEnabled: true,
      alerts: [],
    }

    const accounts = this.getAllSocialAccounts()
    accounts.push(account)
    localStorage.setItem(this.socialAccountsKey, JSON.stringify(accounts))

    return account
  }

  /**
   * Get all social media accounts
   */
  getAllSocialAccounts(): SocialMediaAccount[] {
    try {
      const stored = localStorage.getItem(this.socialAccountsKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      logger.error('Failed to get social accounts from storage', error, 'ActiveSessionsMonitor')
      return []
    }
  }

  /**
   * Update social media account
   */
  updateSocialAccount(accountId: string, updates: Partial<SocialMediaAccount>): void {
    const accounts = this.getAllSocialAccounts()
    const account = accounts.find(a => a.id === accountId)

    if (account) {
      Object.assign(account, updates)
      localStorage.setItem(this.socialAccountsKey, JSON.stringify(accounts))
    }
  }

  /**
   * Record social media alert
   */
  async recordSocialMediaAlert(
    accountId: string,
    type: SocialMediaAlert['type'],
    details: string,
    location?: SocialMediaAlert['location']
  ): Promise<void> {
    const accounts = this.getAllSocialAccounts()
    const account = accounts.find(a => a.id === accountId)

    if (!account) return

    // Capture face if suspicious
    let capturedFaceId: string | undefined
    if (type === 'suspicious-login' || type === 'first-time-login') {
      const face = await this.faceCapture.captureOnSuspiciousActivity(
        `Social media ${type} on ${account.platform}`,
        {
          username: account.username,
          email: account.email,
          ipAddress: location?.ipAddress,
          location: location
            ? {
                lat: 0,
                lon: 0,
                city: location.city,
                country: location.country,
              }
            : undefined,
        }
      )
      capturedFaceId = face?.id
    }

    const alert: SocialMediaAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accountId,
      platform: account.platform,
      type,
      timestamp: new Date().toISOString(),
      details,
      location,
      capturedFaceId,
      acknowledged: false,
    }

    account.alerts.push(alert)
    account.lastKnownActivity = new Date().toISOString()

    localStorage.setItem(this.socialAccountsKey, JSON.stringify(accounts))
  }

  /**
   * Get all social media alerts
   */
  getAllSocialAlerts(): SocialMediaAlert[] {
    const accounts = this.getAllSocialAccounts()
    return accounts.flatMap(account => account.alerts)
  }

  /**
   * Get unacknowledged social media alerts
   */
  getUnacknowledgedSocialAlerts(): SocialMediaAlert[] {
    return this.getAllSocialAlerts().filter(alert => !alert.acknowledged)
  }

  /**
   * Acknowledge social media alert
   */
  acknowledgeSocialAlert(alertId: string): void {
    const accounts = this.getAllSocialAccounts()

    for (const account of accounts) {
      const alert = account.alerts.find(a => a.id === alertId)
      if (alert) {
        alert.acknowledged = true
        localStorage.setItem(this.socialAccountsKey, JSON.stringify(accounts))
        break
      }
    }
  }

  // Private helper methods

  /**
   * Check if first-time login
   */
  private isFirstTimeLogin(email: string): boolean {
    const sessions = this.getAllSessions()
    const userSessions = sessions.filter(
      s => s.user.email === email && (s.type === 'successful' || s.type === 'first-time')
    )
    return userSessions.length === 0
  }

  /**
   * Save session to storage
   */
  private saveSession(session: LoginSession): void {
    try {
      const sessions = this.getAllSessions()
      sessions.push(session)
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): LoginSession['device'] {
    const userAgent = navigator.userAgent

    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    let os = 'Unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    return {
      browser,
      os,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      userAgent,
    }
  }

  /**
   * Get IP address
   */
  private async getIPAddress(): Promise<string | undefined> {
    try {
      // In production, call backend API to get IP
      return undefined
    } catch (error) {
      logger.debug('Failed to get IP address', error)
      return undefined
    }
  }

  /**
   * Get location
   */
  private async getLocation(): Promise<{ lat: number; lon: number } | undefined> {
    try {
      const permission = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      })

      if (permission.state === 'granted') {
        return new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            position => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              })
            },
            () => resolve(undefined),
            { timeout: 5000 }
          )
        })
      }

      return undefined
    } catch (error) {
      logger.debug('Failed to get geolocation', error)
      return undefined
    }
  }

  /**
   * Get location with IP address
   */
  private async getLocationWithIP(): Promise<LoginSession['location']> {
    const location = await this.getLocation()
    const ipAddress = await this.getIPAddress()

    if (!location && !ipAddress) return undefined

    return {
      lat: location?.lat || 0,
      lon: location?.lon || 0,
      ipAddress,
    }
  }

  /**
   * Detect suspicious patterns
   */
  private detectSuspiciousPatterns(email: string, ipAddress?: string): string[] {
    const reasons: string[] = []
    const sessions = this.getAllSessions()
    const now = Date.now()

    // Recent failed attempts (last hour)
    const recentFailed = sessions.filter(
      s =>
        s.user.email === email &&
        s.type === 'failed' &&
        now - new Date(s.timestamp).getTime() < 60 * 60 * 1000
    )

    if (recentFailed.length >= 3) {
      reasons.push('Multiple recent failed attempts')
    }

    // Check for IP changes
    if (ipAddress) {
      const userSessions = sessions.filter(s => s.user.email === email)
      const recentSuccessful = userSessions
        .filter(s => s.type === 'successful')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)

      const knownIPs = new Set(recentSuccessful.map(s => s.location?.ipAddress).filter(Boolean))

      if (knownIPs.size > 0 && !knownIPs.has(ipAddress)) {
        reasons.push('Login from unknown IP address')
      }
    }

    // Check for unusual time
    const hour = new Date().getHours()
    if (hour >= 2 && hour <= 5) {
      reasons.push('Login at unusual time (2-5 AM)')
    }

    return reasons
  }
}

/**
 * Initialize active sessions monitoring
 */
export function initializeActiveSessionsMonitor(): ActiveSessionsMonitor {
  return new ActiveSessionsMonitor()
}
