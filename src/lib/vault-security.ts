/**
 * Advanced Vault Security System
 * Biometric authentication + Hidden access patterns
 */

import { logger } from '@/lib/security-utils'

export interface VaultSecuritySettings {
  biometricEnabled: boolean
  biometricType: 'fingerprint' | 'face' | 'both' | null
  patternEnabled: boolean
  patternType: 'click-count' | 'sequence' | 'gesture' | null
  patternConfig: {
    targetElement: string // e.g., 'family-button', 'footer-secret'
    clickCount: number // 3-9 clicks
    timeWindow: number // milliseconds
    sequence?: string[] // For sequence patterns
  }
  hiddenAccess: {
    enabled: boolean
    location: 'footer' | 'sidebar' | 'header' | 'custom'
    customSelector?: string
    visible: boolean // If false, invisible until triggered
  }
  // PIN is now stored as a hash, not plain text (security fix v2)
  fallbackPIN: string | null // Legacy: plain text (deprecated)
  fallbackPINHash: string | null // New: hashed PIN
  fallbackPINSalt: string | null // Salt for hash verification
  autoLockTimeout: number // minutes, 0 = never
  lastAccess: string
  failedAttempts: number
  maxFailedAttempts: number
  lockoutDuration: number // minutes
}

export interface BiometricAuthResult {
  success: boolean
  method: 'fingerprint' | 'face' | 'pin' | 'pattern' | null
  timestamp: string
  error?: string
}

export interface PatternDetector {
  element: HTMLElement | null
  clicks: number[]
  threshold: number
  active: boolean
}

/**
 * Biometric Authentication Manager
 */
export class BiometricAuth {
  /**
   * Check if biometric authentication is available
   */
  static async isAvailable(): Promise<{
    available: boolean
    types: Array<'fingerprint' | 'face'>
  }> {
    // Check for WebAuthn API support
    if (!window.PublicKeyCredential) {
      return { available: false, types: [] }
    }

    try {
      // Check for platform authenticator (Touch ID, Face ID, Windows Hello)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

      if (available) {
        // Determine which biometric types are available
        const types: Array<'fingerprint' | 'face'> = []

        // Check for Touch ID/Fingerprint (iOS, Android, Windows)
        if (navigator.userAgent.match(/iPhone|iPad|iPod|Android/i)) {
          types.push('fingerprint')
        }

        // Check for Face ID (iPhone X and newer)
        if (navigator.userAgent.match(/iPhone/i)) {
          types.push('face')
        }

        // Windows Hello supports both
        if (navigator.userAgent.match(/Windows/i)) {
          types.push('fingerprint', 'face')
        }

        return { available: true, types }
      }

      return { available: false, types: [] }
    } catch (error) {
      logger.error('Error checking biometric availability:', error)
      return { available: false, types: [] }
    }
  }

  /**
   * Register biometric authentication
   */
  static async register(userId: string, userName: string): Promise<boolean> {
    try {
      // Generate random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Create credentials
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'FlowSphere',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userName,
            displayName: userName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential

      if (credential) {
        // Store credential ID for future authentication
        localStorage.setItem('flowsphere-biometric-credential', credential.id)
        return true
      }

      return false
    } catch (error) {
      logger.error('Error registering biometric:', error)
      return false
    }
  }

  /**
   * Authenticate using biometric
   */
  static async authenticate(): Promise<BiometricAuthResult> {
    try {
      const credentialId = localStorage.getItem('flowsphere-biometric-credential')
      if (!credentialId) {
        return {
          success: false,
          method: null,
          timestamp: new Date().toISOString(),
          error: 'No biometric credentials registered',
        }
      }

      // Generate random challenge
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Request authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
              type: 'public-key',
            },
          ],
          timeout: 60000,
          userVerification: 'required',
        },
      })

      if (credential) {
        // Determine which biometric method was used
        const userAgent = navigator.userAgent
        let method: 'fingerprint' | 'face' = 'fingerprint'

        if (userAgent.match(/iPhone.*OS\s+(1[1-9]|[2-9]\d)/i)) {
          // iPhone X and newer likely use Face ID
          method = 'face'
        }

        return {
          success: true,
          method,
          timestamp: new Date().toISOString(),
        }
      }

      return {
        success: false,
        method: null,
        timestamp: new Date().toISOString(),
        error: 'Authentication failed',
      }
    } catch (error) {
      logger.error('Error during biometric authentication:', error)
      return {
        success: false,
        method: null,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }

  /**
   * Remove biometric authentication
   */
  static async remove(): Promise<void> {
    localStorage.removeItem('flowsphere-biometric-credential')
  }
}

