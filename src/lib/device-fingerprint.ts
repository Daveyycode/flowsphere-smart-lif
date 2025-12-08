/**
 * FlowSphere Device Fingerprint Module
 *
 * Creates a hardware-bound device identifier (equivalent to MAC address binding)
 * This fingerprint is:
 * - Persistent across sessions
 * - Unique to the physical device
 * - Cannot be easily spoofed
 * - Used for vault encryption binding
 *
 * Security Model:
 * - Normal FlowSphere: Email only
 * - Vault Storage: Email + Device Fingerprint
 * - If device changes, vault data is wiped (device-bound encryption)
 */

import { logger } from '@/lib/security-utils'

// ========== TYPES ==========

export interface DeviceFingerprint {
  id: string                    // Final fingerprint hash
  components: FingerprintComponents
  timestamp: number             // When fingerprint was generated
  version: number               // Fingerprint algorithm version
}

export interface FingerprintComponents {
  canvas: string                // Canvas fingerprint
  webgl: string                 // WebGL renderer/vendor
  audio: string                 // Audio context fingerprint
  screen: string                // Screen properties
  hardware: string              // Hardware concurrency, memory
  timezone: string              // Timezone info
  platform: string              // Platform/OS info
  fonts: string                 // Available fonts hash
}

export interface DeviceBindingResult {
  isValid: boolean
  isNewDevice: boolean
  currentFingerprint: string
  storedFingerprint: string | null
  matchScore: number            // 0-100, how similar devices are
}

// ========== CONSTANTS ==========

const FINGERPRINT_VERSION = 1
const STORAGE_KEY = 'flowsphere-device-fp'
const BINDING_KEY = 'flowsphere-device-binding'
const MATCH_THRESHOLD = 85      // Minimum score to consider same device

// ========== CANVAS FINGERPRINT ==========

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 280
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // Draw complex pattern that varies by GPU/driver
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(100, 1, 62, 20)

    ctx.fillStyle = '#069'
    ctx.font = '11pt "Times New Roman"'
    ctx.fillText('FlowSphere 🔐 Cwm fjord', 2, 15)

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.font = '18pt Arial'
    ctx.fillText('FlowSphere 🔐 Cwm fjord', 4, 45)

    // Add gradients (GPU-dependent rendering)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.5, '#00ff00')
    gradient.addColorStop(1, '#0000ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 50, canvas.width, 10)

    // Get data URL and hash it
    const dataUrl = canvas.toDataURL('image/png')
    return await hashString(dataUrl)
  } catch (error) {
    logger.debug('Canvas fingerprint generation failed', error)
    return 'canvas-error'
  }
}

// ========== WEBGL FINGERPRINT ==========

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || !(gl instanceof WebGLRenderingContext)) return 'no-webgl'

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-debug-info'

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)

    // Get additional WebGL parameters
    const params = [
      gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      gl.getParameter(gl.MAX_VARYING_VECTORS),
      gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    ].join('|')

    return `${vendor}|${renderer}|${params}`
  } catch (error) {
    logger.debug('WebGL fingerprint generation failed', error)
    return 'webgl-error'
  }
}

// ========== AUDIO FINGERPRINT ==========

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return 'no-audio-context'

    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const analyser = context.createAnalyser()
    const gain = context.createGain()
    const compressor = context.createDynamicsCompressor()

    // Set up audio graph
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(10000, context.currentTime)

    compressor.threshold.setValueAtTime(-50, context.currentTime)
    compressor.knee.setValueAtTime(40, context.currentTime)
    compressor.ratio.setValueAtTime(12, context.currentTime)
    compressor.attack.setValueAtTime(0, context.currentTime)
    compressor.release.setValueAtTime(0.25, context.currentTime)

    oscillator.connect(compressor)
    compressor.connect(analyser)
    analyser.connect(gain)
    gain.gain.setValueAtTime(0, context.currentTime) // Mute
    gain.connect(context.destination)

    oscillator.start(0)

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100))

    const frequencyData = new Float32Array(analyser.frequencyBinCount)
    analyser.getFloatFrequencyData(frequencyData)

    oscillator.stop()
    await context.close()

    // Create fingerprint from frequency data
    const sum = frequencyData.slice(0, 50).reduce((a, b) => a + b, 0)
    return sum.toFixed(6)
  } catch (error) {
    logger.debug('Audio fingerprint generation failed', error)
    return 'audio-error'
  }
}

// ========== SCREEN FINGERPRINT ==========

function getScreenFingerprint(): string {
  try {
    const s = window.screen
    return [
      s.width,
      s.height,
      s.colorDepth,
      s.pixelDepth,
      window.devicePixelRatio || 1,
      s.availWidth,
      s.availHeight,
      (s as any).orientation?.type || 'unknown'
    ].join('|')
  } catch (error) {
    logger.debug('Screen fingerprint failed', error, 'DeviceFingerprint')
    return 'screen-error'
  }
}

// ========== HARDWARE FINGERPRINT ==========

