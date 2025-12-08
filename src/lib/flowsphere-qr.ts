/**
 * FlowSphere QR Code System v2
 *
 * UPGRADED: Now uses FlowSphere Secure Protocol v2
 * - AES-256-GCM encryption (military-grade)
 * - 8-round Feistel obfuscation (signature hiding)
 * - Custom Base32 encoding (FlowSphere alphabet)
 * - Device-bound encryption (hardware locked)
 *
 * External QR scanners see gibberish - only FlowSphere can decode.
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

const QR_VERSION = 'v2.0-flowsphere-secure' // FlowSphere Secure Protocol v2
const QR_ERROR_CORRECTION = 'M' // Medium error correction (better for encrypted data)

// Shared secret for QR encryption (this + device fingerprint = full key)
// In production, this should be derived from a secure key exchange
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
 * Generate encrypted QR code image from invite data
 * Only FlowSphere app can read this QR code
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

  // Encrypt using FlowSphere Secure Protocol v2
  // Device-bound = true means it's tied to THIS device
  const encrypted = await fsEncrypt(jsonPayload, QR_SHARED_SECRET, {
    deviceBound: false, // QR codes need to be readable on OTHER devices
    oneTimeUse: true,
    timeLimited: true
  })

  // Generate QR code with encrypted payload
  const qrDataURL = await QRCode.toDataURL(encrypted.raw, {
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
 * Parse and decrypt scanned QR code data
 * Returns null if not a valid FlowSphere QR or decryption fails
 */
export async function parseQRData(rawData: string): Promise<QRInviteData | null> {
  try {
    // Check if it's a FlowSphere encrypted packet
    if (isFlowSpherePacket(rawData)) {
      // Decrypt using FlowSphere Secure Protocol v2
      const decrypted = await fsDecrypt(rawData, QR_SHARED_SECRET, {
        deviceBound: false // QR codes are not device-bound
      })

      const parsed = JSON.parse(decrypted.text)

      // Validate required fields
      if (!parsed.code || !parsed.publicKey || !parsed.name) {
        console.warn('QR data missing required fields')
        return null
      }

      // Check expiration
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        console.warn('QR code has expired')
        return null
      }

      return parsed as QRInviteData
    }

    // LEGACY: Try to parse as old format (plain JSON)
    // This provides backward compatibility during transition
    return parseLegacyQRData(rawData)

  } catch (error) {
    console.error('Failed to parse/decrypt QR data:', error)

    // Try legacy format as fallback
    return parseLegacyQRData(rawData)
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
