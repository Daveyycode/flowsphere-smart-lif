import { config } from '../config.js'
import { encryptionService } from './encryption.js'
import { logger } from '../utils/logger.js'

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  scope?: string
}

export interface UserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

type Provider = 'google' | 'outlook' | 'yahoo' | 'apple'

/**
 * OAuth Service - Handles all OAuth provider interactions
 * Secrets stay server-side, never exposed to frontend
 */
export class OAuthService {
  /**
   * Get OAuth authorization URL for a provider
   */
  getAuthUrl(provider: Provider, state: string, redirectUri: string): string {
    switch (provider) {
      case 'google':
        return this.getGoogleAuthUrl(state, redirectUri)
      case 'outlook':
        return this.getOutlookAuthUrl(state, redirectUri)
      case 'yahoo':
        return this.getYahooAuthUrl(state, redirectUri)
      case 'apple':
        return this.getAppleAuthUrl(state, redirectUri)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(provider: Provider, code: string, redirectUri: string): Promise<OAuthTokens> {
    switch (provider) {
      case 'google':
        return this.exchangeGoogleCode(code, redirectUri)
      case 'outlook':
        return this.exchangeOutlookCode(code, redirectUri)
      case 'yahoo':
        return this.exchangeYahooCode(code, redirectUri)
      case 'apple':
        return this.exchangeAppleCode(code, redirectUri)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Get user info from provider
   */
  async getUserInfo(provider: Provider, accessToken: string): Promise<UserInfo> {
    switch (provider) {
      case 'google':
        return this.getGoogleUserInfo(accessToken)
      case 'outlook':
        return this.getOutlookUserInfo(accessToken)
      case 'yahoo':
        return this.getYahooUserInfo(accessToken)
      case 'apple':
        return this.getAppleUserInfo(accessToken)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(provider: Provider, refreshToken: string): Promise<OAuthTokens> {
    switch (provider) {
      case 'google':
        return this.refreshGoogleToken(refreshToken)
      case 'outlook':
        return this.refreshOutlookToken(refreshToken)
      case 'yahoo':
        return this.refreshYahooToken(refreshToken)
      default:
        throw new Error(`Token refresh not supported for: ${provider}`)
    }
  }

  // ============ GOOGLE ============
  private getGoogleAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.google.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.oauth.google.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  private async exchangeGoogleCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('Google token exchange failed', error)
      throw new Error(error.error_description || 'Failed to exchange code')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope
    }
  }

  private async getGoogleUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) throw new Error('Failed to get user info')

    const data = await response.json()
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    }
  }

  private async refreshGoogleToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) throw new Error('Failed to refresh token')

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't return new refresh token
      expiresIn: data.expires_in,
      tokenType: data.token_type
    }
  }

  // ============ OUTLOOK/MICROSOFT ============
  private getOutlookAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.outlook.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.oauth.outlook.scopes.join(' '),
      response_mode: 'query',
      state
    })
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  }

  private async exchangeOutlookCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.outlook.clientId,
        client_secret: config.oauth.outlook.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('Outlook token exchange failed', error)
      throw new Error(error.error_description || 'Failed to exchange code')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope
    }
  }

  private async getOutlookUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) throw new Error('Failed to get user info')

    const data = await response.json()
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      picture: undefined // Microsoft requires separate call for photo
    }
  }

  private async refreshOutlookToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.oauth.outlook.clientId,
        client_secret: config.oauth.outlook.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) throw new Error('Failed to refresh token')

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    }
  }

  // ============ YAHOO ============
  private getYahooAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.yahoo.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state
    })
    return `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`
  }

  private async exchangeYahooCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const credentials = Buffer.from(
      `${config.oauth.yahoo.clientId}:${config.oauth.yahoo.clientSecret}`
    ).toString('base64')

    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('Yahoo token exchange failed', error)
      throw new Error(error.error_description || 'Failed to exchange code')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    }
  }

  private async getYahooUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) throw new Error('Failed to get user info')

    const data = await response.json()
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture
    }
  }

  private async refreshYahooToken(refreshToken: string): Promise<OAuthTokens> {
    const credentials = Buffer.from(
      `${config.oauth.yahoo.clientId}:${config.oauth.yahoo.clientSecret}`
    ).toString('base64')

    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) throw new Error('Failed to refresh token')

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    }
  }

  // ============ APPLE ============
  private getAppleAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: config.oauth.apple.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'name email',
      response_mode: 'form_post',
      state
    })
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`
  }

  private async exchangeAppleCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    // Apple requires JWT client secret
    const clientSecret = this.generateAppleClientSecret()

    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauth.apple.clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('Apple token exchange failed', error)
      throw new Error(error.error || 'Failed to exchange code')
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    }
  }

  private async getAppleUserInfo(accessToken: string): Promise<UserInfo> {
    // Apple doesn't have a userinfo endpoint
    // User info is returned in the initial authorization response
    // For now, decode the ID token
    return {
      id: 'apple-user',
      email: '',
      name: 'Apple User'
    }
  }

  private generateAppleClientSecret(): string {
    // In production, generate proper JWT with Apple private key
    // This is a placeholder - implement proper JWT generation
    logger.warn('Apple client secret generation not fully implemented')
    return ''
  }
}

export const oauthService = new OAuthService()
