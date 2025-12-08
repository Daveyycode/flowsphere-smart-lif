/**
 * Yahoo Mail Provider - Yahoo Mail API integration
 */

import { EmailProvider, EmailAccount, Email, SearchOptions, SearchResult } from './email-service'

export class YahooProvider extends EmailProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    super()
    this.clientId = import.meta.env.VITE_YAHOO_CLIENT_ID || ''
    this.clientSecret = import.meta.env.VITE_YAHOO_CLIENT_SECRET || ''
    this.redirectUri = `${window.location.origin}/auth/yahoo/callback`
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'mail-r mail-w'
    })

    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    }
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
   * Refresh access token
   */
  async refreshAccessToken(account: EmailAccount): Promise<EmailAccount> {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    const data = await response.json()

    return {
      ...account,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000
    }
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
