/**
 * Gmail API Integration
 * Connects to Gmail API and fetches emails for scanning
 */

import {
  scanEmails,
  detectSubscriptions,
  generateEmailInsights,
  type EmailMessage,
} from './email-scanner'
import { logger } from '@/lib/security-utils'

// Gmail API Configuration
const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
]

export interface GmailConfig {
  clientId: string
  apiKey: string
  clientSecret?: string
}

export interface GmailAuthToken {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  expires_at: number
}

export class GmailAPIService {
  private config: GmailConfig
  private token: GmailAuthToken | null = null
  private tokenClient: any = null

  constructor(config?: GmailConfig) {
    this.config = config || {
      clientId: import.meta.env.VITE_GMAIL_CLIENT_ID || '',
      apiKey: import.meta.env.VITE_GMAIL_API_KEY || '',
      clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET || '',
    }

    this.loadTokenFromStorage()
  }

  /**
   * Initialize Google OAuth2 client
   */
  async initialize(): Promise<void> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new Error('Gmail API credentials not configured. Please add them to .env file.')
    }

    // Load Google Identity Services library
    await this.loadGoogleIdentityServices()

    // Initialize token client
    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.config.clientId,
      scope: SCOPES.join(' '),
      callback: (response: any) => {
        if (response.error) {
          logger.error('OAuth error', response.error, 'GmailAPI')
          throw new Error(response.error)
        }

        this.token = {
          access_token: response.access_token,
          expires_in: response.expires_in || 3600,
          token_type: response.token_type || 'Bearer',
          scope: response.scope,
          expires_at: Date.now() + response.expires_in * 1000,
        }

        this.saveTokenToStorage()
      },
    })
  }

  /**
   * Load Google Identity Services library
   */
  private async loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  /**
   * Authenticate with Gmail
   */
  async authenticate(): Promise<void> {
    if (!this.tokenClient) {
      await this.initialize()
    }

    // Check if token is valid
    if (this.token && this.token.expires_at > Date.now()) {
      return
    }

    // Request new token
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'))
        return
      }

      // Update callback to resolve promise
      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }

        this.token = {
          access_token: response.access_token,
          expires_in: response.expires_in || 3600,
          token_type: response.token_type || 'Bearer',
          scope: response.scope,
          expires_at: Date.now() + response.expires_in * 1000,
        }

        this.saveTokenToStorage()
        resolve()
      }

      this.tokenClient.requestAccessToken({ prompt: 'consent' })
    })
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.token.expires_at > Date.now()
  }

  /**
   * Get connection status with details
   */
  getConnectionStatus(): {
    connected: boolean
    expired: boolean
    expiresAt: Date | null
    minutesRemaining: number | null
  } {
    if (!this.token) {
      return { connected: false, expired: false, expiresAt: null, minutesRemaining: null }
    }

    const now = Date.now()
    const expired = this.token.expires_at <= now
    const expiresAt = new Date(this.token.expires_at)
    const minutesRemaining = expired ? 0 : Math.floor((this.token.expires_at - now) / 60000)

    return { connected: !expired, expired, expiresAt, minutesRemaining }
  }

  /**
   * Force reconnect - clears token and prompts for new authentication
   */
  async reconnect(): Promise<void> {
    logger.info('Forcing reconnect', null, 'GmailAPI')
    this.token = null
    this.clearTokenFromStorage()
    await this.authenticate()
  }

  /**
   * Revoke authentication
   */
  async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.token.access_token}`, {
          method: 'POST',
        })
      } catch (error) {
        logger.error('Error revoking token', error, 'GmailAPI')
      }
    }

    this.token = null
    this.clearTokenFromStorage()
  }

  /**
   * Fetch emails from Gmail
   */
  async fetchEmails(maxResults: number = 50, query: string = ''): Promise<EmailMessage[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please call authenticate() first.')
    }

    try {
      // Get message IDs
      const listResponse = await this.makeRequest(
        `/users/me/messages?maxResults=${maxResults}${query ? `&q=${encodeURIComponent(query)}` : ''}`
      )

      if (!listResponse.messages || listResponse.messages.length === 0) {
        return []
      }

      // Fetch full message details
      const messages = await Promise.all(
        listResponse.messages.map((msg: any) =>
          this.makeRequest(`/users/me/messages/${msg.id}?format=full`)
        )
      )

      // Convert to our email format
      const emails = messages.map(msg => this.parseGmailMessage(msg))

      // Scan and categorize emails
      return scanEmails(emails)
    } catch (error) {
      logger.error('Error fetching emails', error, 'GmailAPI')
      throw error
    }
  }

  /**
   * Fetch unread emails
   */
  async fetchUnreadEmails(maxResults: number = 50): Promise<EmailMessage[]> {
    return this.fetchEmails(maxResults, 'is:unread')
  }

  /**
   * Fetch emails by category
   */
  async fetchEmailsByCategory(category: string, maxResults: number = 50): Promise<EmailMessage[]> {
    const categoryQueries: Record<string, string> = {
      social: 'category:social',
      promotions: 'category:promotions',
      updates: 'category:updates',
      forums: 'category:forums',
      primary: 'category:primary',
    }

    const query = categoryQueries[category.toLowerCase()] || ''
    return this.fetchEmails(maxResults, query)
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    await this.makeRequest(`/users/me/messages/${emailId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    })
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(emailId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    await this.makeRequest(`/users/me/messages/${emailId}/modify`, {
      method: 'POST',
      body: JSON.stringify({
        addLabelIds: ['UNREAD'],
      }),
    })
  }

  /**
   * Make authenticated request to Gmail API
   * Automatically handles token expiry and re-authentication
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<any> {
    // Check if token is expired or missing
    if (!this.token || this.token.expires_at <= Date.now()) {
      // Token expired - try to re-authenticate silently
      logger.info('Token expired, attempting re-authentication', null, 'GmailAPI')
      try {
        await this.authenticate()
      } catch (authError) {
        this.clearTokenFromStorage()
        throw new Error('Gmail session expired. Please reconnect your Gmail account.')
      }
    }

    if (!this.token) {
      throw new Error('Gmail not connected. Please connect your Gmail account.')
    }

    const url = endpoint.startsWith('http') ? endpoint : `${GMAIL_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `${this.token.token_type} ${this.token.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Handle 401 Unauthorized - token might be revoked
    if (response.status === 401 && retryCount < 1) {
      logger.info('Received 401, clearing token and retrying', null, 'GmailAPI')
      this.token = null
      this.clearTokenFromStorage()
      return this.makeRequest(endpoint, options, retryCount + 1)
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: 'Gmail API request failed' } }))

      // Provide user-friendly error messages
      if (response.status === 401) {
        throw new Error('Gmail session expired. Please reconnect your Gmail account.')
      } else if (response.status === 403) {
        throw new Error('Gmail access denied. Please check your permissions.')
      }

      throw new Error(error.error?.message || 'Gmail API request failed')
    }

    return response.json()
  }

  /**
   * Parse Gmail message to our format
   */
  private parseGmailMessage(message: any): {
    id: string
    from: string
    subject: string
    body: string
    timestamp: string
    read: boolean
  } {
    const headers = message.payload.headers
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    // Extract body
    let body = ''
    if (message.payload.body.data) {
      body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain')
      if (textPart?.body.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      }
    }

    return {
      id: message.id,
      from: getHeader('From'),
      subject: getHeader('Subject'),
      body: body || 'No body content',
      timestamp: new Date(parseInt(message.internalDate)).toISOString(),
      read: !message.labelIds?.includes('UNREAD'),
    }
  }

  /**
   * Save token to localStorage
   */
  private saveTokenToStorage(): void {
    if (this.token) {
      localStorage.setItem('flowsphere-gmail-token', JSON.stringify(this.token))
    }
  }

  /**
   * Load token from localStorage
   */
  private loadTokenFromStorage(): void {
    try {
      const saved = localStorage.getItem('flowsphere-gmail-token')
      if (saved) {
        this.token = JSON.parse(saved)

        // Check if expired
        if (this.token && this.token.expires_at <= Date.now()) {
          this.token = null
          this.clearTokenFromStorage()
        }
      }
    } catch (error) {
      logger.error('Error loading token', error, 'GmailAPI')
    }
  }

  /**
   * Clear token from localStorage
   */
  private clearTokenFromStorage(): void {
    localStorage.removeItem('flowsphere-gmail-token')
  }
}

// Global instance
let globalGmailService: GmailAPIService | null = null

/**
 * Get or create global Gmail service
 */
export function getGmailService(): GmailAPIService {
  if (!globalGmailService) {
    globalGmailService = new GmailAPIService()
  }
  return globalGmailService
}

/**
 * Quick helper to fetch and analyze emails
 */
export async function fetchAndAnalyzeEmails(maxResults: number = 50) {
  const gmail = getGmailService()

  if (!gmail.isAuthenticated()) {
    await gmail.authenticate()
  }

  const emails = await gmail.fetchEmails(maxResults)
  const subscriptions = detectSubscriptions(emails)
  const insights = generateEmailInsights(emails, subscriptions)

  return {
    emails,
    subscriptions,
    insights,
  }
}
