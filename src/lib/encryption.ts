/**
 * FlowSphere Encryption Module
 *
 * MODULAR DESIGN: This encryption layer is designed to be swappable.
 * Currently uses AES-256-GCM (Web Crypto API)
 *
 * FUTURE NOTE (Dec 2025):
 * Owner is developing custom encryption algorithm (similar to SHA-256 but unique)
 * This will be integrated ~1 year after production launch.
 * The interface below should remain stable - only swap the implementation.
 *
 * @author FlowSphere Team
 * @version 1.0.0
 * @license Proprietary
 */

import { logger } from '@/lib/security-utils'

// ============================================
// ENCRYPTION INTERFACE (DO NOT CHANGE)
// ============================================

export interface EncryptionResult {
  encryptedData: string // Base64 encoded encrypted data
  iv: string // Initialization vector (Base64)
  salt: string // Salt for key derivation (Base64)
  algorithm: string // Algorithm identifier
  version: string // Encryption version for migration
}

export interface DecryptionInput {
  encryptedData: string
  iv: string
  salt: string
  algorithm: string
  version: string
}

// ============================================
// CONFIGURATION
// ============================================

const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM', // Current: AES-256-GCM
  version: '1.0.0', // Version for future migrations
  keyLength: 256, // Key length in bits
  ivLength: 12, // IV length in bytes (96 bits for GCM)
  saltLength: 16, // Salt length in bytes
  iterations: 310000, // PBKDF2 iterations (OWASP 2023 recommendation)

  // FUTURE: Custom algorithm placeholder
  // customAlgorithm: 'FLOWSPHERE-CUSTOM-V1',
  // customVersion: '2.0.0',
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Derive encryption key from user's PIN/password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ENCRYPTION_CONFIG.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: ENCRYPTION_CONFIG.keyLength,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

// ============================================
// MAIN ENCRYPTION FUNCTIONS
// ============================================

/**
 * Encrypt data using user's PIN/password
 *
 * @param data - The data to encrypt (string or ArrayBuffer)
 * @param userPin - User's PIN or password (never sent to server)
 * @returns EncryptionResult with encrypted data and metadata
 */
export async function encryptData(
  data: string | ArrayBuffer,
  userPin: string
): Promise<EncryptionResult> {
  try {
    // Generate random salt and IV
    const salt = generateRandomBytes(ENCRYPTION_CONFIG.saltLength)
    const iv = generateRandomBytes(ENCRYPTION_CONFIG.ivLength)

    // Derive key from user's PIN
    const key = await deriveKey(userPin, salt)

    // Convert data to ArrayBuffer if string
    const dataBuffer =
      typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)

    // Encrypt using AES-256-GCM
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    )

    return {
      encryptedData: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: ENCRYPTION_CONFIG.version,
    }
  } catch (error) {
    logger.error('Encryption failed', error, 'Encryption')
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data using user's PIN/password
 *
 * @param encrypted - The encryption result object
 * @param userPin - User's PIN or password
 * @returns Decrypted data as string
 */
export async function decryptData(encrypted: DecryptionInput, userPin: string): Promise<string> {
  try {
    // Check version compatibility
    if (encrypted.version !== ENCRYPTION_CONFIG.version) {
      logger.debug(
        `Decrypting data from version ${encrypted.version}, current is ${ENCRYPTION_CONFIG.version}`
      )
      // FUTURE: Add migration logic here when upgrading encryption
    }

    // Convert Base64 back to ArrayBuffer
    const encryptedBuffer = base64ToArrayBuffer(encrypted.encryptedData)
    const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv))
    const salt = new Uint8Array(base64ToArrayBuffer(encrypted.salt))

    // Derive key from user's PIN
    const key = await deriveKey(userPin, salt)

    // Decrypt using AES-256-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedBuffer
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    logger.error('Decryption failed', error, 'Encryption')
    throw new Error('Failed to decrypt data. Incorrect PIN or corrupted data.')
  }
}

/**
 * Encrypt a file (for Vault storage)
 *
 * @param file - File object to encrypt
 * @param userPin - User's PIN
 * @returns Encrypted file as Blob with metadata
 */
