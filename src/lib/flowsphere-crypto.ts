/**
 * FlowSphere Secure Cryptographic Protocol v2
 *
 * Custom encryption protocol with:
 * - AES-256-GCM (primary security)
 * - 8-round Feistel obfuscation (signature hiding)
 * - Custom Base32 encoding (FlowSphere alphabet)
 * - Magic prefix/suffix (protocol identification)
 * - Device binding (hardware-locked encryption)
 *
 * Protocol Structure:
 * [FSQ2][Version][Flags][KeyID][Nonce][Ciphertext][AuthTag] → Feistel → Base32 → [~FS]
 */

import { getDeviceFingerprintId } from './device-fingerprint'
import { logger } from '@/lib/security-utils'

// ========== PROTOCOL CONSTANTS ==========

// Magic bytes for protocol identification
export const FLOWSPHERE_MAGIC = new Uint8Array([0x46, 0x53, 0x51, 0x32]) // "FSQ2"
export const FLOWSPHERE_SUFFIX = '~FS'
export const PROTOCOL_VERSION = 0x02

// Custom Base32 alphabet (not standard RFC 4648)
// Avoids ambiguous characters: 0/O, 1/I/L
export const FS_ALPHABET = 'FSPHERVAULTQCOD23456789BGKMNWXYZ'

// Feistel configuration
const FEISTEL_ROUNDS = 8
// FlowSphere secret constant (derived from "FlowSphere2025Secure")
const FEISTEL_CONSTANTS = new Uint32Array([
  0x466C6F77, // "Flow"
  0x53706865, // "Sphe"
  0x72653230, // "re20"
  0x32355365, // "25Se"
  0x63757265, // "cure"
  0x56617574, // "Vaut"
  0x4C744B65, // "LtKe"
  0x79537973  // "ySys"
])

// Key IDs for rotation support
export const KEY_IDS = {
  PRIMARY: 0x0001,
  SECONDARY: 0x0002,
  LEGACY: 0x0000
}

// Flags bitmap
export const FLAGS = {
  NONE: 0x00,
  DEVICE_BOUND: 0x01,
  TIME_LIMITED: 0x02,
  ONE_TIME_USE: 0x04,
  COMPRESSED: 0x08
}

// ========== FEISTEL CIPHER (OBFUSCATION LAYER) ==========

/**
 * Simple round function for Feistel cipher
 * Uses XOR with round constant and bit rotation
 */
function feistelRoundFunction(data: number, round: number): number {
  const constant = FEISTEL_CONSTANTS[round % FEISTEL_CONSTANTS.length]
  let result = data ^ constant

  // Rotate bits based on round number
  const rotateAmount = (round * 3 + 5) % 32
  result = ((result << rotateAmount) | (result >>> (32 - rotateAmount))) >>> 0

  // Additional mixing
  result = (result * 0x9E3779B9) >>> 0 // Golden ratio constant
  result ^= (result >>> 16)

  return result >>> 0
}

/**
 * 8-round unbalanced Feistel cipher for obfuscation
 * This is NOT cryptographic - it's for hiding AES output signature
 */
export function feistelEncrypt(data: Uint8Array): Uint8Array {
  // Pad to multiple of 8 bytes
  const paddedLength = Math.ceil(data.length / 8) * 8
  const padded = new Uint8Array(paddedLength + 1) // +1 for padding length
  padded.set(data)
  padded[paddedLength] = paddedLength - data.length // Store padding amount

  const result = new Uint8Array(padded.length)
  const view = new DataView(padded.buffer)
  const resultView = new DataView(result.buffer)

  // Process in 8-byte blocks (two 32-bit halves)
  for (let i = 0; i < padded.length; i += 8) {
    let left = i < padded.length - 4 ? view.getUint32(i, true) : 0
    let right = i + 4 < padded.length ? view.getUint32(i + 4, true) : 0

    // 8 rounds of Feistel
    for (let round = 0; round < FEISTEL_ROUNDS; round++) {
      const f = feistelRoundFunction(right, round)
      const newRight = left ^ f
      left = right
      right = newRight
    }

    if (i < result.length - 4) resultView.setUint32(i, left, true)
    if (i + 4 < result.length) resultView.setUint32(i + 4, right, true)
  }

  return result
}

/**
 * Reverse Feistel cipher (decryption)
 */
export function feistelDecrypt(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const resultView = new DataView(result.buffer)

  // Process in 8-byte blocks
  for (let i = 0; i < data.length; i += 8) {
    let left = i < data.length - 4 ? view.getUint32(i, true) : 0
    let right = i + 4 < data.length ? view.getUint32(i + 4, true) : 0

    // Reverse 8 rounds of Feistel
    for (let round = FEISTEL_ROUNDS - 1; round >= 0; round--) {
      const f = feistelRoundFunction(left, round)
      const newLeft = right ^ f
      right = left
      left = newLeft
    }

    if (i < result.length - 4) resultView.setUint32(i, left, true)
    if (i + 4 < result.length) resultView.setUint32(i + 4, right, true)
  }

  // Remove padding
  const paddingLength = result[result.length - 1]
  if (paddingLength < 8) {
    return result.slice(0, result.length - 1 - paddingLength)
  }

  return result.slice(0, -1)
}

