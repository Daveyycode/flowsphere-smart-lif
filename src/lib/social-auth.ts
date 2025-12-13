/**
 * Social Authentication Integration
 * Sign in/up with Facebook, Twitter, Instagram, Gmail, Yahoo, Outlook
 */

import { logger } from '@/lib/security-utils'

export interface AuthProvider {
  id: string
  name: string
  icon: string
  color: string
  enabled: boolean
  clientId?: string
  redirectUri?: string
}

export interface SocialAuthUser {
  id: string
  provider: 'facebook' | 'twitter' | 'instagram' | 'google' | 'yahoo' | 'microsoft'
  providerId: string // User ID from provider
  email: string
  name: string
  avatar?: string
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  linkedAccounts: string[] // Other providers linked to same account
  createdAt: string
  lastLogin: string
}

export interface AuthResult {
  success: boolean
  user?: SocialAuthUser
  error?: string
  requiresLink?: boolean // If account exists with different provider
}

/**
 * Social Auth Providers Configuration
 */
export const AUTH_PROVIDERS: Record<string, AuthProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    icon: '🔍',
    color: '#4285F4',
    enabled: true,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    enabled: true,
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    enabled: true,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    enabled: true,
  },
  yahoo: {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '📬',
    color: '#7B0099',
    enabled: true,
  },
  microsoft: {
    id: 'microsoft',
    name: 'Outlook',
    icon: '📧',
    color: '#0078D4',
    enabled: true,
  },
}

/**
 * Social Authentication Manager
 */
