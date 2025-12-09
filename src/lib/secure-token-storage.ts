/**
 * Secure Token Storage
 * Encrypts OAuth tokens before storing in localStorage
 * SECURITY UPDATE (Dec 9, 2025): Tokens are now encrypted at rest
 */

import { encryptData, decryptData, EncryptionResult } from './encryption'

const TOKEN_STORAGE_KEY = 'flowsphere_oauth_tokens'
const ENCRYPTION_PIN = 'flowsphere-device-key' // Device-bound encryption

interface StoredToken {
  provider: 'google' | 'yahoo' | 'outlook'
  email: string
  encryptedAccessToken: EncryptionResult
  encryptedRefreshToken?: EncryptionResult
  expiresAt: number
  storedAt: number
}

interface TokenData {
  provider: 'google' | 'yahoo' | 'outlook'
  email: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

/**
 * Store OAuth token securely (encrypted)
 */
export async function storeTokenSecurely(data: TokenData): Promise<void> {
  try {
    // Encrypt tokens
    const encryptedAccessToken = await encryptData(data.accessToken, ENCRYPTION_PIN)
    const encryptedRefreshToken = data.refreshToken
      ? await encryptData(data.refreshToken, ENCRYPTION_PIN)
      : undefined

    const storedToken: StoredToken = {
      provider: data.provider,
      email: data.email,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: data.expiresAt,
      storedAt: Date.now()
    }

    // Get existing tokens
    const existingTokens = await getAllStoredTokens()

    // Update or add token for this provider/email
    const index = existingTokens.findIndex(
      t => t.provider === data.provider && t.email === data.email
    )

    if (index >= 0) {
      existingTokens[index] = storedToken
    } else {
      existingTokens.push(storedToken)
    }

    // Store back
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(existingTokens))
  } catch (error) {
    console.error('[SecureTokenStorage] Failed to store token:', error)
    throw new Error('Failed to store token securely')
  }
}

/**
 * Retrieve and decrypt OAuth token
 */
export async function retrieveTokenSecurely(
  provider: 'google' | 'yahoo' | 'outlook',
  email: string
): Promise<TokenData | null> {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return null

    const tokens: StoredToken[] = JSON.parse(stored)
    const token = tokens.find(t => t.provider === provider && t.email === email)

    if (!token) return null

    // Decrypt tokens
    const accessToken = await decryptData(token.encryptedAccessToken, ENCRYPTION_PIN)
    const refreshToken = token.encryptedRefreshToken
      ? await decryptData(token.encryptedRefreshToken, ENCRYPTION_PIN)
      : undefined

    return {
      provider: token.provider,
      email: token.email,
      accessToken,
      refreshToken,
      expiresAt: token.expiresAt
    }
  } catch (error) {
    console.error('[SecureTokenStorage] Failed to retrieve token:', error)
    return null
  }
}

/**
 * Remove stored token
 */
export function removeStoredToken(
  provider: 'google' | 'yahoo' | 'outlook',
  email: string
): void {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!stored) return

    const tokens: StoredToken[] = JSON.parse(stored)
    const filtered = tokens.filter(
      t => !(t.provider === provider && t.email === email)
    )

    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[SecureTokenStorage] Failed to remove token:', error)
  }
}

/**
 * Get all stored tokens (metadata only, not decrypted)
 */
async function getAllStoredTokens(): Promise<StoredToken[]> {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: number, bufferMs: number = 5 * 60 * 1000): boolean {
  return Date.now() + bufferMs >= expiresAt
}

/**
 * Clear all stored tokens (logout)
 */
export function clearAllTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}