export async function encryptFile(
  file: File,
  userPin: string
): Promise<{ blob: Blob; metadata: EncryptionResult }> {
  try {
    const arrayBuffer = await file.arrayBuffer()

    // Generate random salt and IV
    const salt = generateRandomBytes(ENCRYPTION_CONFIG.saltLength)
    const iv = generateRandomBytes(ENCRYPTION_CONFIG.ivLength)

    // Derive key from user's PIN
    const key = await deriveKey(userPin, salt)

    // Encrypt file data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      arrayBuffer
    )

    const metadata: EncryptionResult = {
      encryptedData: '', // Not used for file, data is in blob
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      algorithm: ENCRYPTION_CONFIG.algorithm,
      version: ENCRYPTION_CONFIG.version,
    }

    return {
      blob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
      metadata,
    }
  } catch (error) {
    logger.error('File encryption failed', error, 'Encryption')
    throw new Error('Failed to encrypt file')
  }
}

/**
 * Decrypt a file (from Vault storage)
 *
 * @param encryptedBlob - Encrypted blob from storage
 * @param metadata - Encryption metadata
 * @param userPin - User's PIN
 * @param originalType - Original file MIME type
 * @returns Decrypted file as Blob
 */
export async function decryptFile(
  encryptedBlob: Blob,
  metadata: Omit<EncryptionResult, 'encryptedData'>,
  userPin: string,
  originalType: string
): Promise<Blob> {
  try {
    const encryptedBuffer = await encryptedBlob.arrayBuffer()
    const iv = new Uint8Array(base64ToArrayBuffer(metadata.iv))
    const salt = new Uint8Array(base64ToArrayBuffer(metadata.salt))

    // Derive key from user's PIN
    const key = await deriveKey(userPin, salt)

    // Decrypt file data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedBuffer
    )

    return new Blob([decryptedBuffer], { type: originalType })
  } catch (error) {
    logger.error('File decryption failed', error, 'Encryption')
    throw new Error('Failed to decrypt file. Incorrect PIN or corrupted file.')
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Hash a PIN for verification (not for encryption key)
 * Used to verify PIN without storing it
 */
export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = salt ? new Uint8Array(base64ToArrayBuffer(salt)) : generateRandomBytes(16)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ENCRYPTION_CONFIG.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return {
    hash: arrayBufferToBase64(hashBuffer),
    salt: arrayBufferToBase64(saltBytes.buffer),
  }
}

/**
 * Verify a PIN against stored hash
 */
export async function verifyPin(pin: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPin(pin, salt)
  return hash === storedHash
}

/**
 * Get current encryption info (for UI display)
 */
export function getEncryptionInfo(): { algorithm: string; version: string; strength: string } {
  return {
    algorithm: ENCRYPTION_CONFIG.algorithm,
    version: ENCRYPTION_CONFIG.version,
    strength: 'Military-grade (256-bit)',
  }
}

// ============================================
// FUTURE: CUSTOM ALGORITHM PLACEHOLDER
// ============================================

/**
 * PLACEHOLDER: Custom FlowSphere encryption algorithm
 *
 * This will be implemented ~1 year after production launch.
 * The owner is developing a unique algorithm similar to SHA-256.
 *
 * When ready:
 * 1. Implement encryptDataCustom() and decryptDataCustom()
 * 2. Update ENCRYPTION_CONFIG.algorithm and version
 * 3. Add migration logic in decryptData() for old versions
 * 4. The interface (EncryptionResult) should remain the same
 *
 * @future
 */
// export async function encryptDataCustom(data: string, userPin: string): Promise<EncryptionResult> {
//   // FLOWSPHERE-CUSTOM-V1 implementation here
//   throw new Error('Custom algorithm not yet implemented')
// }

// export async function decryptDataCustom(encrypted: DecryptionInput, userPin: string): Promise<string> {
//   // FLOWSPHERE-CUSTOM-V1 implementation here
//   throw new Error('Custom algorithm not yet implemented')
// }

// ============================================
// DEVICE-BOUND ENCRYPTION (FlowSphere v2)
// ============================================

import { getDeviceFingerprintId } from './device-fingerprint'

/**
 * Derive key with device binding
 * Key = PBKDF2(password + deviceFingerprint)
 */
