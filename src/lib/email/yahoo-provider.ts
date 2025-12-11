/**
 * Yahoo Mail Provider - Yahoo Mail API integration
 * SECURITY UPDATE (Dec 9, 2025): OAuth token exchange now uses Edge Function
 * Client secret is kept server-side, never exposed to frontend
 */

import { EmailProvider, EmailAccount, Email, SearchOptions, SearchResult } from './email-service'

// Supabase Edge Function for secure OAuth
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const OAUTH_EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/oauth-exchange`

export class YahooProvider extends EmailProvider {
  private clientId: string
  private redirectUri: string

  constructor() {
    super()
    // Only client ID is needed in frontend (it's public)
    this.clientId = import.meta.env.VITE_YAHOO_CLIENT_ID || ''
    this.redirectUri = `${window.location.origin}/auth/yahoo/callback`
  }

  /**
   * Get OAuth authorization URL
   * Yahoo OAuth2 requires specific scopes and parameters
   */
  getAuthUrl(): string {
    // Debug: Log client ID to verify it's being loaded
    console.log('[Yahoo OAuth] Client ID:', this.clientId ? `${this.clientId.substring(0, 10)}...` : 'MISSING')
    console.log('[Yahoo OAuth] Redirect URI:', this.redirectUri)

    if (!this.clientId) {
      console.error('[Yahoo OAuth] ERROR: VITE_YAHOO_CLIENT_ID is not set!')
      throw new Error('Yahoo OAuth not configured - missing client ID')
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      // Yahoo uses 'openid' based scopes - mail-r/mail-w may not work
      // Using profile + email + mail scopes
      scope: 'openid profile email',
      // Add nonce for security
      nonce: Math.random().toString(36).substring(2)
    })

    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens via Edge Function (secure)
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    // Use Edge Function to keep client_secret server-side
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const response = await fetch(OAUTH_EDGE_FUNCTION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'yahoo',
          action: 'exchange',
          code,
          redirectUri: this.redirectUri,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to exchange code for tokens')
      }

      const data = await response.json()
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      }
    }

    throw new Error('OAuth service not configured. Deploy the oauth-exchange Edge Function.')
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const data = await response.json()
    return {
      email: data.email,
      name: data.name || data.email
    }
  }

  /**
   * Search emails
   */
  async searchEmails(account: EmailAccount, options: SearchOptions): Promise<SearchResult> {
    const query = this.buildYahooQuery(options)
    const maxResults = options.maxResults || 50

    const response = await fetch(
      `https://api.mail.yahoo.com/ws/v3/mailboxes/@/messages?q=${encodeURIComponent(query)}&count=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        const refreshedAccount = await this.refreshAccessToken(account)
        return this.searchEmails(refreshedAccount, options)
      }
      throw new Error('Failed to search emails')
    }

    const data = await response.json()
    const emails: Email[] = []

    if (data.messages) {
      for (const msg of data.messages) {
        const email = await this.parseYahooMessage(msg, account)
        if (email) emails.push(email)
      }
    }

    return {
      emails,
      nextPageToken: data.nextPageToken,
      totalResults: data.total || 0
    }
  }

  /**
   * Build Yahoo query from options
   */
  private buildYahooQuery(options: SearchOptions): string {
    const parts: string[] = []

    if (options.query) parts.push(options.query)
    if (options.from) parts.push(`from:${options.from}`)
    if (options.to) parts.push(`to:${options.to}`)
    if (options.subject) parts.push(`subject:${options.subject}`)
    if (options.isUnread) parts.push('is:unread')

    return parts.join(' ') || 'in:inbox'
  }

  /**
   * Parse Yahoo message to Email object
   */
  private async parseYahooMessage(yahooMsg: any, account: EmailAccount): Promise<Email | null> {
    try {
      return {
        id: yahooMsg.id,
        provider: 'yahoo',
        from: {
          name: yahooMsg.from?.name || yahooMsg.from?.email || '',
          email: yahooMsg.from?.email || ''
        },
        to: yahooMsg.to ? yahooMsg.to.map((t: any) => ({ email: t.email, name: t.name })) : [],
        subject: yahooMsg.subject || '',
        body: yahooMsg.body?.text || '',
        htmlBody: yahooMsg.body?.html,
        snippet: yahooMsg.snippet || '',
        timestamp: new Date(yahooMsg.receivedDate).toISOString(),
        read: !yahooMsg.flags?.includes('\\Unseen'),
        labels: yahooMsg.folderIds || []
      }
    } catch (error) {
      console.error('Failed to parse Yahoo message:', error)
      return null
    }
  }

  /**
   * Send email
   */
  async sendEmail(
    account: EmailAccount,
    email: { to: string[]; subject: string; body: string; html?: string }
  ): Promise<void> {
    const message = {
      to: email.to.map(e => ({ email: e })),
      subject: email.subject,
      body: {
        text: email.body,
        html: email.html || email.body
      }
    }

    const response = await fetch('https://api.mail.yahoo.com/ws/v3/mailboxes/@/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error('Failed to send email')
    }
  }

  /**
   * Refresh access token via Edge Function (secure)
   */
  async refreshAccessToken(account: EmailAccount): Promise<EmailAccount> {
    if (!account.refreshToken) {
      throw new Error('invalid_grant: No refresh token available')
    }

    // Use Edge Function to keep client_secret server-side
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const response = await fetch(OAUTH_EDGE_FUNCTION, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'yahoo',
          action: 'refresh',
          refreshToken: account.refreshToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorCode = errorData.error || 'unknown_error'
        console.error('[Yahoo] Token refresh failed:', errorCode)
        throw new Error(`${errorCode}: Failed to refresh token`)
      }

      const data = await response.json()

      return {
        ...account,
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000
      }
    }

    throw new Error('OAuth service not configured')
  }

  /**
   * Get new emails since timestamp
   */
  async getNewEmails(account: EmailAccount, since?: string): Promise<Email[]> {
    const afterDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const result = await this.searchEmails(account, {
      after: afterDate,
      maxResults: 100
    })

    return result.emails
  }
}
