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
  private codeVerifier: string | null = null

  constructor() {
    super()
    // Only client ID is needed in frontend (it's public)
    this.clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID || ''
    this.redirectUri = `${window.location.origin}/auth/outlook/callback`
  }

  /**
   * Generate PKCE code verifier and challenge
   * Required by Microsoft for SPA OAuth flows
   */
  private async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    // Generate random code verifier (43-128 characters)
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const codeVerifier = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')

    // Generate code challenge using SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)

    // Base64url encode the hash
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    const codeChallenge = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return { codeVerifier, codeChallenge }
  }

  /**
   * Get OAuth authorization URL with PKCE
   * Microsoft OAuth2 requires PKCE for SPA applications
   */
  async getAuthUrlAsync(): Promise<string> {
    // Debug: Log client ID to verify it's being loaded
    console.log('[Outlook OAuth] Client ID:', this.clientId ? `${this.clientId.substring(0, 8)}...` : 'MISSING')
    console.log('[Outlook OAuth] Redirect URI:', this.redirectUri)

    if (!this.clientId) {
      console.error('[Outlook OAuth] ERROR: VITE_OUTLOOK_CLIENT_ID is not set!')
      throw new Error('Outlook OAuth not configured - missing client ID')
    }

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await this.generatePKCE()

    // Store code verifier for token exchange (will be retrieved later)
    this.codeVerifier = codeVerifier
    sessionStorage.setItem('outlook_pkce_verifier', codeVerifier)
    console.log('[Outlook OAuth] PKCE code verifier stored')

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: [
        'openid',
        'profile',
        'email',
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access'
      ].join(' '),
      // Add state for CSRF protection
      state: Math.random().toString(36).substring(2),
      // PKCE parameters - required by Microsoft for SPAs
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
    console.log('[Outlook OAuth] Auth URL generated with PKCE')

    return authUrl
  }

  /**
   * Sync version for backwards compatibility - redirects to async version
   */
  getAuthUrl(): string {
    // This is called synchronously, so we need to handle PKCE differently
    // We'll generate PKCE and redirect in one go
    throw new Error('Use getAuthUrlAsync() for Outlook OAuth - PKCE is required')
  }

  /**
   * Exchange authorization code for tokens via Edge Function (secure)
   * Includes PKCE code_verifier for Microsoft OAuth
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    console.log('[Outlook OAuth] Starting token exchange...')
    console.log('[Outlook OAuth] Redirect URI:', this.redirectUri)
    console.log('[Outlook OAuth] Edge Function URL:', OAUTH_EDGE_FUNCTION)

    // Retrieve PKCE code verifier from session storage
    const codeVerifier = sessionStorage.getItem('outlook_pkce_verifier')
    console.log('[Outlook OAuth] PKCE code verifier retrieved:', codeVerifier ? 'yes' : 'no')

    if (!codeVerifier) {
      throw new Error('PKCE code verifier not found. Please try connecting again.')
    }

    // Use Edge Function to keep client_secret server-side
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
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
            codeVerifier, // PKCE code verifier for Microsoft
          }),
        })

        console.log('[Outlook OAuth] Edge Function response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[Outlook OAuth] Edge Function error response:', errorText)

          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText }
          }

          // Provide more specific error messages
          const errorMsg = errorData.error_description || errorData.error || errorData.details?.error_description || 'Token exchange failed'
          throw new Error(errorMsg)
        }

        const data = await response.json()
        console.log('[Outlook OAuth] Token exchange successful')

        if (!data.accessToken) {
          console.error('[Outlook OAuth] No access token in response:', data)
          throw new Error('No access token received from server')
        }

        return {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || '',
          expiresIn: data.expiresIn || 3600
        }
      } catch (fetchError) {
        console.error('[Outlook OAuth] Fetch error:', fetchError)
        throw fetchError
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