async function deriveDeviceBoundKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Get device fingerprint
  const deviceId = await getDeviceFingerprintId()

  // Combine password with device fingerprint
  const combinedPassword = `${password}::${deviceId}::FlowSphere-Device-Bound`

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(combinedPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 310000, // OWASP 2023 recommendation
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data with device binding
 * Data can ONLY be decrypted on the same device
 */
export async function encryptDataDeviceBound(
  data: string | ArrayBuffer,
  userPin: string
): Promise<EncryptionResult & { deviceBound: boolean }> {
  try {
    const salt = generateRandomBytes(ENCRYPTION_CONFIG.saltLength)
    const iv = generateRandomBytes(ENCRYPTION_CONFIG.ivLength)

    const key = await deriveDeviceBoundKey(userPin, salt)

    const dataBuffer =
      typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    )

    return {
      encryptedData: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      algorithm: 'AES-256-GCM-DEVICE-BOUND',
      version: '2.0.0',
      deviceBound: true,
    }
  } catch (error) {
    logger.error('Device-bound encryption failed', error, 'Encryption')
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt device-bound data
 * Will fail if called from a different device
 */
export async function decryptDataDeviceBound(
  encrypted: DecryptionInput,
  userPin: string
): Promise<string> {
  try {
    const encryptedBuffer = base64ToArrayBuffer(encrypted.encryptedData)
    const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv))
    const salt = new Uint8Array(base64ToArrayBuffer(encrypted.salt))

    const key = await deriveDeviceBoundKey(userPin, salt)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error) {
    logger.error('Device-bound decryption failed', error, 'Encryption')
    throw new Error('Failed to decrypt. Wrong device or incorrect PIN.')
  }
}

/**
 * Encrypt file with device binding
 */
export async function encryptFileDeviceBound(
  file: File,
  userPin: string
): Promise<{ blob: Blob; metadata: EncryptionResult & { deviceBound: boolean } }> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const salt = generateRandomBytes(ENCRYPTION_CONFIG.saltLength)
    const iv = generateRandomBytes(ENCRYPTION_CONFIG.ivLength)

    const key = await deriveDeviceBoundKey(userPin, salt)

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      arrayBuffer
    )

    return {
      blob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
      metadata: {
        encryptedData: '', // Not stored in metadata for files
        iv: arrayBufferToBase64(iv.buffer),
        salt: arrayBufferToBase64(salt.buffer),
        algorithm: 'AES-256-GCM-DEVICE-BOUND',
        version: '2.0.0',
        deviceBound: true,
      },
    }
  } catch (error) {
    logger.error('Device-bound file encryption failed', error, 'Encryption')
    throw new Error('Failed to encrypt file')
  }
}

/**
 * Decrypt device-bound file
 */
export async function decryptFileDeviceBound(
  encryptedBlob: Blob,
  metadata: { iv: string; salt: string },
  userPin: string
): Promise<Blob> {
  try {
    const encryptedBuffer = await encryptedBlob.arrayBuffer()
    const iv = new Uint8Array(base64ToArrayBuffer(metadata.iv))
    const salt = new Uint8Array(base64ToArrayBuffer(metadata.salt))

    const key = await deriveDeviceBoundKey(userPin, salt)

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    )

    return new Blob([decryptedBuffer])
  } catch (error) {
    logger.error('Device-bound file decryption failed', error, 'Encryption')
    throw new Error('Failed to decrypt file. Wrong device or incorrect PIN.')
  }
}

/**
 * Hash PIN with device binding for storage verification
 */
export async function hashPinDeviceBound(
  pin: string,
  salt?: string
): Promise<{ hash: string; salt: string; deviceBound: boolean }> {
  const deviceId = await getDeviceFingerprintId()
  const combinedPin = `${pin}::${deviceId}`

  const saltBytes = salt ? new Uint8Array(base64ToArrayBuffer(salt)) : generateRandomBytes(16)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(combinedPin),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 310000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  return {
    hash: arrayBufferToBase64(hashBuffer),
    salt: arrayBufferToBase64(saltBytes.buffer),
    deviceBound: true,
  }
}

/**
 * Verify device-bound PIN
 */
export async function verifyPinDeviceBound(
  pin: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  try {
    const { hash } = await hashPinDeviceBound(pin, salt)
    // Use timing-safe comparison
    if (hash.length !== storedHash.length) return false
    let result = 0
    for (let i = 0; i < hash.length; i++) {
      result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i)
    }
    return result === 0
  } catch (error) {
    logger.error('PIN verification failed', error, 'Encryption')
    return false
  }
}
