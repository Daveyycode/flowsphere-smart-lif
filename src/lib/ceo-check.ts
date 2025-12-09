/**
 * CEO Authentication Check
 * Verifies if the current logged-in user is the CEO
 *
 * SECURITY UPDATE (Dec 9, 2025):
 * - Credentials now verified SERVER-SIDE via Supabase Edge Function
 * - NO credentials stored in frontend code or environment variables
 * - Session tokens stored securely in localStorage
 * - All authentication happens through /functions/v1/ceo-auth
 */

import { logger } from '@/lib/security-utils'

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const CEO_AUTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/ceo-auth`
const SESSION_STORAGE_KEY = 'flowsphere-ceo-session'

interface CEOSession {
  sessionToken: string
  expiresAt: string
  email?: string
}

/**
 * Get stored CEO session
 */
function getStoredSession(): CEOSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null

    const session = JSON.parse(stored) as CEOSession

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return session
  } catch {
    return null
  }
}

/**
 * Store CEO session
 */
function storeSession(session: CEOSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

/**
 * Check if current user is CEO based on valid session
 */
export function isCEOUser(): boolean {
  const session = getStoredSession()
  return session !== null
}

/**
 * Verify CEO session with server (async check)
 */
export async function verifyCEOSession(): Promise<boolean> {
  const session = getStoredSession()
  if (!session) return false

  try {
    const response = await fetch(CEO_AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        sessionToken: session.sessionToken,
      }),
    })

    const data = await response.json()

    if (!data.valid) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return false
    }

    return true
  } catch (error) {
    logger.error('CEO session verification failed', error, 'CEOCheck')
    return false
  }
}

/**
 * Login as CEO - credentials verified SERVER-SIDE
 * @param username - The CEO username (6-digit code)
 * @param password - The CEO password
 * @returns Success status and session info
 */
export async function loginAsCEO(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; email?: string }> {

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.error('Supabase not configured', undefined, 'CEOCheck')
    return { success: false, error: 'Server not configured' }
  }

  try {
    const response = await fetch(CEO_AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        username,
        password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.warn('CEO login failed', { error: data.error }, 'CEOCheck')
      return { success: false, error: data.error || 'Login failed' }
    }

    // Store session
    storeSession({
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
      email: data.email,
    })

    logger.info('CEO logged in successfully', undefined, 'CEOCheck')
    return { success: true, email: data.email }
  } catch (error) {
    logger.error('CEO login error', error, 'CEOCheck')
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * Verify credentials without creating session (for validation)
 * Note: This still goes through server - no client-side credential check
 */
export async function verifyCEOCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const result = await loginAsCEO(username, password)

  // If login succeeded, we now have a session
  // For just verification, we could logout after, but keeping session is fine
  return result.success
}

/**
 * Logout CEO and clear session
 */
export async function logoutCEO(): Promise<void> {
  const session = getStoredSession()

  if (session) {
    try {
      await fetch(CEO_AUTH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout',
          sessionToken: session.sessionToken,
        }),
      })
    } catch (error) {
      logger.error('CEO logout error', error, 'CEOCheck')
    }
  }

  localStorage.removeItem(SESSION_STORAGE_KEY)
  logger.info('CEO session cleared', undefined, 'CEOCheck')
}

/**
 * Clear CEO session (alias for backward compatibility)
 */
export function clearCEOSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  logger.info('CEO session cleared', undefined, 'CEOCheck')
}

/**
 * Get CEO email from session (if available)
 */
export function getCEOEmail(): string | null {
  const session = getStoredSession()
  return session?.email || null
}

/**
 * Request username rotation (generates new 6-digit code)
 * Returns new username - must be manually updated in Supabase secrets
 */
export async function rotateCEOUsername(): Promise<{ success: boolean; newUsername?: string; error?: string }> {
  const session = getStoredSession()

  if (!session) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const response = await fetch(CEO_AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'rotate',
        sessionToken: session.sessionToken,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error }
    }

    return { success: true, newUsername: data.newUsername }
  } catch (error) {
    logger.error('CEO username rotation error', error, 'CEOCheck')
    return { success: false, error: 'Network error' }
  }
}

// ============================================
// BACKWARD COMPATIBILITY (Deprecated)
// These functions are kept for existing code
// but will use the new server-side auth
// ============================================

/**
 * @deprecated Use loginAsCEO() instead
 * Store CEO credentials after successful login
 */
export async function storeCEOSession(username: string, password: string): Promise<boolean> {
  const result = await loginAsCEO(username, password)
  return result.success
}