// ========== CUSTOM BASE32 ENCODING ==========

/**
 * Encode bytes to FlowSphere custom Base32
 */
export function fsBase32Encode(data: Uint8Array): string {
  let result = ''
  let bits = 0
  let value = 0

  for (const byte of data) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      bits -= 5
      result += FS_ALPHABET[(value >>> bits) & 0x1F]
    }
  }

  if (bits > 0) {
    result += FS_ALPHABET[(value << (5 - bits)) & 0x1F]
  }

  return result
}

/**
 * Decode FlowSphere custom Base32 to bytes
 */
export function fsBase32Decode(str: string): Uint8Array {
  const result: number[] = []
  let bits = 0
  let value = 0

  for (const char of str) {
    const index = FS_ALPHABET.indexOf(char)
    if (index === -1) continue // Skip invalid characters

    value = (value << 5) | index
    bits += 5

    while (bits >= 8) {
      bits -= 8
      result.push((value >>> bits) & 0xFF)
    }
  }

  return new Uint8Array(result)
}

// ========== AES-256-GCM ENCRYPTION ==========

/**
 * Generate a random nonce for AES-GCM
 */
function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12))
}

/**
 * Derive encryption key from password and device fingerprint
 */
export async function deriveKey(
  password: string,
  deviceBound: boolean = true
): Promise<CryptoKey> {
  let keyMaterial = password

  if (deviceBound) {
    const deviceId = await getDeviceFingerprintId()
    keyMaterial = `${password}::${deviceId}`
  }

  const encoder = new TextEncoder()
  const keyData = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyMaterial),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = encoder.encode('FlowSphere-v2-Salt-2025')

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310000,
      hash: 'SHA-256'
    },
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt with AES-256-GCM
 */
async function aesEncrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; tag: Uint8Array }> {
  const nonce = generateNonce()

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    data
  )

  const encryptedArray = new Uint8Array(encrypted)

  // AES-GCM appends auth tag to ciphertext
  // Split them: last 16 bytes are the tag
  const ciphertext = encryptedArray.slice(0, -16)
  const tag = encryptedArray.slice(-16)

  return { ciphertext, nonce, tag }
}

/**
 * Decrypt with AES-256-GCM
 */
async function aesDecrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Combine ciphertext and tag (AES-GCM expects them together)
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext)
  combined.set(tag, ciphertext.length)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    key,
    combined
  )

  return new Uint8Array(decrypted)
}

// ========== FLOWSPHERE PROTOCOL V2 ==========

export interface EncryptedPacket {
  raw: string           // Final encoded string
  version: number
  flags: number
  keyId: number
  deviceBound: boolean
}

export interface DecryptedPacket {
  data: Uint8Array
  text: string
  version: number
  flags: number
  keyId: number
}

/**
 * Encrypt data using FlowSphere Secure Protocol v2
 *
 * Structure:
 * [Magic:4][Version:1][Flags:1][KeyID:2][Nonce:12][Ciphertext:var][Tag:16]
 * → Feistel obfuscation
 * → Custom Base32 encoding
 * → Suffix
 */
export async function fsEncrypt(
  plaintext: string | Uint8Array,
  password: string,
  options: {
    deviceBound?: boolean
    timeLimited?: boolean
    oneTimeUse?: boolean
    keyId?: number
  } = {}
): Promise<EncryptedPacket> {
  const {
    deviceBound = true,
    timeLimited = false,
    oneTimeUse = false,
    keyId = KEY_IDS.PRIMARY
  } = options

  // Convert string to bytes
  const data = typeof plaintext === 'string'
    ? new TextEncoder().encode(plaintext)
    : plaintext

  // Calculate flags
  let flags = FLAGS.NONE
  if (deviceBound) flags |= FLAGS.DEVICE_BOUND
  if (timeLimited) flags |= FLAGS.TIME_LIMITED
  if (oneTimeUse) flags |= FLAGS.ONE_TIME_USE

  // Derive key
  const key = await deriveKey(password, deviceBound)

  // Encrypt with AES-GCM
  const { ciphertext, nonce, tag } = await aesEncrypt(data, key)

  // Build packet
  // Header: Magic(4) + Version(1) + Flags(1) + KeyID(2) = 8 bytes
  // Crypto: Nonce(12) + Ciphertext(var) + Tag(16)
  const headerSize = 8
  const packetSize = headerSize + 12 + ciphertext.length + 16

  const packet = new Uint8Array(packetSize)
  let offset = 0

  // Magic bytes
  packet.set(FLOWSPHERE_MAGIC, offset)
  offset += 4

  // Version
  packet[offset++] = PROTOCOL_VERSION

  // Flags
  packet[offset++] = flags

  // Key ID (big-endian)
  packet[offset++] = (keyId >> 8) & 0xFF
  packet[offset++] = keyId & 0xFF

  // Nonce
  packet.set(nonce, offset)
  offset += 12

  // Ciphertext
  packet.set(ciphertext, offset)
  offset += ciphertext.length

  // Auth tag
  packet.set(tag, offset)

  // Apply Feistel obfuscation
  const obfuscated = feistelEncrypt(packet)

  // Encode to custom Base32
  const encoded = fsBase32Encode(obfuscated)

  // Add suffix
  const final = encoded + FLOWSPHERE_SUFFIX

  return {
    raw: final,
    version: PROTOCOL_VERSION,
    flags,
    keyId,
    deviceBound
  }
}

