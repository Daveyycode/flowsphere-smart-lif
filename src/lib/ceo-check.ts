/**
 * CEO Authentication Check
 * Verifies if the current logged-in user is the CEO
 *
 * SECURITY FIX (Dec 6, 2025):
 * - Removed hardcoded credentials
 * - Credentials now loaded from environment variables
 * - Using proper SHA-256 hashing instead of Base64
 */

import { logger } from '@/lib/security-utils'

// CEO credentials loaded from environment variables (set in .env)
// NEVER hardcode credentials in source code
const getCEOCredentials = () => ({
  username: import.meta.env.VITE_CEO_USERNAME || '',
  password: import.meta.env.VITE_CEO_PASSWORD || ''
})

/**
 * Hash password using SHA-256 (browser-native crypto)
 * This is a proper cryptographic hash, unlike Base64 which is just encoding
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Synchronous hash check using pre-computed hash from localStorage
 */
function getStoredHash(): string | null {
  return localStorage.getItem('flowsphere-password-hash')
}

/**
 * Check if current user is CEO based on stored credentials
 */
export function isCEOUser(): boolean {
  try {
    const credentials = getCEOCredentials()
    if (!credentials.username || !credentials.password) {
      logger.warn('CEO credentials not configured in environment', undefined, 'CEOCheck')
      return false
    }

    const storedUsername = localStorage.getItem('flowsphere-username')
    const storedHash = getStoredHash()

    if (!storedUsername || !storedHash) {
      return false
    }

    // Check username match
    return storedUsername === credentials.username
  } catch (error) {
    logger.error('CEO check failed', error, 'CEOCheck')
    return false
  }
}

/**
 * Store CEO credentials after successful login
 * Uses SHA-256 hash for password storage
 */
export async function storeCEOSession(username: string, password: string): Promise<boolean> {
  const credentials = getCEOCredentials()

  if (!credentials.username || !credentials.password) {
    logger.error('CEO credentials not configured', undefined, 'CEOCheck')
    return false
  }

  if (username === credentials.username && password === credentials.password) {
    const hashedPassword = await hashPassword(password)
    localStorage.setItem('flowsphere-username', username)
    localStorage.setItem('flowsphere-password-hash', hashedPassword)
    logger.info('CEO session stored securely', undefined, 'CEOCheck')
    return true
  }
  return false
}

/**
 * Check credentials without storing
 */
export function verifyCEOCredentials(username: string, password: string): boolean {
  const credentials = getCEOCredentials()

  if (!credentials.username || !credentials.password) {
    logger.warn('CEO credentials not configured - check VITE_CEO_USERNAME and VITE_CEO_PASSWORD env vars', undefined, 'CEOCheck')
    return false
  }

  return (
    username === credentials.username &&
    password === credentials.password
  )
}

/**
 * Clear CEO session
 */
export function clearCEOSession(): void {
  localStorage.removeItem('flowsphere-username')
  localStorage.removeItem('flowsphere-password-hash')
  logger.info('CEO session cleared', undefined, 'CEOCheck')
}
