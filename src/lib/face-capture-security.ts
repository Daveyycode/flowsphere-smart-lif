/**
 * Face Capture Security System
 * Silent photo capture on failed/first-time login attempts
 * NO SOUNDS, VIBRATIONS, OR ALERTS
 */

export interface CapturedFace {
  id: string
  timestamp: string
  imageData: string // Base64 encoded image
  attempt: {
    type: 'failed' | 'first-time' | 'suspicious'
    email?: string
    username?: string
    ipAddress?: string
    userAgent?: string
    location?: {
      lat: number
      lon: number
      city?: string
      country?: string
    }
  }
  deviceInfo: {
    platform: string
    browser: string
    os: string
    screenResolution: string
  }
  acknowledged: boolean
}

export interface SecuritySettings {
  enableFaceCapture: boolean
  captureOnFailedLogin: boolean
  captureOnFirstTimeLogin: boolean
  captureOnSuspiciousActivity: boolean
  retentionDays: number // How long to keep photos
  notifyCEO: boolean
}

/**
 * Face Capture Security Manager
 * Captures photos silently without any user feedback
 */
export class FaceCaptureSecurityManager {
  private storageKey = 'flowsphere-captured-faces'
  private settingsKey = 'flowsphere-face-capture-settings'
  private firstLoginKey = 'flowsphere-first-logins'

  constructor() {
    this.initializeSettings()
  }

  /**
   * Initialize default settings
   */
  private initializeSettings(): void {
    const existing = this.getSettings()
    if (!existing) {
      const defaultSettings: SecuritySettings = {
        enableFaceCapture: true,
        captureOnFailedLogin: true,
        captureOnFirstTimeLogin: true,
        captureOnSuspiciousActivity: true,
        retentionDays: 90,
        notifyCEO: true
      }
      this.saveSettings(defaultSettings)
    }
  }

  /**
   * Get current security settings
   */
  getSettings(): SecuritySettings | null {
    try {
      const settings = localStorage.getItem(this.settingsKey)
      return settings ? JSON.parse(settings) : null
    } catch {
      return null
    }
  }

