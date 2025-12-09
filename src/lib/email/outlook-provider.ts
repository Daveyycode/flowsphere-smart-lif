/**
 * Outlook Provider - Microsoft Graph API integration
 * SECURITY UPDATE (Dec 9, 2025): OAuth token exchange now uses Edge Function
 * Client secret is kept server-side, never exposed to frontend
 */

import { EmailProvider, EmailAccount, Email, SearchOptions, SearchResult } from './email-service'

// Supabase Edge Function for secure OAuth
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const OAUTH_EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/oauth-exchange`

export class OutlookProvider extends EmailProvider {
  private clientId: string
  private redirectUri: string

  constructor() {
    super()
    // Only client ID is needed in frontend (it's public)
    this.clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID || ''
    this.redirectUri = `${window.location.origin}/auth/outlook/callback`
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ].join(' ')
    })

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
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
          provider: 'outlook',
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
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const data = await response.json()
    return {
      email: data.mail || data.userPrincipalName,
      name: data.displayName || data.userPrincipalName
    }
  }

  /**
   * Search emails
   */
  async searchEmails(account: EmailAccount, options: SearchOptions): Promise<SearchResult> {
    const filter = this.buildOutlookFilter(options)
    const maxResults = options.maxResults || 50

    let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$orderby=receivedDateTime DESC`
    if (filter) {
      url += `&$filter=${encodeURIComponent(filter)}`
    }
    if (options.pageToken) {
      url = options.pageToken
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Prefer: 'outlook.body-content-type="text"'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        const refreshedAccount = await this.refreshAccessToken(account)
        return this.searchEmails(refreshedAccount, options)
      }
      throw new Error('Failed to search emails')
    }

    const data = await response.json()
    const emails: Email[] = data.value.map((msg: any) => this.parseOutlookMessage(msg))

    return {
      emails,
      nextPageToken: data['@odata.nextLink'],
      totalResults: data.value.length
    }
  }

  /**
   * Build Outlook filter query
   */
  private buildOutlookFilter(options: SearchOptions): string {
    const filters: string[] = []

    if (options.from) {
      filters.push(`from/emailAddress/address eq '${options.from}'`)
    }
    if (options.to) {
      filters.push(`toRecipients/any(r: r/emailAddress/address eq '${options.to}')`)
    }
    if (options.subject) {
      filters.push(`contains(subject, '${options.subject}')`)
    }
    if (options.isUnread) {
      filters.push('isRead eq false')
    }
    if (options.after) {
      const afterDate = new Date(options.after).toISOString()
      filters.push(`receivedDateTime ge ${afterDate}`)
    }
    if (options.before) {
      const beforeDate = new Date(options.before).toISOString()
      filters.push(`receivedDateTime le ${beforeDate}`)
    }
    if (options.hasAttachment) {
      filters.push('hasAttachments eq true')
    }

    return filters.join(' and ')
  }

  /**
   * Parse Outlook message to Email object
   */
  private parseOutlookMessage(outlookMsg: any): Email {
    return {
      id: outlookMsg.id,
      provider: 'outlook',
      from: {
        name: outlookMsg.from?.emailAddress?.name || '',
        email: outlookMsg.from?.emailAddress?.address || ''
      },
      to: outlookMsg.toRecipients?.map((r: any) => ({
        email: r.emailAddress?.address || '',
        name: r.emailAddress?.name
      })) || [],
      subject: outlookMsg.subject || '',
      body: outlookMsg.body?.content || '',
      htmlBody: outlookMsg.body?.contentType === 'html' ? outlookMsg.body?.content : undefined,
      snippet: outlookMsg.bodyPreview || '',
      timestamp: outlookMsg.receivedDateTime,
      read: outlookMsg.isRead,
      labels: outlookMsg.categories || [],
      attachments: outlookMsg.hasAttachments
        ? outlookMsg.attachments?.map((a: any) => ({
            id: a.id,
            filename: a.name,
            mimeType: a.contentType,
            size: a.size
          }))
        : undefined
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
      subject: email.subject,
      body: {
        contentType: email.html ? 'HTML' : 'Text',
        content: email.html || email.body
      },
      toRecipients: email.to.map(e => ({
        emailAddress: {
          address: e
        }
      }))
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
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
          provider: 'outlook',
          action: 'refresh',
          refreshToken: account.refreshToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorCode = errorData.error || 'unknown_error'
        console.error('[Outlook] Token refresh failed:', errorCode)
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
    const afterDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const result = await this.searchEmails(account, {
      after: afterDate,
      maxResults: 100
    })

    return result.emails
  }
}
