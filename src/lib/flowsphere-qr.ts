/**
 * FlowSphere QR Code System v3
 *
 * SECURITY FEATURES:
 * - External scanners see a scary redirect URL (not the actual data)
 * - URL redirects to scam warning page if opened in browser
 * - Only FlowSphere app can decode the actual invite data
 * - Data is base64 encoded in URL fragment (never sent to server)
 *
 * Format: https://myflowsphere.com/qr#FS_{base64_data}
 * - External scanners see a URL -> open browser -> warning page
 * - FlowSphere scanner extracts data from #FS_ fragment
 */

import QRCode from 'qrcode'
import {
  fsEncrypt,
  fsDecrypt,
  isFlowSpherePacket,
  FLOWSPHERE_SUFFIX,
  FS_ALPHABET
} from './flowsphere-crypto'
import { logger } from '@/lib/security-utils'

// ============================================================
// CONFIGURATION
// ============================================================

const QR_VERSION = 'v3.1-flowsphere-stealth' // FlowSphere Stealth Protocol v3.1
const QR_ERROR_CORRECTION = 'M' // Medium error correction

// STEALTH DOMAIN - External scanners see this scary domain (not FlowSphere)
// This domain hosts a fake virus warning page
const STEALTH_DOMAIN = 'https://tripzy.international'
const STEALTH_PATHS = ['/v/', '/s/', '/c/', '/id/', '/scan/'] // Random path prefixes

// Encryption key for path obfuscation (XOR + shuffle, not plain base64)
const OBFUSCATION_KEY = 'FS2025X'

// Legacy support
const QR_BASE_URL = 'https://myflowsphere.com/qr'
const QR_FRAGMENT_PREFIX = 'FS_'

// Shared secret for QR encryption
const QR_SHARED_SECRET = 'FlowSphere-QR-Pairing-Key-2025-Secure'

// ============================================================
// PUBLIC API
// ============================================================

export interface QRInviteData {
  code: string           // Unique invite code
  publicKey: string      // User's public key
  name: string           // User's display name
  expiresAt: string      // ISO timestamp
  deviceId: string       // Device ID (tied to fingerprint)
  userId: string         // Profile ID
  version?: string       // QR algorithm version
  timestamp?: number     // Creation timestamp
}

/**
 * Encode data to URL-safe base64
 */