/**
 * Pattern Access Manager
 */
export class PatternAccessManager {
  private detectors: Map<string, PatternDetector> = new Map()

  /**
   * Setup click pattern detector
   */
  setupClickPattern(
    elementId: string,
    requiredClicks: number,
    timeWindow: number,
    onSuccess: () => void
  ): void {
    const element = document.getElementById(elementId)
    if (!element) {
      logger.error(`Element ${elementId} not found`)
      return
    }

    const detector: PatternDetector = {
      element,
      clicks: [],
      threshold: requiredClicks,
      active: true,
    }

    this.detectors.set(elementId, detector)

    // Add click listener
    element.addEventListener('click', event => {
      if (!detector.active) return

      const now = Date.now()
      detector.clicks.push(now)

      // Remove old clicks outside time window
      detector.clicks = detector.clicks.filter(clickTime => now - clickTime < timeWindow)

      // Check if pattern matched
      if (detector.clicks.length >= detector.threshold) {
        detector.clicks = [] // Reset
        onSuccess()
      }
    })
  }

  /**
   * Setup hidden element that appears on pattern
   */
  setupHiddenElement(
    hiddenElementId: string,
    triggerElementId: string,
    requiredClicks: number,
    timeWindow: number
  ): void {
    const hiddenElement = document.getElementById(hiddenElementId)
    const triggerElement = document.getElementById(triggerElementId)

    if (!hiddenElement || !triggerElement) {
      logger.error('Elements not found')
      return
    }

    // Initially hide the element
    hiddenElement.style.visibility = 'hidden'
    hiddenElement.style.opacity = '0'
    hiddenElement.style.transition = 'opacity 0.3s ease'

    // Setup pattern detector
    this.setupClickPattern(triggerElementId, requiredClicks, timeWindow, () => {
      // Show hidden element
      hiddenElement.style.visibility = 'visible'
      hiddenElement.style.opacity = '1'

      // Auto-hide after 30 seconds
      setTimeout(() => {
        hiddenElement.style.opacity = '0'
        setTimeout(() => {
          hiddenElement.style.visibility = 'hidden'
        }, 300)
      }, 30000)
    })
  }

  /**
   * Setup sequence pattern (specific order of elements)
   */
  setupSequencePattern(elementIds: string[], timeWindow: number, onSuccess: () => void): void {
    let currentIndex = 0
    let lastClickTime = 0

    elementIds.forEach((elementId, index) => {
      const element = document.getElementById(elementId)
      if (!element) return

      element.addEventListener('click', () => {
        const now = Date.now()

        // Check if within time window
        if (lastClickTime > 0 && now - lastClickTime > timeWindow) {
          currentIndex = 0 // Reset sequence
        }

        // Check if correct element in sequence
        if (index === currentIndex) {
          currentIndex++
          lastClickTime = now

          // Check if complete sequence
          if (currentIndex >= elementIds.length) {
            currentIndex = 0
            lastClickTime = 0
            onSuccess()
          }
        } else {
          currentIndex = 0 // Wrong element, reset
        }
      })
    })
  }

  /**
   * Disable all pattern detectors
   */
  disableAll(): void {
    this.detectors.forEach(detector => {
      detector.active = false
    })
  }

  /**
   * Enable all pattern detectors
   */
  enableAll(): void {
    this.detectors.forEach(detector => {
      detector.active = true
    })
  }

  /**
   * Remove pattern detector
   */
  remove(elementId: string): void {
    this.detectors.delete(elementId)
  }

  /**
   * Clear all detectors
   */
  clearAll(): void {
    this.detectors.clear()
  }
}

/**
 * Vault Security Manager
 */
export class VaultSecurityManager {
  private settingsKey = 'flowsphere-vault-security'
  private lockKey = 'flowsphere-vault-locked'
  private patternManager: PatternAccessManager

  constructor() {
    this.patternManager = new PatternAccessManager()
  }

