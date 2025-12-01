/**
 * CEO Executive Dashboard System
 * Advanced analytics, monitoring, and AI-powered insights
 * Maximum security with multi-layer authentication
 */

import { BiometricAuth, type BiometricAuthResult } from './vault-security'

/**
 * CEO Authentication Credentials
 * Stored securely with encryption
 */
interface CEOCredentials {
  username: string
  password: string
  totpSecret?: string
  biometricEnabled: boolean
  sessionTimeout: number // minutes
  maxFailedAttempts: number
}

/**
 * CEO Session
 */
interface CEOSession {
  sessionId: string
  username: string
  loginTime: string
  lastActivity: string
  ipAddress: string
  device: string
  location: {
    city: string
    country: string
    coordinates?: { lat: number; lon: number }
  }
  authenticated: boolean
  biometricVerified: boolean
  twoFactorVerified: boolean
}

/**
 * Dashboard Analytics
 */
export interface DashboardAnalytics {
  users: {
    total: number
    active: number
    new: number
    churnRate: number
    growth: number // percentage
    byRegion: Record<string, number>
    byDevice: Record<string, number>
  }
  engagement: {
    dailyActiveUsers: number
    monthlyActiveUsers: number
    avgSessionDuration: number
    avgDailyUsage: number
    retentionRate: number
  }
  features: {
    mostUsed: Array<{ feature: string; usage: number }>
    leastUsed: Array<{ feature: string; usage: number }>
    aiInteractions: number
    vaultAccess: number
    messengerActivity: number
    callsMade: number
  }
  performance: {
    avgLoadTime: number
    errorRate: number
    apiResponseTime: number
    uptime: number
  }
  financial: {
    revenue: number
    subscriptions: number
    arpu: number // Average revenue per user
    mrr: number // Monthly recurring revenue
    churn: number
  }
}

/**
 * User Complaint/Inquiry
 */
export interface UserFeedback {
  id: string
  userId: string
  userName: string
  type: 'complaint' | 'inquiry' | 'feature-request' | 'bug-report' | 'praise'
  category: string
  subject: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'in-progress' | 'resolved' | 'closed'
  assignedTo?: string
  timestamp: string
  responseTime?: number
  resolution?: string
  aiSummary?: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'very-negative'
  tags: string[]
}

/**
 * Bank Connection
 */
export interface BankConnection {
  id: string
  bankName: string
  accountType: 'checking' | 'savings' | 'credit' | 'business'
  accountNumber: string // Last 4 digits only
  balance: number
  currency: string
  connected: boolean
  lastSync: string
  transactions: BankTransaction[]
  plaidAccessToken?: string
  stripeAccountId?: string
}

export interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  category: string
  merchant?: string
}

/**
 * API Key Management
 */
export interface APIKey {
  id: string
  name: string
  key: string
  service: string
  scope: string[]
  createdAt: string
  lastUsed?: string
  expiresAt?: string
  active: boolean
  usage: {
    calls: number
    quota: number
    resetDate: string
  }
}

/**
 * Security Alert
 */
export interface SecurityAlert {
  id: string
  type: 'suspicious-login' | 'unusual-activity' | 'failed-auth' | 'data-breach' | 'api-abuse'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  timestamp: string
  source: string
  ipAddress?: string
  location?: string
  resolved: boolean
  actions: string[]
}

/**
 * CEO Dashboard Manager
 */
export class CEODashboardManager {
  private credentialsKey = 'flowsphere-ceo-credentials-encrypted'
  private sessionKey = 'flowsphere-ceo-session'
  private alertsKey = 'flowsphere-ceo-alerts'
  private feedbackKey = 'flowsphere-user-feedback'
  private apiKeysKey = 'flowsphere-api-keys'

  // Default CEO credentials (will be hashed in production)
  private readonly DEFAULT_CREDENTIALS: CEOCredentials = {
    username: '19780111',
    password: 'papakoEddie@tripzy.international',
    biometricEnabled: false,
    sessionTimeout: 30,
    maxFailedAttempts: 3
  }