/**
 * Decrypt data using FlowSphere Secure Protocol v2
 */
export async function fsDecrypt(
  encrypted: string,
  password: string,
  options: {
    deviceBound?: boolean
  } = {}
): Promise<DecryptedPacket> {
  // Remove suffix
  if (!encrypted.endsWith(FLOWSPHERE_SUFFIX)) {
    throw new Error('Invalid FlowSphere packet: missing suffix')
  }
  const encoded = encrypted.slice(0, -FLOWSPHERE_SUFFIX.length)

  // Decode from custom Base32
  const obfuscated = fsBase32Decode(encoded)

  // Reverse Feistel obfuscation
  const packet = feistelDecrypt(obfuscated)

  // Parse header
  let offset = 0

  // Verify magic bytes
  const magic = packet.slice(0, 4)
  if (magic[0] !== 0x46 || magic[1] !== 0x53 || magic[2] !== 0x51 || magic[3] !== 0x32) {
    throw new Error('Invalid FlowSphere packet: bad magic bytes')
  }
  offset += 4

  // Version
  const version = packet[offset++]
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`)
  }

  // Flags
  const flags = packet[offset++]
  const isDeviceBound = (flags & FLAGS.DEVICE_BOUND) !== 0

  // Key ID
  const keyId = (packet[offset] << 8) | packet[offset + 1]
  offset += 2

  // Nonce (12 bytes)
  const nonce = packet.slice(offset, offset + 12)
  offset += 12

  // Ciphertext + Tag (remaining bytes, last 16 are tag)
  const remaining = packet.slice(offset)
  const ciphertext = remaining.slice(0, -16)
  const tag = remaining.slice(-16)

  // Derive key (use deviceBound from flags or override)
  const deviceBound = options.deviceBound ?? isDeviceBound
  const key = await deriveKey(password, deviceBound)

  // Decrypt
  const decrypted = await aesDecrypt(ciphertext, nonce, tag, key)

  return {
    data: decrypted,
    text: new TextDecoder().decode(decrypted),
    version,
    flags,
    keyId
  }
}

// ========== QR CODE SPECIFIC FUNCTIONS ==========

/**
 * Encrypt data specifically for QR codes
 * Optimized for shorter output
 */
export async function encryptForQR(
  data: string,
  sharedSecret: string,
  deviceBound: boolean = true
): Promise<string> {
  const result = await fsEncrypt(data, sharedSecret, {
    deviceBound,
    oneTimeUse: true,
    timeLimited: true
  })
  return result.raw
}

/**
 * Decrypt QR code data
 */
export async function decryptFromQR(
  encrypted: string,
  sharedSecret: string,
  deviceBound: boolean = true
): Promise<string> {
  const result = await fsDecrypt(encrypted, sharedSecret, { deviceBound })
  return result.text
}

// ========== VALIDATION HELPERS ==========

/**
 * Check if a string looks like a FlowSphere encrypted packet
 */
export function isFlowSpherePacket(str: string): boolean {
  if (!str.endsWith(FLOWSPHERE_SUFFIX)) return false
  if (str.length < 30) return false // Minimum valid packet size

  // Check if all characters (except suffix) are in our alphabet
  const encoded = str.slice(0, -FLOWSPHERE_SUFFIX.length)
  return [...encoded].every(char => FS_ALPHABET.includes(char))
}

/**
 * Get packet info without decrypting
 */
export function getPacketInfo(encrypted: string): {
  valid: boolean
  version?: number
  flags?: number
  keyId?: number
  deviceBound?: boolean
} {
  try {
    if (!isFlowSpherePacket(encrypted)) {
      return { valid: false }
    }

    const encoded = encrypted.slice(0, -FLOWSPHERE_SUFFIX.length)
    const obfuscated = fsBase32Decode(encoded)
    const packet = feistelDecrypt(obfuscated)

    // Check magic
    if (packet[0] !== 0x46 || packet[1] !== 0x53 || packet[2] !== 0x51 || packet[3] !== 0x32) {
      return { valid: false }
    }

    const version = packet[4]
    const flags = packet[5]
    const keyId = (packet[6] << 8) | packet[7]

    return {
      valid: true,
      version,
      flags,
      keyId,
      deviceBound: (flags & FLAGS.DEVICE_BOUND) !== 0
    }
  } catch (error) {
    logger.debug('FlowSphere crypto protocol validation failed', error)
    return { valid: false }
  }
}

// ========== EXPORT FOR BACKWARD COMPATIBILITY ==========

// These maintain compatibility with existing code while using new protocol
export const encrypt = fsEncrypt
export const decrypt = fsDecrypt