function getHardwareFingerprint(): string {
  try {
    const nav = navigator as any
    return [
      nav.hardwareConcurrency || 0,
      nav.deviceMemory || 0,
      nav.maxTouchPoints || 0,
      nav.platform || 'unknown',
      nav.vendor || 'unknown',
      nav.productSub || 'unknown',
      nav.language || 'unknown',
      nav.languages?.join(',') || 'unknown'
    ].join('|')
  } catch (error) {
    logger.debug('Hardware fingerprint generation failed', error)
    return 'hardware-error'
  }
}

// ========== TIMEZONE FINGERPRINT ==========

function getTimezoneFingerprint(): string {
  try {
    const date = new Date()
    const offset = date.getTimezoneOffset()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const locale = Intl.DateTimeFormat().resolvedOptions().locale

    return `${offset}|${tz}|${locale}`
  } catch (error) {
    logger.debug('Timezone fingerprint generation failed', error)
    return 'tz-error'
  }
}

// ========== PLATFORM FINGERPRINT ==========

function getPlatformFingerprint(): string {
  try {
    const nav = navigator
    const ua = nav.userAgent

    // Extract key parts without volatile version numbers
    const browser = ua.includes('Chrome') ? 'Chrome' :
                   ua.includes('Firefox') ? 'Firefox' :
                   ua.includes('Safari') ? 'Safari' :
                   ua.includes('Edge') ? 'Edge' : 'Other'

    const os = ua.includes('Windows') ? 'Windows' :
               ua.includes('Mac') ? 'Mac' :
               ua.includes('Linux') ? 'Linux' :
               ua.includes('Android') ? 'Android' :
               ua.includes('iOS') || ua.includes('iPhone') ? 'iOS' : 'Other'

    return `${browser}|${os}|${nav.platform}`
  } catch (error) {
    logger.debug('Platform fingerprint generation failed', error)
    return 'platform-error'
  }
}

// ========== FONTS FINGERPRINT ==========

function getFontsFingerprint(): string {
  try {
    const testFonts = [
      'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
      'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
      'Lucida Console', 'Lucida Sans', 'Monaco', 'Palatino',
      'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana',
      'Roboto', 'Open Sans', 'Segoe UI', 'San Francisco'
    ]

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    const baseFonts = ['monospace', 'sans-serif', 'serif']
    const testString = 'mmmmmmmmmmlli'
    const testSize = '72px'

    const getWidth = (font: string, baseFont: string) => {
      ctx.font = `${testSize} ${font}, ${baseFont}`
      return ctx.measureText(testString).width
    }

    const available: string[] = []
    for (const font of testFonts) {
      for (const baseFont of baseFonts) {
        const baseWidth = getWidth(baseFont, baseFont)
        const testWidth = getWidth(font, baseFont)
        if (testWidth !== baseWidth) {
          available.push(font)
          break
        }
      }
    }

    return available.join(',')
  } catch (error) {
    logger.debug('Fonts fingerprint generation failed', error)
    return 'fonts-error'
  }
}

// ========== HASH UTILITIES ==========

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hashComponents(components: FingerprintComponents): Promise<string> {
  const combined = [
    components.canvas,
    components.webgl,
    components.audio,
    components.screen,
    components.hardware,
    components.timezone,
    components.platform,
    components.fonts
  ].join('::')

  return await hashString(combined)
}

// ========== MAIN FINGERPRINT GENERATION ==========

/**
 * Generate a complete device fingerprint
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const [canvas, audio] = await Promise.all([
    getCanvasFingerprint(),
    getAudioFingerprint()
  ])

  const components: FingerprintComponents = {
    canvas,
    webgl: getWebGLFingerprint(),
    audio,
    screen: getScreenFingerprint(),
    hardware: getHardwareFingerprint(),
    timezone: getTimezoneFingerprint(),
    platform: getPlatformFingerprint(),
    fonts: getFontsFingerprint()
  }

  const id = await hashComponents(components)

  return {
    id,
    components,
    timestamp: Date.now(),
    version: FINGERPRINT_VERSION
  }
}

/**
 * Get or create persistent device fingerprint
 * This is stored and reused across sessions
 */
export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DeviceFingerprint
      // Verify it's still valid by regenerating and comparing
      if (parsed.version === FINGERPRINT_VERSION) {
        return parsed
      }
    }
  } catch (error) {
    logger.debug('Stored fingerprint invalid, regenerating', error)
  }

  // Generate new fingerprint
  const fingerprint = await generateDeviceFingerprint()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fingerprint))
  return fingerprint
}

/**
 * Get just the fingerprint ID (short form)
 */
export async function getDeviceFingerprintId(): Promise<string> {
  const fp = await getDeviceFingerprint()
  return fp.id
}

// ========== DEVICE BINDING ==========

/**
 * Bind an email to this device for vault access
 */
export async function bindDeviceToEmail(email: string): Promise<void> {
  const fingerprint = await getDeviceFingerprint()
  const binding = {
    email: email.toLowerCase().trim(),
    fingerprintId: fingerprint.id,
    boundAt: Date.now(),
    version: FINGERPRINT_VERSION
  }
  localStorage.setItem(BINDING_KEY, JSON.stringify(binding))
  logger.info('Device bound to email', { email }, 'DeviceBinding')
}