  /**
   * Get security settings
   */
  getSettings(): VaultSecuritySettings {
    try {
      const data = localStorage.getItem(this.settingsKey)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      logger.error('Error loading vault security settings:', error)
    }

    // Return defaults
    return this.getDefaultSettings()
  }

  /**
   * Get default security settings
   */
  private getDefaultSettings(): VaultSecuritySettings {
    return {
      biometricEnabled: false,
      biometricType: null,
      patternEnabled: false,
      patternType: null,
      patternConfig: {
        targetElement: 'family-button',
        clickCount: 5,
        timeWindow: 2000, // 2 seconds
      },
      hiddenAccess: {
        enabled: false,
        location: 'footer',
        visible: false,
      },
      fallbackPIN: null, // Legacy (deprecated)
      fallbackPINHash: null,
      fallbackPINSalt: null,
      autoLockTimeout: 15,
      lastAccess: new Date().toISOString(),
      failedAttempts: 0,
      maxFailedAttempts: 5,
      lockoutDuration: 30,
    }
  }

  /**
   * Save security settings
   */
  saveSettings(settings: VaultSecuritySettings): void {
    localStorage.setItem(this.settingsKey, JSON.stringify(settings))
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(userId: string, userName: string): Promise<boolean> {
    const available = await BiometricAuth.isAvailable()
    if (!available.available) {
      return false
    }

    const registered = await BiometricAuth.register(userId, userName)
    if (registered) {
      const settings = this.getSettings()
      settings.biometricEnabled = true
      settings.biometricType = available.types.length > 1 ? 'both' : available.types[0]
      this.saveSettings(settings)
      return true
    }

    return false
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await BiometricAuth.remove()
    const settings = this.getSettings()
    settings.biometricEnabled = false
    settings.biometricType = null
    this.saveSettings(settings)
  }

  /**
   * Enable pattern access
   */
  enablePattern(
    patternType: 'click-count' | 'sequence',
    config: VaultSecuritySettings['patternConfig'],
    onSuccess: () => void
  ): void {
    const settings = this.getSettings()
    settings.patternEnabled = true
    settings.patternType = patternType
    settings.patternConfig = config
    this.saveSettings(settings)

    // Setup pattern detector
    if (patternType === 'click-count') {
      this.patternManager.setupClickPattern(
        config.targetElement,
        config.clickCount,
        config.timeWindow,
        onSuccess
      )
    } else if (patternType === 'sequence' && config.sequence) {
      this.patternManager.setupSequencePattern(config.sequence, config.timeWindow, onSuccess)
    }
  }

  /**
   * Disable pattern access
   */
  disablePattern(): void {
    const settings = this.getSettings()
    settings.patternEnabled = false
    settings.patternType = null
    this.saveSettings(settings)

    this.patternManager.disableAll()
  }

  /**
   * Setup hidden vault access
   */
  setupHiddenAccess(
    hiddenElementId: string,
    triggerElementId: string,
    clickCount: number,
    timeWindow: number
  ): void {
    const settings = this.getSettings()
    settings.hiddenAccess.enabled = true
    this.saveSettings(settings)

    this.patternManager.setupHiddenElement(
      hiddenElementId,
      triggerElementId,
      clickCount,
      timeWindow
    )
  }

  /**
   * Authenticate with any available method
   */
  async authenticate(): Promise<BiometricAuthResult> {
    const settings = this.getSettings()

    // Check if locked out
    if (this.isLockedOut()) {
      return {
        success: false,
        method: null,
        timestamp: new Date().toISOString(),
        error: 'Too many failed attempts. Try again later.',
      }
    }

    // Try biometric first
    if (settings.biometricEnabled) {
      const result = await BiometricAuth.authenticate()

      if (result.success) {
        this.onSuccessfulAuth()
        return result
      } else {
        this.onFailedAuth()
      }
    }

    return {
      success: false,
      method: null,
      timestamp: new Date().toISOString(),
      error: 'Authentication required',
    }
  }

  /**
   * Authenticate with PIN (async for secure hash verification)
   */
  async authenticateWithPIN(pin: string): Promise<BiometricAuthResult> {
    const settings = this.getSettings()

    if (this.isLockedOut()) {
      return {
        success: false,
        method: null,
        timestamp: new Date().toISOString(),
        error: 'Too many failed attempts. Try again later.',
      }
    }

    // Check new hashed PIN first
    if (settings.fallbackPINHash && settings.fallbackPINSalt) {
      const isValid = await this.verifyPINSecure(
        pin,
        settings.fallbackPINHash,
        settings.fallbackPINSalt
      )
      if (isValid) {
        this.onSuccessfulAuth()
        return {
          success: true,
          method: 'pin',
          timestamp: new Date().toISOString(),
        }
      }
    }

    // Legacy: check plain text PIN (for backward compatibility, will migrate on success)
    if (settings.fallbackPIN && settings.fallbackPIN === pin) {
      // Migrate to hashed PIN
      await this.setFallbackPIN(pin)
      this.onSuccessfulAuth()
      return {
        success: true,
        method: 'pin',
        timestamp: new Date().toISOString(),
      }
    }

    this.onFailedAuth()
    return {
      success: false,
      method: 'pin',
      timestamp: new Date().toISOString(),
      error: 'Incorrect PIN',
    }
  }

  /**
   * Verify PIN using secure hash comparison (timing-safe)
   */
  private async verifyPINSecure(pin: string, storedHash: string, salt: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
      )

      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)),
          iterations: 310000, // OWASP 2023 recommendation
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      )

      const computedHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

      // Timing-safe comparison
      if (computedHash.length !== storedHash.length) return false
      let result = 0
      for (let i = 0; i < computedHash.length; i++) {
        result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i)
      }
      return result === 0
    } catch (error) {
      logger.debug('PIN verification failed', error)
      return false
    }
  }

  /**
   * Set/Update fallback PIN (stores hash, not plain text)
   */
  async setFallbackPIN(pin: string): Promise<void> {
    const settings = this.getSettings()

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const saltBase64 = btoa(String.fromCharCode(...salt))

    // Hash the PIN
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
      'deriveBits',
    ])

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 310000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    )

    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))

    // Store hash and salt, remove plain text
    settings.fallbackPINHash = hashBase64
    settings.fallbackPINSalt = saltBase64
    settings.fallbackPIN = null // Remove legacy plain text
    this.saveSettings(settings)
  }

  /**
   * Check if vault should auto-lock
   */
  shouldAutoLock(): boolean {
    const settings = this.getSettings()
    if (settings.autoLockTimeout === 0) return false

    const lastAccess = new Date(settings.lastAccess).getTime()
    const now = Date.now()
    const elapsed = (now - lastAccess) / 1000 / 60 // minutes

    return elapsed >= settings.autoLockTimeout
  }

  /**
   * Update last access time
   */
  updateLastAccess(): void {
    const settings = this.getSettings()
    settings.lastAccess = new Date().toISOString()
    this.saveSettings(settings)
  }

  /**
   * Check if locked out due to failed attempts
   */
  isLockedOut(): boolean {
    const lockData = localStorage.getItem(this.lockKey)
    if (!lockData) return false

    const { until } = JSON.parse(lockData)
    return Date.now() < new Date(until).getTime()
  }

  /**
   * Handle successful authentication
   */
  private onSuccessfulAuth(): void {
    const settings = this.getSettings()
    settings.failedAttempts = 0
    settings.lastAccess = new Date().toISOString()
    this.saveSettings(settings)

    localStorage.removeItem(this.lockKey)
  }

  /**
   * Handle failed authentication
   */
  private onFailedAuth(): void {
    const settings = this.getSettings()
    settings.failedAttempts++
    this.saveSettings(settings)

    // Lock if max attempts exceeded
    if (settings.failedAttempts >= settings.maxFailedAttempts) {
      const lockUntil = new Date(Date.now() + settings.lockoutDuration * 60 * 1000)
      localStorage.setItem(
        this.lockKey,
        JSON.stringify({
          until: lockUntil.toISOString(),
        })
      )
    }
  }

  /**
   * Get remaining failed attempts
   */
  getRemainingAttempts(): number {
    const settings = this.getSettings()
    return Math.max(0, settings.maxFailedAttempts - settings.failedAttempts)
  }

  /**
   * Reset failed attempts (admin only)
   */
  resetFailedAttempts(): void {
    const settings = this.getSettings()
    settings.failedAttempts = 0
    this.saveSettings(settings)
    localStorage.removeItem(this.lockKey)
  }
}
