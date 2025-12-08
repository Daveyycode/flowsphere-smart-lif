/**
 * Gmail Provider - Gmail API integration
 */

import { EmailProvider, EmailAccount, Email, SearchOptions, SearchResult } from './email-service'

export class GmailProvider extends EmailProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    super()
    // These will be set from environment variables
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
    this.clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || ''
    this.redirectUri = `${window.location.origin}/auth/gmail/callback`
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
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
   * Get user profile info
   */
  async getUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
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
      name: data.name
    }
  }

  /**
   * Search emails
   */
  async searchEmails(account: EmailAccount, options: SearchOptions): Promise<SearchResult> {
    // Build Gmail query string
    const queryParts: string[] = []

    if (options.query) queryParts.push(options.query)
    if (options.from) queryParts.push(`from:${options.from}`)
    if (options.to) queryParts.push(`to:${options.to}`)
    if (options.subject) queryParts.push(`subject:${options.subject}`)
    if (options.after) queryParts.push(`after:${options.after}`)
    if (options.before) queryParts.push(`before:${options.before}`)
    if (options.hasAttachment) queryParts.push('has:attachment')
    if (options.isUnread) queryParts.push('is:unread')

    const query = queryParts.join(' ')
    const maxResults = options.maxResults || 50

    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    })

    if (options.pageToken) {
      params.append('pageToken', options.pageToken)
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, refresh it
        const refreshedAccount = await this.refreshAccessToken(account)
        return this.searchEmails(refreshedAccount, options)
      }
      throw new Error('Failed to search emails')
    }

    const data = await response.json()

    // Fetch full message details for each result
    const emails: Email[] = []
    if (data.messages) {
      for (const msg of data.messages.slice(0, maxResults)) {
        try {
          const email = await this.getEmailById(account, msg.id)
          if (email) emails.push(email)
        } catch (err) {
          console.error('Failed to fetch email:', err)
        }
      }
    }

    return {
      emails,
      nextPageToken: data.nextPageToken,
      totalResults: data.resultSizeEstimate || 0
    }
  }

  /**
   * Get email by ID
   */
  private async getEmailById(account: EmailAccount, messageId: string): Promise<Email | null> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    return this.parseGmailMessage(data)
  }

  /**
   * Parse Gmail API response to Email object
   */
  private parseGmailMessage(gmailMsg: any): Email {
    const headers = gmailMsg.payload.headers
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    const from = getHeader('From')
    const fromMatch = from.match(/(.+?)\s*<(.+?)>/) || [null, from, from]

    return {
      id: gmailMsg.id,
      threadId: gmailMsg.threadId,
      provider: 'gmail',
      from: {
        name: fromMatch[1]?.trim() || '',
        email: fromMatch[2]?.trim() || from
      },
      to: [{ email: getHeader('To') }],
      subject: getHeader('Subject'),
      body: this.extractBody(gmailMsg.payload),
      snippet: gmailMsg.snippet,
      timestamp: new Date(parseInt(gmailMsg.internalDate)).toISOString(),
      read: !gmailMsg.labelIds?.includes('UNREAD'),
      labels: gmailMsg.labelIds || []
    }
  }

  /**
   * Extract email body from Gmail payload
   */
  private extractBody(payload: any): string {
    if (payload.body?.data) {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        }
      }
    }

    return ''
  }

  /**
   * Send email with optional attachments
   */
  async sendEmail(
    account: EmailAccount,
    email: {
      to: string[]
      subject: string
      body: string
      html?: string
      attachments?: Array<{
        filename: string
        mimeType: string
        data: string // Base64 encoded
      }>
      replyToMessageId?: string // For replies - references original message
      threadId?: string // Keep in same thread
    }
  ): Promise<{ id: string; threadId: string }> {
    let message: string

    if (email.attachments && email.attachments.length > 0) {
      // Build MIME multipart message with attachments
      const boundary = `boundary_${Date.now()}`
      const parts: string[] = []

      // Email headers
      parts.push(`To: ${email.to.join(', ')}`)
      parts.push('From: me')
      parts.push(`Subject: ${email.subject}`)

      // Reply headers if this is a reply
      if (email.replyToMessageId) {
        parts.push(`In-Reply-To: ${email.replyToMessageId}`)
        parts.push(`References: ${email.replyToMessageId}`)
      }

      parts.push('MIME-Version: 1.0')
      parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
      parts.push('')
      parts.push(`--${boundary}`)

      // Email body
      parts.push('Content-Type: text/html; charset=utf-8')
      parts.push('')
      parts.push(email.html || email.body)

      // Attachments
      for (const attachment of email.attachments) {
        parts.push('')
        parts.push(`--${boundary}`)
        parts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`)
        parts.push('Content-Transfer-Encoding: base64')
        parts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`)
        parts.push('')
        parts.push(attachment.data)
      }

      parts.push('')
      parts.push(`--${boundary}--`)
      message = parts.join('\r\n')
    } else {
      // Simple message without attachments
      const parts: string[] = [
        `To: ${email.to.join(', ')}`,
        'From: me',
        `Subject: ${email.subject}`
      ]

      // Reply headers if this is a reply
      if (email.replyToMessageId) {
        parts.push(`In-Reply-To: ${email.replyToMessageId}`)
        parts.push(`References: ${email.replyToMessageId}`)
      }

      parts.push('Content-Type: text/html; charset=utf-8')
      parts.push('')
      parts.push(email.html || email.body)

      message = parts.join('\r\n')
    }

    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const requestBody: { raw: string; threadId?: string } = { raw: encodedMessage }
    if (email.threadId) {
      requestBody.threadId = email.threadId
    }

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[Gmail] Send failed:', errorData)
      throw new Error('Failed to send email')
    }

    const result = await response.json()
    return { id: result.id, threadId: result.threadId }
  }

  /**
   * Reply to an email (keeps thread)
   */
  async replyToEmail(
    account: EmailAccount,
    originalEmail: Email,
    replyBody: string,
    attachments?: Array<{
      filename: string
      mimeType: string
      data: string
    }>
  ): Promise<{ id: string; threadId: string }> {
    // Build reply subject
    const subject = originalEmail.subject.startsWith('Re:')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`

    // Get original sender as recipient
    const to = [originalEmail.from.email]

    return this.sendEmail(account, {
      to,
      subject,
      body: replyBody,
      html: replyBody,
      attachments,
      replyToMessageId: originalEmail.id,
      threadId: originalEmail.threadId
    })
  }

  /**
   * Get attachment data by ID
   */
  async getAttachment(
    account: EmailAccount,
    messageId: string,
    attachmentId: string
  ): Promise<{ data: string; size: number }> {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get attachment')
    }

    const data = await response.json()
    return {
      data: data.data, // Base64 encoded
      size: data.size
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(account: EmailAccount): Promise<EmailAccount> {
    // Validate required credentials
    if (!this.clientId || !this.clientSecret) {
      throw new Error('invalid_client: Google API credentials not configured')
    }

    if (!account.refreshToken) {
      throw new Error('invalid_grant: No refresh token available')
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorCode = errorData.error || 'unknown_error'
      const errorDescription = errorData.error_description || 'Failed to refresh token'

      console.error('[Gmail] Token refresh failed:', errorCode, errorDescription)

      // Throw error with Google's error code for better handling
      throw new Error(`${errorCode}: ${errorDescription}`)
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