export class SocialAuthManager {
  private storageKey = 'flowsphere-social-auth-user'
  private providersKey = 'flowsphere-auth-providers'

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthResult> {
    try {
      // In production, use Google Sign-In SDK
      // For now, simulate OAuth flow
      const popup = this.openOAuthPopup('https://accounts.google.com/o/oauth2/v2/auth', {
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      })

      // Wait for callback
      const code = await this.waitForOAuthCallback(popup)

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens('google', code)

      // Get user info
      const userInfo = await this.getGoogleUserInfo(tokens.accessToken)

      // Create user
      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'google',
        providerId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      // Check if user exists
      const existing = this.getUserByEmail(userInfo.email)
      if (existing && existing.provider !== 'google') {
        return {
          success: false,
          requiresLink: true,
          error: `Account exists with ${existing.provider}. Link accounts?`,
        }
      }

      // Save user
      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Google sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Sign in with Facebook
   */
  async signInWithFacebook(): Promise<AuthResult> {
    try {
      // Initialize Facebook SDK (in production)
      // await this.initFacebookSDK()

      // Login with Facebook
      const popup = this.openOAuthPopup('https://www.facebook.com/v18.0/dialog/oauth', {
        client_id: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
        redirect_uri: `${window.location.origin}/auth/facebook/callback`,
        scope: 'email,public_profile',
        response_type: 'code',
      })

      const code = await this.waitForOAuthCallback(popup)
      const tokens = await this.exchangeCodeForTokens('facebook', code)
      const userInfo = await this.getFacebookUserInfo(tokens.accessToken)

      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'facebook',
        providerId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture?.data?.url,
        accessToken: tokens.accessToken,
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Facebook sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Sign in with Twitter/X
   */
  async signInWithTwitter(): Promise<AuthResult> {
    try {
      // Twitter OAuth 2.0 with PKCE
      const popup = this.openOAuthPopup('https://twitter.com/i/oauth2/authorize', {
        client_id: import.meta.env.VITE_TWITTER_CLIENT_ID || 'YOUR_TWITTER_CLIENT_ID',
        redirect_uri: `${window.location.origin}/auth/twitter/callback`,
        response_type: 'code',
        scope: 'tweet.read users.read offline.access',
        state: this.generateState(),
        code_challenge: this.generateCodeChallenge(),
        code_challenge_method: 'S256',
      })

      const code = await this.waitForOAuthCallback(popup)
      const tokens = await this.exchangeCodeForTokens('twitter', code)
      const userInfo = await this.getTwitterUserInfo(tokens.accessToken)

      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'twitter',
        providerId: userInfo.data.id,
        email: userInfo.data.email || `${userInfo.data.username}@twitter.com`,
        name: userInfo.data.name,
        avatar: userInfo.data.profile_image_url,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Twitter sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Sign in with Instagram
   */
  async signInWithInstagram(): Promise<AuthResult> {
    try {
      // Instagram Basic Display API
      const popup = this.openOAuthPopup('https://api.instagram.com/oauth/authorize', {
        client_id: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || 'YOUR_INSTAGRAM_CLIENT_ID',
        redirect_uri: `${window.location.origin}/auth/instagram/callback`,
        scope: 'user_profile,user_media',
        response_type: 'code',
      })

      const code = await this.waitForOAuthCallback(popup)
      const tokens = await this.exchangeCodeForTokens('instagram', code)
      const userInfo = await this.getInstagramUserInfo(tokens.accessToken)

      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'instagram',
        providerId: userInfo.id,
        email: `${userInfo.username}@instagram.com`,
        name: userInfo.username,
        avatar: userInfo.profile_picture,
        accessToken: tokens.accessToken,
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Instagram sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Sign in with Yahoo
   */
  async signInWithYahoo(): Promise<AuthResult> {
    try {
      const popup = this.openOAuthPopup('https://api.login.yahoo.com/oauth2/request_auth', {
        client_id: import.meta.env.VITE_YAHOO_CLIENT_ID || 'YOUR_YAHOO_CLIENT_ID',
        redirect_uri: `${window.location.origin}/auth/yahoo/callback`,
        response_type: 'code',
        scope: 'openid email profile',
      })

      const code = await this.waitForOAuthCallback(popup)
      const tokens = await this.exchangeCodeForTokens('yahoo', code)
      const userInfo = await this.getYahooUserInfo(tokens.accessToken)

      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'yahoo',
        providerId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Yahoo sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Sign in with Microsoft/Outlook
   */
  async signInWithMicrosoft(): Promise<AuthResult> {
    try {
      const popup = this.openOAuthPopup(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        {
          client_id: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'YOUR_MICROSOFT_CLIENT_ID',
          redirect_uri: `${window.location.origin}/auth/microsoft/callback`,
          response_type: 'code',
          scope: 'openid email profile offline_access',
          response_mode: 'query',
        }
      )

      const code = await this.waitForOAuthCallback(popup)
      const tokens = await this.exchangeCodeForTokens('microsoft', code)
      const userInfo = await this.getMicrosoftUserInfo(tokens.accessToken)

      const user: SocialAuthUser = {
        id: `user-${Date.now()}`,
        provider: 'microsoft',
        providerId: userInfo.id,
        email: userInfo.mail || userInfo.userPrincipalName,
        name: userInfo.displayName,
        avatar: userInfo.photo,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        linkedAccounts: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      }

      this.saveUser(user)

      return { success: true, user }
    } catch (error) {
      console.error('Microsoft sign-in error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      }
    }
  }

  /**
   * Link another social account
   */
  async linkAccount(provider: SocialAuthUser['provider']): Promise<boolean> {
    const currentUser = this.getCurrentUser()
    if (!currentUser) return false

    let result: AuthResult

    switch (provider) {
      case 'google':
        result = await this.signInWithGoogle()
        break
      case 'facebook':
        result = await this.signInWithFacebook()
        break
      case 'twitter':
        result = await this.signInWithTwitter()
        break
      case 'instagram':
        result = await this.signInWithInstagram()
        break
      case 'yahoo':
        result = await this.signInWithYahoo()
        break
      case 'microsoft':
        result = await this.signInWithMicrosoft()
        break
      default:
        return false
    }

    if (result.success && result.user) {
      // Link accounts
      currentUser.linkedAccounts.push(provider)
      this.saveUser(currentUser)
      return true
    }

    return false
  }

  /**
   * Unlink social account
   */
  unlinkAccount(provider: string): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    user.linkedAccounts = user.linkedAccounts.filter(p => p !== provider)
    this.saveUser(user)

    return true
  }

  /**
   * Sign out
   */
  signOut(): void {
    localStorage.removeItem(this.storageKey)
  }

  /**
   * Get current user
   */
  getCurrentUser(): SocialAuthUser | null {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.debug('Failed to load current user from storage', error)
      return null
    }
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): SocialAuthUser | null {
    // In production, query backend
    return this.getCurrentUser()
  }

  /**
   * Save user
   */
  private saveUser(user: SocialAuthUser): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user))
  }

  /**
   * Open OAuth popup window
   */
  private openOAuthPopup(url: string, params: Record<string, string>): Window {
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = `${url}?${queryString}`

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      fullUrl,
      'oauth',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    if (!popup) {
      throw new Error('Popup blocked')
    }

    return popup
  }

  /**
   * Wait for OAuth callback
   */
  private waitForOAuthCallback(popup: Window): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup)
            reject(new Error('Popup closed'))
            return
          }

          const url = popup.location.href
          if (url.includes('/auth/') && url.includes('callback')) {
            const urlParams = new URLSearchParams(popup.location.search)
            const code = urlParams.get('code')

            if (code) {
              clearInterval(checkPopup)
              popup.close()
              resolve(code)
            }
          }
        } catch (error) {
          // Cross-origin error - popup not yet redirected
        }
      }, 500)

      // Timeout after 5 minutes
      setTimeout(
        () => {
          clearInterval(checkPopup)
          popup.close()
          reject(new Error('OAuth timeout'))
        },
        5 * 60 * 1000
      )
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: string, code: string): Promise<any> {
    // In production, call your backend API to exchange code
    // Backend should handle client_secret securely
    return {
      accessToken: `${provider}_access_${code}`,
      refreshToken: `${provider}_refresh_${code}`,
      expiresIn: 3600,
    }
  }