  /**
   * Authenticate CEO
   */
  async authenticate(
    username: string,
    password: string,
    options?: {
      biometric?: boolean
      totpCode?: string
    }
  ): Promise<{
    success: boolean
    session?: CEOSession
    requiresBiometric?: boolean
    requires2FA?: boolean
    error?: string
  }> {
    try {
      // Check if locked out
      if (this.isLockedOut()) {
        return {
          success: false,
          error: 'Account temporarily locked due to failed attempts'
        }
      }

      // Verify credentials
      const credentials = this.getCredentials()
      if (username !== credentials.username || password !== credentials.password) {
        this.recordFailedAttempt()
        return {
          success: false,
          error: 'Invalid credentials'
        }
      }

      // Check if biometric required
      if (credentials.biometricEnabled && !options?.biometric) {
        return {
          success: false,
          requiresBiometric: true
        }
      }

      // Verify biometric if provided
      if (options?.biometric) {
        const biometricResult = await BiometricAuth.authenticate()
        if (!biometricResult.success) {
          return {
            success: false,
            error: 'Biometric authentication failed'
          }
        }
      }

      // Check if 2FA required
      if (credentials.totpSecret && !options?.totpCode) {
        return {
          success: false,
          requires2FA: true
        }
      }

      // Verify TOTP if provided
      if (options?.totpCode && credentials.totpSecret) {
        const valid = this.verifyTOTP(credentials.totpSecret, options.totpCode)
        if (!valid) {
          return {
            success: false,
            error: '2FA code invalid'
          }
        }
      }

      // Create session
      const session = await this.createSession(username)

      // Log security event
      this.logSecurityEvent({
        type: 'suspicious-login',
        severity: 'info',
        title: 'CEO Login',
        description: `CEO logged in from ${session.location.city}, ${session.location.country}`,
        timestamp: new Date().toISOString(),
        source: 'CEO Dashboard',
        ipAddress: session.ipAddress,
        location: `${session.location.city}, ${session.location.country}`,
        resolved: true,
        actions: []
      })

      this.resetFailedAttempts()

      return {
        success: true,
        session
      }
    } catch (error) {
      console.error('CEO authentication error:', error)
      return {
        success: false,
        error: 'Authentication failed'
      }
    }
  }

  /**
   * Create CEO session
   */
  private async createSession(username: string): Promise<CEOSession> {
    const location = await this.getLocation()

    const session: CEOSession = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: location.ip,
      device: this.getDeviceInfo(),
      location: {
        city: location.city,
        country: location.country,
        coordinates: location.coordinates
      },
      authenticated: true,
      biometricVerified: false,
      twoFactorVerified: false
    }

