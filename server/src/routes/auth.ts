import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { oauthService } from '../services/oauth.js'
import { encryptionService } from '../services/encryption.js'
import { authRateLimiter } from '../middleware/security.js'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'

const router = Router()

// Store for OAuth states (in production, use Redis)
const oauthStates = new Map<string, { provider: string; timestamp: number; redirectTo: string }>()

// Clean expired states every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of oauthStates.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
      oauthStates.delete(key)
    }
  }
}, 5 * 60 * 1000)

type Provider = 'google' | 'outlook' | 'yahoo' | 'apple'

/**
 * GET /auth/providers
 * List available OAuth providers
 * NOTE: This MUST be defined before /:provider to prevent matching "providers" as a provider name
 */
router.get('/providers', (req: Request, res: Response) => {
  const providers = [
    {
      id: 'google',
      name: 'Gmail',
      enabled: !!config.oauth.google.clientId,
      icon: 'gmail'
    },
    {
      id: 'outlook',
      name: 'Outlook',
      enabled: !!config.oauth.outlook.clientId,
      icon: 'outlook'
    },
    {
      id: 'yahoo',
      name: 'Yahoo Mail',
      enabled: !!config.oauth.yahoo.clientId,
      icon: 'yahoo'
    },
    {
      id: 'apple',
      name: 'iCloud Mail',
      enabled: !!config.oauth.apple.clientId,
      icon: 'apple'
    }
  ]

  res.json({ providers })
})

/**
 * GET /auth/:provider
 * Initiates OAuth flow - redirects user to provider
 */
router.get('/:provider', authRateLimiter, (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as Provider
    const validProviders = ['google', 'outlook', 'yahoo', 'apple']

    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' })
    }

    // Check if provider is configured
    const providerConfig = config.oauth[provider as keyof typeof config.oauth]
    if (!providerConfig || !('clientId' in providerConfig) || !providerConfig.clientId) {
      return res.status(501).json({
        error: 'Provider not configured',
        message: `${provider} OAuth is not configured. Contact admin.`
      })
    }

    // Generate state for CSRF protection
    const state = uuidv4()
    const redirectTo = req.query.redirect as string || config.frontendUrl

    oauthStates.set(state, {
      provider,
      timestamp: Date.now(),
      redirectTo
    })

    // Build redirect URI
    const redirectUri = `${config.apiUrl}/auth/${provider}/callback`

    // Get auth URL and redirect
    const authUrl = oauthService.getAuthUrl(provider, state, redirectUri)

    logger.info('OAuth initiated', { provider, state: state.substring(0, 8) })

    res.redirect(authUrl)
  } catch (error) {
    logger.error('OAuth initiation failed', { error })
    res.status(500).json({ error: 'Failed to initiate OAuth' })
  }
})

/**
 * GET /auth/:provider/callback
 * OAuth callback - exchanges code for tokens
 */
router.get('/:provider/callback', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as Provider
    const { code, state, error, error_description } = req.query

    // Handle OAuth errors
    if (error) {
      logger.warn('OAuth error from provider', { provider, error, error_description })
      return res.redirect(
        `${config.frontendUrl}/settings?error=${encodeURIComponent(error_description as string || error as string)}`
      )
    }

    // Validate state
    if (!state || !oauthStates.has(state as string)) {
      logger.warn('Invalid OAuth state', { provider })
      return res.redirect(`${config.frontendUrl}/settings?error=invalid_state`)
    }

    const stateData = oauthStates.get(state as string)!
    oauthStates.delete(state as string)

    if (stateData.provider !== provider) {
      return res.redirect(`${config.frontendUrl}/settings?error=provider_mismatch`)
    }

    // Exchange code for tokens
    const redirectUri = `${config.apiUrl}/auth/${provider}/callback`
    const tokens = await oauthService.exchangeCode(provider, code as string, redirectUri)

    // Get user info
    const userInfo = await oauthService.getUserInfo(provider, tokens.accessToken)

    logger.info('OAuth successful', { provider, email: userInfo.email })

    // Encrypt tokens for secure storage
    const encryptedTokens = encryptionService.encryptObject({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000
    })

    // Create a short-lived JWT to pass to frontend
    const authToken = jwt.sign(
      {
        provider,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        tokens: encryptedTokens
      },
      config.jwtSecret,
      { expiresIn: '5m' } // 5 minutes to complete connection
    )

    // Redirect to frontend with token
    const redirectUrl = new URL(`${stateData.redirectTo}/settings`)
    redirectUrl.searchParams.set('auth_token', authToken)
    redirectUrl.searchParams.set('provider', provider)

    res.redirect(redirectUrl.toString())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error('OAuth callback failed', {
      provider: req.params.provider,
      message: errorMessage,
      stack: errorStack,
      error: error
    })
    res.redirect(`${config.frontendUrl}/settings?error=${encodeURIComponent(errorMessage)}`)
  }
})

/**
 * POST /auth/complete
 * Complete OAuth flow - frontend sends JWT, gets account data
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token required' })
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwtSecret) as {
      provider: string
      email: string
      name: string
      picture?: string
      tokens: string
    }

    // Decrypt tokens
    const tokens = encryptionService.decryptObject<{
      accessToken: string
      refreshToken: string
      expiresAt: number
    }>(decoded.tokens)

    // Return account data to frontend
    res.json({
      success: true,
      account: {
        id: `${decoded.provider}-${Date.now()}`,
        provider: decoded.provider,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        isActive: true,
        connectedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired. Please try again.' })
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    logger.error('OAuth completion failed', { error })
    res.status(500).json({ error: 'Failed to complete OAuth' })
  }
})

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { provider, refreshToken } = req.body

    if (!provider || !refreshToken) {
      return res.status(400).json({ error: 'Provider and refresh token required' })
    }

    const tokens = await oauthService.refreshToken(provider as Provider, refreshToken)

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000
    })
  } catch (error) {
    logger.error('Token refresh failed', { error })
    res.status(401).json({ error: 'Failed to refresh token' })
  }
})

export default router