  /**
   * Update security settings
   */
  saveSettings(settings: SecuritySettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings))
  }

  /**
   * Capture face on failed login attempt
   * COMPLETELY SILENT - no sounds, vibrations, or alerts
   */
  async captureOnFailedLogin(
    email: string,
    attemptDetails?: Partial<CapturedFace['attempt']>
  ): Promise<CapturedFace | null> {
    const settings = this.getSettings()
    if (!settings?.enableFaceCapture || !settings?.captureOnFailedLogin) {
      return null
    }

    return await this.silentCapture({
      type: 'failed',
      email,
      ...attemptDetails
    })
  }

  /**
   * Capture face on first-time login
   * COMPLETELY SILENT - no sounds, vibrations, or alerts
   */
  async captureOnFirstTimeLogin(
    email: string,
    attemptDetails?: Partial<CapturedFace['attempt']>
  ): Promise<CapturedFace | null> {
    const settings = this.getSettings()
    if (!settings?.enableFaceCapture || !settings?.captureOnFirstTimeLogin) {
      return null
    }

    // Check if this is truly first time
    if (!this.isFirstTimeLogin(email)) {
      return null
    }

    return await this.silentCapture({
      type: 'first-time',
      email,
      ...attemptDetails
    })
  }

  /**
   * Capture face on suspicious activity
   * COMPLETELY SILENT - no sounds, vibrations, or alerts
   */
  async captureOnSuspiciousActivity(
    reason: string,
    attemptDetails?: Partial<CapturedFace['attempt']>
  ): Promise<CapturedFace | null> {
    const settings = this.getSettings()
    if (!settings?.enableFaceCapture || !settings?.captureOnSuspiciousActivity) {
      return null
    }

    return await this.silentCapture({
      type: 'suspicious',
      ...attemptDetails
    })
  }

  /**
   * CORE METHOD: Silent photo capture
   * Absolutely no user feedback - no sounds, no vibrations, no alerts
   */
  private async silentCapture(
    attemptDetails: CapturedFace['attempt']
  ): Promise<CapturedFace | null> {
    try {
      // Request camera access with absolutely no UI feedback
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false // No audio
      })

      // Create video element (hidden, not attached to DOM)
      const video = document.createElement('video')
      video.srcObject = stream
      video.style.display = 'none' // Hidden
      video.muted = true // No sound
      video.playsInline = true // No fullscreen

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve())
        }
      })

      // Wait a moment for camera to adjust
      await new Promise(resolve => setTimeout(resolve, 500))

      // Capture frame to canvas (also hidden)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Canvas context unavailable')
      }

      ctx.drawImage(video, 0, 0)

      // Convert to base64 image (JPEG for smaller size)
      const imageData = canvas.toDataURL('image/jpeg', 0.8)

      // Stop camera immediately
      stream.getTracks().forEach(track => track.stop())

      // Get location silently (if available)
      const location = await this.getSilentLocation()

      // Get device info
      const deviceInfo = this.getDeviceInfo()

      // Get IP address (if available)
      const ipAddress = await this.getIPAddress()

      // Create captured face record
      const capturedFace: CapturedFace = {
        id: `face-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        imageData,
        attempt: {
          ...attemptDetails,
          ipAddress,
          userAgent: navigator.userAgent,
          location
        },
        deviceInfo,
        acknowledged: false
      }

      // Save to storage
      this.saveCapturedFace(capturedFace)

      // Mark as first login if applicable
      if (attemptDetails.type === 'first-time' && attemptDetails.email) {
        this.markFirstLogin(attemptDetails.email)
      }

      // Notify CEO if enabled (silently - backend notification only)
      const settings = this.getSettings()
      if (settings?.notifyCEO) {
        this.notifyCEOSilently(capturedFace)
      }

      return capturedFace

    } catch (error) {
      console.error('Silent capture failed:', error)
      // Fail silently - no user notification
      return null
    }
  }

  /**
   * Get all captured faces
   */
  getAllCapturedFaces(): CapturedFace[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return []

      const faces: CapturedFace[] = JSON.parse(stored)

      // Clean up expired photos based on retention days
      const settings = this.getSettings()
      const retentionMs = (settings?.retentionDays || 90) * 24 * 60 * 60 * 1000
      const now = Date.now()

      const validFaces = faces.filter(face => {
        const captureTime = new Date(face.timestamp).getTime()
        return now - captureTime < retentionMs
      })

      // Save cleaned list if any were removed
      if (validFaces.length !== faces.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(validFaces))
      }

      return validFaces

    } catch {
      return []
    }
  }

  /**
   * Get captured faces by type
   */
  getCapturedFacesByType(type: 'failed' | 'first-time' | 'suspicious'): CapturedFace[] {
    return this.getAllCapturedFaces().filter(face => face.attempt.type === type)
  }

  /**
   * Get unacknowledged captured faces
   */
  getUnacknowledgedFaces(): CapturedFace[] {
    return this.getAllCapturedFaces().filter(face => !face.acknowledged)
  }

  /**
   * Acknowledge a captured face (CEO has reviewed it)
   */
  acknowledgeFace(faceId: string): void {
    const faces = this.getAllCapturedFaces()
    const face = faces.find(f => f.id === faceId)

    if (face) {
      face.acknowledged = true
      localStorage.setItem(this.storageKey, JSON.stringify(faces))
    }
  }

  /**
   * Delete a captured face
   */
  deleteCapturedFace(faceId: string): void {
    const faces = this.getAllCapturedFaces()
    const filtered = faces.filter(f => f.id !== faceId)
    localStorage.setItem(this.storageKey, JSON.stringify(filtered))
  }

  /**
   * Delete all captured faces
   */
  deleteAllCapturedFaces(): void {
    localStorage.removeItem(this.storageKey)
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number
    failed: number
    firstTime: number
    suspicious: number
    unacknowledged: number
    last24Hours: number
  } {
    const faces = this.getAllCapturedFaces()
    const now = Date.now()
    const last24h = now - (24 * 60 * 60 * 1000)

    return {
      total: faces.length,
      failed: faces.filter(f => f.attempt.type === 'failed').length,
      firstTime: faces.filter(f => f.attempt.type === 'first-time').length,
      suspicious: faces.filter(f => f.attempt.type === 'suspicious').length,
      unacknowledged: faces.filter(f => !f.acknowledged).length,
      last24Hours: faces.filter(f => new Date(f.timestamp).getTime() > last24h).length
    }
  }

  // Private helper methods

  /**
   * Check if this is first time login for email
   */
  private isFirstTimeLogin(email: string): boolean {
    try {
      const firstLogins = localStorage.getItem(this.firstLoginKey)
      if (!firstLogins) return true

      const logins: string[] = JSON.parse(firstLogins)
      return !logins.includes(email)
    } catch {
      return true
    }
  }

  /**
   * Mark email as having logged in
   */
  private markFirstLogin(email: string): void {
    try {
      const firstLogins = localStorage.getItem(this.firstLoginKey)
      const logins: string[] = firstLogins ? JSON.parse(firstLogins) : []

      if (!logins.includes(email)) {
        logins.push(email)
        localStorage.setItem(this.firstLoginKey, JSON.stringify(logins))
      }
    } catch {
      // Fail silently
    }
  }

  /**
   * Save captured face to storage
   */
  private saveCapturedFace(face: CapturedFace): void {
    try {
      const faces = this.getAllCapturedFaces()
      faces.push(face)
      localStorage.setItem(this.storageKey, JSON.stringify(faces))
    } catch (error) {
      console.error('Failed to save captured face:', error)
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): CapturedFace['deviceInfo'] {
    const userAgent = navigator.userAgent

    // Detect browser
    let browser = 'Unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    // Detect OS
    let os = 'Unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    return {
      platform: navigator.platform,
      browser,
      os,
      screenResolution: `${screen.width}x${screen.height}`
    }
  }

  /**
   * Get IP address silently
   */
  private async getIPAddress(): Promise<string | undefined> {
    try {
      // In production, use a service like ipapi.co or ipify
      // For now, return undefined (would be set by backend)
      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * Get location silently (no permission prompt if already denied)
   */
  private async getSilentLocation(): Promise<CapturedFace['attempt']['location']> {
    try {
      // Check if permission is already granted
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })

      if (permission.state === 'granted') {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude
              })
            },
            () => resolve(undefined),
            { timeout: 5000 }
          )
        })
      }

      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * Notify CEO silently (backend notification, no user feedback)
   */
  private notifyCEOSilently(face: CapturedFace): void {
    // In production, this would send a backend notification to CEO
    // For now, just log it (CEO will see in dashboard)
    console.log('[SECURITY] Face captured:', {
      type: face.attempt.type,
      timestamp: face.timestamp,
      email: face.attempt.email
    })

    // Could also send email to CEO
    // this.sendCEOEmail(face)
  }
}

/**
 * Initialize face capture security
 * Call this on app initialization
 */
export function initializeFaceCaptureSecurity(): FaceCaptureSecurityManager {
  return new FaceCaptureSecurityManager()
}

/**
 * Detect suspicious login patterns
 */
export class SuspiciousActivityDetector {
  private attemptsKey = 'flowsphere-login-attempts'
  private suspiciousThreshold = 3 // Failed attempts before considering suspicious
  private timeWindow = 15 * 60 * 1000 // 15 minutes

  /**
   * Record a login attempt
   */
  recordAttempt(email: string, success: boolean, ipAddress?: string): void {
    try {
      const attempts = this.getAttempts()

      attempts.push({
        email,
        success,
        timestamp: Date.now(),
        ipAddress
      })

      // Keep only recent attempts (last 24 hours)
      const yesterday = Date.now() - (24 * 60 * 60 * 1000)
      const recent = attempts.filter(a => a.timestamp > yesterday)

      localStorage.setItem(this.attemptsKey, JSON.stringify(recent))
    } catch {
      // Fail silently
    }
  }

  /**
   * Check if current activity is suspicious
   */
  isSuspicious(email: string): boolean {
    const attempts = this.getAttempts()
    const now = Date.now()
    const recentWindow = now - this.timeWindow

    // Get recent failed attempts for this email
    const recentFailed = attempts.filter(a =>
      a.email === email &&
      !a.success &&
      a.timestamp > recentWindow
    )

    return recentFailed.length >= this.suspiciousThreshold
  }

  /**
   * Get all attempts
   */
  private getAttempts(): Array<{
    email: string
    success: boolean
    timestamp: number
    ipAddress?: string
  }> {
    try {
      const stored = localStorage.getItem(this.attemptsKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Clear all attempts
   */
  clearAttempts(): void {
    localStorage.removeItem(this.attemptsKey)
  }
}