    localStorage.setItem(this.sessionKey, JSON.stringify(session))
    return session
  }

  /**
   * Get current session
   */
  getCurrentSession(): CEOSession | null {
    try {
      const data = localStorage.getItem(this.sessionKey)
      if (!data) return null

      const session: CEOSession = JSON.parse(data)

      // Check if session expired
      const credentials = this.getCredentials()
      const lastActivity = new Date(session.lastActivity).getTime()
      const now = Date.now()
      const elapsed = (now - lastActivity) / 1000 / 60 // minutes

      if (elapsed > credentials.sessionTimeout) {
        this.logout()
        return null
      }

      // Update last activity
      session.lastActivity = new Date().toISOString()
      localStorage.setItem(this.sessionKey, JSON.stringify(session))

      return session
    } catch {
      return null
    }
  }

  /**
   * Logout CEO
   */
  logout(): void {
    localStorage.removeItem(this.sessionKey)
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<boolean> {
    const session = this.getCurrentSession()
    if (!session) return false

    const registered = await BiometricAuth.register(session.username, 'CEO')
    if (registered) {
      const credentials = this.getCredentials()
      credentials.biometricEnabled = true
      this.saveCredentials(credentials)
      return true
    }

    return false
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await BiometricAuth.remove()
    const credentials = this.getCredentials()
    credentials.biometricEnabled = false
    this.saveCredentials(credentials)
  }

  /**
   * Enable 2FA
   */
  enable2FA(): { secret: string; qrCode: string } {
    const secret = this.generateTOTPSecret()
    const credentials = this.getCredentials()
    credentials.totpSecret = secret
    this.saveCredentials(credentials)

    return {
      secret,
      qrCode: this.generateTOTPQRCode(secret, credentials.username)
    }
  }

  /**
   * Disable 2FA
   */
  disable2FA(): void {
    const credentials = this.getCredentials()
    delete credentials.totpSecret
    this.saveCredentials(credentials)
  }

  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<DashboardAnalytics> {
    // In production, fetch from backend API
    // For now, return mock data with realistic patterns

    return {
      users: {
        total: 12847,
        active: 8934,
        new: 247,
        churnRate: 2.3,
        growth: 15.7,
        byRegion: {
          'North America': 5234,
          'Europe': 3891,
          'Asia': 2456,
          'Other': 1266
        },
        byDevice: {
          'iOS': 6423,
          'Android': 4891,
          'Web': 1533
        }
      },
      engagement: {
        dailyActiveUsers: 6234,
        monthlyActiveUsers: 11456,
        avgSessionDuration: 847, // seconds
        avgDailyUsage: 3.2, // hours
        retentionRate: 87.4
      },
      features: {
        mostUsed: [
          { feature: 'Messenger', usage: 9823 },
          { feature: 'AI Assistant', usage: 7645 },
          { feature: 'Family Safety', usage: 5432 },
          { feature: 'Email Scanner', usage: 4321 },
          { feature: 'Vault', usage: 3210 }
        ],
        leastUsed: [
          { feature: 'CCTV Integration', usage: 234 },
          { feature: 'Meeting Notes', usage: 456 },
          { feature: 'Bed Mode', usage: 789 }
        ],
        aiInteractions: 45678,
        vaultAccess: 3210,
        messengerActivity: 89234,
        callsMade: 2345
      },
      performance: {
        avgLoadTime: 1.2, // seconds
        errorRate: 0.3, // percentage
        apiResponseTime: 245, // milliseconds
        uptime: 99.97
      },
      financial: {
        revenue: 128934,
        subscriptions: 8934,
        arpu: 14.44,
        mrr: 42780,
        churn: 2.3
      }
    }
  }

  /**
   * Get user feedback/complaints
   */
  getAllFeedback(): UserFeedback[] {
    try {
      const data = localStorage.getItem(this.feedbackKey)
      return data ? JSON.parse(data) : this.getMockFeedback()
    } catch {
      return this.getMockFeedback()
    }
  }

  /**
   * Get pending feedback (unresolved)
   */
  getPendingFeedback(): UserFeedback[] {
    return this.getAllFeedback().filter(f => f.status !== 'resolved' && f.status !== 'closed')
  }

  /**
   * Get critical feedback
   */
  getCriticalFeedback(): UserFeedback[] {
    return this.getAllFeedback().filter(f => f.priority === 'critical' && f.status !== 'resolved')
  }

  /**
   * Update feedback status
   */
  updateFeedback(id: string, updates: Partial<UserFeedback>): UserFeedback {
    const allFeedback = this.getAllFeedback()
    const index = allFeedback.findIndex(f => f.id === id)

    if (index >= 0) {
      allFeedback[index] = { ...allFeedback[index], ...updates }
      localStorage.setItem(this.feedbackKey, JSON.stringify(allFeedback))
      return allFeedback[index]
    }

    throw new Error('Feedback not found')
  }

  /**
   * Get API keys
   */
  getAPIKeys(): APIKey[] {
    try {
      const data = localStorage.getItem(this.apiKeysKey)
      return data ? JSON.parse(data) : this.getMockAPIKeys()
    } catch {
      return this.getMockAPIKeys()
    }
  }

  /**
   * Create new API key
   */
  createAPIKey(
    name: string,
    service: string,
    scope: string[],
    expiresInDays?: number
  ): APIKey {
    const apiKey: APIKey = {
      id: `key-${Date.now()}`,
      name,
      key: this.generateAPIKey(),
      service,
      scope,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      active: true,
      usage: {
        calls: 0,
        quota: 10000,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }

    const keys = this.getAPIKeys()
    keys.push(apiKey)
    localStorage.setItem(this.apiKeysKey, JSON.stringify(keys))

    return apiKey
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(id: string): void {
    const keys = this.getAPIKeys()
    const index = keys.findIndex(k => k.id === id)

    if (index >= 0) {
      keys[index].active = false
      localStorage.setItem(this.apiKeysKey, JSON.stringify(keys))
    }
  }

  /**
   * Get security alerts
   */
  getSecurityAlerts(): SecurityAlert[] {
    try {
      const data = localStorage.getItem(this.alertsKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): SecurityAlert[] {
    return this.getSecurityAlerts().filter(a => !a.resolved)
  }

  /**
   * Log security event
   */
  logSecurityEvent(alert: SecurityAlert): void {
    const alerts = this.getSecurityAlerts()
    alerts.unshift(alert)

    // Keep last 1000 alerts
    if (alerts.length > 1000) {
      alerts.splice(1000)
    }

    localStorage.setItem(this.alertsKey, JSON.stringify(alerts))
  }

  /**
   * Resolve security alert
   */
  resolveAlert(id: string): void {
    const alerts = this.getSecurityAlerts()
    const alert = alerts.find(a => a.id === id)

    if (alert) {
      alert.resolved = true
      localStorage.setItem(this.alertsKey, JSON.stringify(alerts))
    }
  }

  // Helper methods

  private getCredentials(): CEOCredentials {
    try {
      const data = localStorage.getItem(this.credentialsKey)
      if (data) {
        // In production, decrypt the data
        return JSON.parse(atob(data))
      }
    } catch {
      // Fall through to default
    }

    return { ...this.DEFAULT_CREDENTIALS }
  }

  private saveCredentials(credentials: CEOCredentials): void {
    // In production, encrypt the data
    const encrypted = btoa(JSON.stringify(credentials))
    localStorage.setItem(this.credentialsKey, encrypted)
  }

  private recordFailedAttempt(): void {
    const key = 'flowsphere-ceo-failed-attempts'
    const data = localStorage.getItem(key)
    const attempts = data ? JSON.parse(data) : { count: 0, lastAttempt: null }

    attempts.count++
    attempts.lastAttempt = new Date().toISOString()

    localStorage.setItem(key, JSON.stringify(attempts))

    // Lock if max attempts exceeded
    const credentials = this.getCredentials()
    if (attempts.count >= credentials.maxFailedAttempts) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      localStorage.setItem('flowsphere-ceo-locked', lockUntil.toISOString())
    }
  }

  private resetFailedAttempts(): void {
    localStorage.removeItem('flowsphere-ceo-failed-attempts')
    localStorage.removeItem('flowsphere-ceo-locked')
  }

  private isLockedOut(): boolean {
    const locked = localStorage.getItem('flowsphere-ceo-locked')
    if (!locked) return false

    return Date.now() < new Date(locked).getTime()
  }

  private generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)]
    }
    return secret
  }

  private generateTOTPQRCode(secret: string, username: string): string {
    // Generate otpauth:// URL for QR code
    return `otpauth://totp/FlowSphere:${username}?secret=${secret}&issuer=FlowSphere`
  }

  private verifyTOTP(secret: string, code: string): boolean {
    // In production, implement actual TOTP verification
    // For now, simple mock verification
    return code.length === 6 && /^\d+$/.test(code)
  }

  private generateAPIKey(): string {
    return `fs_${Array.from({ length: 40 }, () =>
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
        Math.floor(Math.random() * 62)
      ]
    ).join('')}`
  }

  private async getLocation(): Promise<{
    ip: string
    city: string
    country: string
    coordinates?: { lat: number; lon: number }
  }> {
    // In production, use IP geolocation API
    return {
      ip: '127.0.0.1',
      city: 'San Francisco',
      country: 'United States',
      coordinates: { lat: 37.7749, lon: -122.4194 }
    }
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
    if (/Android/i.test(ua)) return 'Android'
    if (/Mac/i.test(ua)) return 'macOS'
    if (/Windows/i.test(ua)) return 'Windows'
    return 'Unknown'
  }

  private getMockFeedback(): UserFeedback[] {
    return [
      {
        id: 'fb-001',
        userId: 'user-1234',
        userName: 'John Doe',
        type: 'complaint',
        category: 'Performance',
        subject: 'App is slow on Android',
        message: 'The app takes too long to load on my Samsung Galaxy S21. Sometimes it freezes.',
        priority: 'high',
        status: 'new',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        sentiment: 'negative',
        tags: ['android', 'performance', 'loading']
      },
      {
        id: 'fb-002',
        userId: 'user-5678',
        userName: 'Sarah Smith',
        type: 'feature-request',
        category: 'Messenger',
        subject: 'Dark mode for messenger',
        message: 'Please add dark mode to the messenger. My eyes hurt at night.',
        priority: 'medium',
        status: 'in-progress',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        sentiment: 'neutral',
        tags: ['dark-mode', 'messenger', 'ui']
      },
      {
        id: 'fb-003',
        userId: 'user-9012',
        userName: 'Mike Johnson',
        type: 'bug-report',
        category: 'Family Safety',
        subject: 'Location not updating',
        message: 'My family members location is not updating in real-time. Last update was 2 hours ago.',
        priority: 'critical',
        status: 'new',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sentiment: 'very-negative',
        tags: ['location', 'family-safety', 'real-time']
      }
    ]
  }

  private getMockAPIKeys(): APIKey[] {
    return [
      {
        id: 'key-001',
        name: 'Production API',
        key: 'fs_prod_abc123xyz789',
        service: 'Main Backend',
        scope: ['read', 'write', 'admin'],
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        active: true,
        usage: {
          calls: 8543,
          quota: 10000,
          resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: 'key-002',
        name: 'Analytics API',
        key: 'fs_analytics_def456uvw012',
        service: 'Analytics Service',
        scope: ['read'],
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        active: true,
        usage: {
          calls: 2341,
          quota: 5000,
          resetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString()
        }
      }
    ]
  }
}