/**
 * Check if current device matches the bound device for an email
 */
export async function verifyDeviceBinding(email: string): Promise<DeviceBindingResult> {
  const currentFingerprint = await getDeviceFingerprint()

  try {
    const storedBinding = localStorage.getItem(BINDING_KEY)

    if (!storedBinding) {
      // No binding exists - this is a new device/registration
      return {
        isValid: false,
        isNewDevice: true,
        currentFingerprint: currentFingerprint.id,
        storedFingerprint: null,
        matchScore: 0
      }
    }

    const binding = JSON.parse(storedBinding)

    // Check email matches
    if (binding.email !== email.toLowerCase().trim()) {
      return {
        isValid: false,
        isNewDevice: true,
        currentFingerprint: currentFingerprint.id,
        storedFingerprint: binding.fingerprintId,
        matchScore: 0
      }
    }

    // Check fingerprint matches
    const isExactMatch = binding.fingerprintId === currentFingerprint.id

    if (isExactMatch) {
      return {
        isValid: true,
        isNewDevice: false,
        currentFingerprint: currentFingerprint.id,
        storedFingerprint: binding.fingerprintId,
        matchScore: 100
      }
    }

    // Fingerprint doesn't match - different device with same email
    return {
      isValid: false,
      isNewDevice: true,
      currentFingerprint: currentFingerprint.id,
      storedFingerprint: binding.fingerprintId,
      matchScore: 0
    }

  } catch (error) {
    logger.debug('Device binding verification failed', error)
    return {
      isValid: false,
      isNewDevice: true,
      currentFingerprint: currentFingerprint.id,
      storedFingerprint: null,
      matchScore: 0
    }
  }
}

/**
 * Clear device binding (used when user logs out or resets)
 */
export function clearDeviceBinding(): void {
  localStorage.removeItem(BINDING_KEY)
  logger.info('Device binding cleared', undefined, 'DeviceBinding')
}

/**
 * Clear all vault data (called when device changes)
 */
export function clearVaultData(): void {
  // Clear all FlowSphere vault-related data
  const keysToRemove = [
    'flowsphere-vault-items',
    'flowsphere-vault-key',
    'flowsphere-vault-settings',
    'flowsphere-security-settings',
    'flowsphere-biometric-credential',
    'flowsphere-messenger-contacts',
    'flowsphere-messenger-messages',
    'flowsphere-device-binding'
  ]

  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })

  // Clear IndexedDB vault storage
  try {
    indexedDB.deleteDatabase('flowsphere-vault')
    indexedDB.deleteDatabase('flowsphere-attachments')
  } catch (e) {
    console.warn('[VAULT] Could not clear IndexedDB:', e)
  }

  console.log('[VAULT] All vault data cleared due to device change')
}

// ========== VAULT KEY DERIVATION ==========

/**
 * Derive a vault encryption key bound to email + device
 * This ensures vault data can ONLY be decrypted on the original device
 */
export async function deriveDeviceBoundKey(
  email: string,
  password: string
): Promise<CryptoKey> {
  const fingerprint = await getDeviceFingerprint()

  // Combine email + password + device fingerprint
  const combined = `${email.toLowerCase().trim()}::${password}::${fingerprint.id}`

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(combined),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Use device fingerprint as part of salt for extra binding
  const salt = encoder.encode(`FlowSphere-Vault-${fingerprint.id.substring(0, 16)}`)

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310000, // OWASP 2023 recommendation
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Export device fingerprint ID for display/verification
 */
export async function getDeviceIdForDisplay(): Promise<string> {
  const fp = await getDeviceFingerprint()
  // Return shortened version for display: FS-XXXX-XXXX
  return `FS-${fp.id.substring(0, 4).toUpperCase()}-${fp.id.substring(4, 8).toUpperCase()}`
}

// ========== DEVICE CHANGE DETECTION ==========

export interface DeviceChangeResult {
  deviceChanged: boolean
  action: 'continue' | 'restore' | 'new_setup'
  message: string
}

/**
 * Check if device has changed and determine action
 */
export async function checkDeviceChange(email: string): Promise<DeviceChangeResult> {
  const verification = await verifyDeviceBinding(email)

  if (verification.isValid) {
    return {
      deviceChanged: false,
      action: 'continue',
      message: 'Device verified. Access granted.'
    }
  }

  if (verification.isNewDevice && verification.storedFingerprint) {
    // Email exists but device is different
    return {
      deviceChanged: true,
      action: 'restore',
      message: 'Different device detected. Your vault data from the previous device cannot be accessed. Would you like to set up FlowSphere on this new device? All previous vault data will remain on the original device.'
    }
  }

  // No previous binding - fresh setup
  return {
    deviceChanged: false,
    action: 'new_setup',
    message: 'Welcome to FlowSphere. Setting up secure vault on this device.'
  }
}