  /**
   * Get user info from providers
   */
  private async getGoogleUserInfo(accessToken: string): Promise<any> {
    // In production, call Google API
    return {
      sub: 'google-user-id',
      email: 'user@gmail.com',
      name: 'User Name',
      picture: 'https://lh3.googleusercontent.com/...',
    }
  }

  private async getFacebookUserInfo(accessToken: string): Promise<any> {
    return {
      id: 'facebook-user-id',
      email: 'user@facebook.com',
      name: 'User Name',
      picture: { data: { url: 'https://graph.facebook.com/...' } },
    }
  }

  private async getTwitterUserInfo(accessToken: string): Promise<any> {
    return {
      data: {
        id: 'twitter-user-id',
        username: 'username',
        name: 'User Name',
        email: 'user@twitter.com',
        profile_image_url: 'https://pbs.twimg.com/...',
      },
    }
  }

  private async getInstagramUserInfo(accessToken: string): Promise<any> {
    return {
      id: 'instagram-user-id',
      username: 'username',
      profile_picture: 'https://scontent.cdninstagram.com/...',
    }
  }

  private async getYahooUserInfo(accessToken: string): Promise<any> {
    return {
      sub: 'yahoo-user-id',
      email: 'user@yahoo.com',
      name: 'User Name',
      picture: 'https://s.yimg.com/...',
    }
  }

  private async getMicrosoftUserInfo(accessToken: string): Promise<any> {
    return {
      id: 'microsoft-user-id',
      displayName: 'User Name',
      mail: 'user@outlook.com',
      userPrincipalName: 'user@outlook.com',
      photo: 'https://graph.microsoft.com/v1.0/me/photo/$value',
    }
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  /**
   * Generate code challenge for PKCE
   */
  private generateCodeChallenge(): string {
    return btoa(Math.random().toString()).substring(0, 43)
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const user = this.getCurrentUser()
    if (!user || !user.expiresAt) return false

    return new Date(user.expiresAt).getTime() < Date.now()
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<boolean> {
    const user = this.getCurrentUser()
    if (!user || !user.refreshToken) return false

    try {
      // Call backend to refresh token
      const tokens = await this.exchangeCodeForTokens(user.provider, user.refreshToken)

      user.accessToken = tokens.accessToken
      user.expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      this.saveUser(user)

      return true
    } catch (error) {
      console.error('Error refreshing token:', error)
      return false
    }
  }
}
