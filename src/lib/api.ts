/**
 * FlowSphere API Client
 * Handles all communication with the backend server
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
        message: data.message,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('API request failed:', error)
    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Failed to connect to server',
    }
  }
}

/**
 * OAuth API
 */
export const authApi = {
  /**
   * Get OAuth providers list
   */
  async getProviders() {
    return apiFetch<{ providers: Array<{ id: string; name: string; enabled: boolean; icon: string }> }>(
      '/auth/providers'
    )
  },

  /**
   * Initiate OAuth flow - redirects to provider
   */
  initiateOAuth(provider: string, redirectTo?: string) {
    const url = new URL(`${API_URL}/auth/${provider}`)
    if (redirectTo) {
      url.searchParams.set('redirect', redirectTo)
    }
    window.location.href = url.toString()
  },

  /**
   * Complete OAuth flow - exchange token for account data
   */
  async completeOAuth(token: string) {
    return apiFetch<{
      account: {
        id: string
        provider: string
        email: string
        name: string
        picture?: string
        accessToken: string
        refreshToken: string
        expiresAt: number
        isActive: boolean
        connectedAt: string
      }
    }>('/auth/complete', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  /**
   * Refresh access token
   */
  async refreshToken(provider: string, refreshToken: string) {
    return apiFetch<{
      accessToken: string
      refreshToken: string
      expiresAt: number
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ provider, refreshToken }),
    })
  },
}

/**
 * Health check
 */
export async function checkApiHealth() {
  return apiFetch<{ status: string; timestamp: string }>('/health')
}

/**
 * Get API URL for external use
 */
export function getApiUrl() {
  return API_URL
}