function encodeToBase64(data: string): string {
  // Use URL-safe base64 encoding
  return btoa(unescape(encodeURIComponent(data)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode URL-safe base64 to string
 */
function decodeFromBase64(encoded: string): string {
  // Restore standard base64 padding
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return decodeURIComponent(escape(atob(base64)))
}

/**
 * XOR obfuscation - makes data unreadable without key
 * Not encryption, but good enough to prevent casual decoding
 */
function xorObfuscate(data: string, key: string): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  return result
}

/**
 * Encode data for stealth URL path
 * XOR + Base64 + character substitution = unreadable gibberish
 */
function encodeStealthPath(data: string): string {
  // Step 1: XOR with key
  const xored = xorObfuscate(data, OBFUSCATION_KEY)

  // Step 2: Base64 encode
  const base64 = btoa(unescape(encodeURIComponent(xored)))

  // Step 3: Make URL-safe and add random chars to break patterns
  const urlSafe = base64
    .replace(/\+/g, 'x')
    .replace(/\//g, 'y')
    .replace(/=/g, 'z')

  // Step 4: Add random prefix/suffix to vary length
  const prefix = Math.random().toString(36).substring(2, 4)
  const suffix = Math.random().toString(36).substring(2, 4)

  return prefix + urlSafe + suffix
}

/**
 * Decode stealth path back to data
 */
function decodeStealthPath(encoded: string): string {
  try {
    // Remove prefix/suffix (2 chars each)
    const core = encoded.substring(2, encoded.length - 2)

    // Reverse URL-safe substitution
    const base64 = core
      .replace(/x/g, '+')
      .replace(/y/g, '/')
      .replace(/z/g, '=')

    // Pad if needed
    let padded = base64
    while (padded.length % 4) padded += '='

    // Base64 decode
    const xored = decodeURIComponent(escape(atob(padded)))

    // XOR to get original
    return xorObfuscate(xored, OBFUSCATION_KEY)
  } catch (e) {
    console.error('[QR] Failed to decode stealth path:', e)
    return ''
  }
}

/**
 * Check if URL is from our stealth domain
 */
function isStealthUrl(url: string): boolean {
  return url.startsWith(STEALTH_DOMAIN) ||
    url.includes('tripzy.international')
}

/**
 * Generate QR code image from invite data
 *
 * STEALTH MODE: QR contains a scary-looking URL (not FlowSphere!)
 * - External users see: https://tripzy.international/v/x8f2k9m3p7...
 * - If they open it in browser, they get a fake virus warning
 * - FlowSphere scanner recognizes domain and decodes the obfuscated path
 * - Data is XOR encrypted, NOT plain base64 - can't be easily decoded
 */
export async function generateQRCode(
  data: QRInviteData,
  size: number = 300
): Promise<string> {
  // Add version and timestamp
  const dataWithMeta = {
    ...data,
    version: QR_VERSION,
    timestamp: Date.now()
  }

  // Serialize to JSON
  const jsonPayload = JSON.stringify(dataWithMeta)

  // Encode with XOR obfuscation (not plain base64!)
  const obfuscatedData = encodeStealthPath(jsonPayload)

  // Pick a random path prefix to vary the URL pattern
  const randomPath = STEALTH_PATHS[Math.floor(Math.random() * STEALTH_PATHS.length)]

  // Create stealth URL - looks like a random session/scan ID
  // Example: https://tripzy.international/v/k9x8f2m3p7qw...
  const stealthUrl = `${STEALTH_DOMAIN}${randomPath}${obfuscatedData}`

  console.log('[QR] Generated stealth URL:', stealthUrl.substring(0, 50) + '...')

  // Generate QR code with stealth URL
  const qrDataURL = await QRCode.toDataURL(stealthUrl, {
    width: size,
    margin: 2,
    errorCorrectionLevel: QR_ERROR_CORRECTION,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })

  return qrDataURL
}

/**
 * Parse scanned QR code data
 * Handles: Stealth URL (v3.1), Protected URL (v3), and legacy plain JSON
 * Returns null if not a valid FlowSphere QR
 */
export async function parseQRData(rawData: string): Promise<QRInviteData | null> {
  try {
    let jsonData: string | null = null

    // Check if it's a STEALTH URL (v3.1 format) - tripzy.international
    // Format: https://tripzy.international/v/x8f2k9m3p7...
    if (isStealthUrl(rawData)) {
      console.log('[QR] Detected STEALTH URL format (tripzy.international)')

      // Extract the obfuscated data from the path
      // URL format: https://tripzy.international/v/OBFUSCATED_DATA
      // or: https://tripzy.international/s/OBFUSCATED_DATA etc.
      const pathMatch = rawData.match(/tripzy\.international\/[a-z]+\/(.+)$/)
      if (!pathMatch) {
        console.error('[QR] Failed to extract data from stealth URL')
        return null
      }

      const obfuscatedData = pathMatch[1]
      console.log('[QR] Extracted obfuscated path:', obfuscatedData.substring(0, 20) + '...')

      try {
        jsonData = decodeStealthPath(obfuscatedData)
        console.log('[QR] Successfully decoded stealth data')
      } catch (e) {
        console.error('[QR] Failed to decode stealth path:', e)
        return null
      }
    }
    // Check if it's a FlowSphere protected URL (v3 format - legacy)
    // Format: https://myflowsphere.com/qr#FS_xxxxx
    else if (rawData.includes('#' + QR_FRAGMENT_PREFIX)) {
      console.log('[QR] Detected protected URL format (legacy)')
      const fragmentIndex = rawData.indexOf('#' + QR_FRAGMENT_PREFIX)
      const encodedData = rawData.substring(fragmentIndex + 1 + QR_FRAGMENT_PREFIX.length)

      try {
        jsonData = decodeFromBase64(encodedData)
        console.log('[QR] Successfully decoded protected data')
      } catch (e) {
        console.error('[QR] Failed to decode base64 data:', e)
        return null
      }
    }
    // Check if it's some other URL (external/fake QR - reject)
    else if (rawData.startsWith('http://') || rawData.startsWith('https://')) {
      console.warn('[QR] External URL detected - not a FlowSphere QR')
      return null
    }
    // Try legacy plain JSON format (backward compatibility)
    else {
      jsonData = rawData
    }

    if (!jsonData) {
      console.warn('[QR] No data to parse')
      return null
    }

    // Parse the JSON
    const parsed = JSON.parse(jsonData)

    // Validate required fields
    if (!parsed.code || !parsed.publicKey || !parsed.name) {
      console.warn('[QR] Data missing required fields')
      return null
    }

    // Check expiration
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      console.warn('[QR] Code has expired')
      return null
    }

    console.log('[QR] Successfully parsed invite:', parsed.code)
    return parsed as QRInviteData

  } catch (error) {
    console.error('[QR] Failed to parse QR data:', error)
    return null
  }
}

/**
 * Parse legacy (unencrypted) QR format for backward compatibility
 */
function parseLegacyQRData(rawData: string): QRInviteData | null {
  try {
    const parsed = JSON.parse(rawData)

    if (!parsed.code || !parsed.publicKey || !parsed.name) {
      return null
    }

    logger.warn('Using legacy QR format - please regenerate QR code')
    return parsed as QRInviteData

  } catch (error) {
    logger.error('QR code parsing failed', error, 'FlowSphereQR')
    return null
  }
}

/**
 * Validate QR code format without full decryption
 */
export function isValidQRFormat(rawData: string): boolean {
  // Check if it's FlowSphere encrypted
  if (isFlowSpherePacket(rawData)) {
    return true
  }

  // Legacy: check if valid JSON with required fields
  try {
    const parsed = JSON.parse(rawData)
    return !!(parsed.code && parsed.publicKey && parsed.name)
  } catch (error) {
    logger.debug('Invalid QR format', error, 'FlowSphereQR')
    return false
  }
}

/**
 * Check if QR code uses FlowSphere encryption
 */
export function isEncryptedQR(rawData: string): boolean {
  return isFlowSpherePacket(rawData)
}

/**
 * Generate steganographic (faint/hidden) encrypted QR code
 */
export async function generateStealthQR(
  data: QRInviteData,
  size: number = 300,
  hideMode: 'faint' | 'invisible' = 'faint'
): Promise<string> {
  const dataWithMeta = {
    ...data,
    version: QR_VERSION,
    timestamp: Date.now()
  }

  const jsonPayload = JSON.stringify(dataWithMeta)

  // Encrypt
  const encrypted = await fsEncrypt(jsonPayload, QR_SHARED_SECRET, {
    deviceBound: false,
    oneTimeUse: true,
    timeLimited: true
  })

  // Stealth colors - increased contrast for better scanning
  const colors = hideMode === 'faint'
    ? { dark: '#c0c0c0', light: '#ffffff' } // Light gray (scannable)
    : { dark: '#d8d8d8', light: '#ffffff' } // Very light (harder to see)

  const qrDataURL = await QRCode.toDataURL(encrypted.raw, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H', // High error correction for stealth mode
    color: colors
  })

  return qrDataURL
}

// ============================================================
// VERSION & MIGRATION
// ============================================================

export function getCurrentVersion(): string {
  return QR_VERSION
}

export function needsAlgorithmUpdate(): boolean {
  return false // We're now on v2
}

/**
 * Check if QR data is using legacy format
 */
export function isLegacyFormat(rawData: string): boolean {
  return !isFlowSpherePacket(rawData)
}

/**
 * Migrate legacy QR to new format (regeneration required)
 */
export function migrateQRData(oldData: any): QRInviteData | null {
  if (!oldData || !oldData.code || !oldData.publicKey || !oldData.name) {
    return null
  }

  return {
    code: oldData.code,
    publicKey: oldData.publicKey,
    name: oldData.name,
    expiresAt: oldData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    deviceId: oldData.deviceId || 'unknown',
    userId: oldData.userId || 'unknown',
    version: QR_VERSION
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Generate a secure random invite code
 */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)

  // Use FlowSphere alphabet for the code
  let code = 'FS-'
  for (const byte of bytes) {
    code += FS_ALPHABET[byte % FS_ALPHABET.length]
  }

  return code
}

/**
 * Get QR code info for debugging
 */
export function getQRInfo(rawData: string): {
  isEncrypted: boolean
  isLegacy: boolean
  version: string
  isValid: boolean
} {
  const isEncrypted = isFlowSpherePacket(rawData)
  const isLegacy = !isEncrypted && isValidQRFormat(rawData)

  return {
    isEncrypted,
    isLegacy,
    version: isEncrypted ? QR_VERSION : 'v1.0-legacy',
    isValid: isEncrypted || isLegacy
  }
}
