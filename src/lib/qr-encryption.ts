/**
 * Simple encryption utilities for QR codes
 * Prevents external scanners from reading raw invite codes
 */

const ENCRYPTION_KEY = 'FLOWSPHERE_VAULT_2025'

/**
 * Encrypts a string using a simple XOR cipher with base64 encoding
 * External scanners will see gibberish, but FlowSphere can decrypt
 */
export function encryptQRCode(plainText: string): string {
  if (!plainText) return ''

  const encrypted: number[] = []
  const keyLength = ENCRYPTION_KEY.length

  for (let i = 0; i < plainText.length; i++) {
    const charCode = plainText.charCodeAt(i)
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % keyLength)
    encrypted.push(charCode ^ keyChar)
  }

  // Convert to base64 to make it QR-friendly
  const binaryString = String.fromCharCode(...encrypted)
  const base64 = btoa(binaryString)

  // Add prefix to identify FlowSphere encrypted QR codes
  return `FSE:${base64}`
}

/**
 * Decrypts a FlowSphere encrypted QR code
 * Returns null if not a valid FlowSphere QR code
 */
export function decryptQRCode(encryptedText: string): string | null {
  if (!encryptedText) return null

  // Check if it's a FlowSphere encrypted code
  if (!encryptedText.startsWith('FSE:')) {
    // If it doesn't have our prefix, it might be a legacy plain code
    // Try to validate it as a plain code
    if (encryptedText.match(/^[A-Z0-9]{6,12}$/)) {
      return encryptedText
    }
    return null
  }

  try {
    // Remove prefix and decode base64
    const base64 = encryptedText.substring(4)
    const binaryString = atob(base64)

    // Convert back to numbers
    const encrypted: number[] = []
    for (let i = 0; i < binaryString.length; i++) {
      encrypted.push(binaryString.charCodeAt(i))
    }

    // Decrypt with XOR
    const decrypted: string[] = []
    const keyLength = ENCRYPTION_KEY.length

    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted[i]
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % keyLength)
      decrypted.push(String.fromCharCode(charCode ^ keyChar))
    }

    return decrypted.join('')
  } catch (error) {
    console.error('QR decryption error:', error)
    return null
  }
}

/**
 * Validates if a string is a valid FlowSphere QR code (encrypted or plain)
 */
export function isValidFlowSphereQR(code: string): boolean {
  if (!code) return false

  // Check if it's encrypted
  if (code.startsWith('FSE:')) {
    const decrypted = decryptQRCode(code)
    return decrypted !== null && decrypted.length > 0
  }

  // Check if it's a valid plain code format
  return /^[A-Z0-9]{6,12}$/.test(code)
}
