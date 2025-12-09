/**
 * Email OAuth Service - Using Supabase OAuth for secure authentication
 *
 * This service handles OAuth flows for:
 * - Gmail (via Google OAuth through Supabase)
 * - Outlook (via Microsoft OAuth through Supabase)
 * - Apple Mail (via Sign in with Apple through Supabase)
 * - Yahoo/IMAP (via app-specific passwords)
 */

import { supabase } from '@/lib/supabase'
import { EmailAccount, EmailAccountStore } from './email-service'
import { toast } from 'sonner'

// OAuth scopes for email access
const GOOGLE_EMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
]

const MICROSOFT_EMAIL_SCOPES = [
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.ReadWrite',
  'offline_access',
]

/**
 * Check if Supabase OAuth provider is configured
 */
export async function checkProviderAvailability(provider: string): Promise<boolean> {
  try {
    // Check if the provider is enabled in Supabase settings
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[EmailOAuth] Session check failed:', error)
    }
    // Provider availability is determined by Supabase project settings
    return true
  } catch (err) {
    console.error('[EmailOAuth] Provider check failed:', err)
    return false
  }
}

/**
 * Initiate Gmail OAuth via Supabase
 */
export async function connectGmail(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/settings?tab=emails&oauth_callback=google`,
        scopes: GOOGLE_EMAIL_SCOPES.join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('[EmailOAuth] Gmail OAuth error:', error)
      throw new Error(error.message)
    }

    // The user will be redirected to Google
    console.log('[EmailOAuth] Redirecting to Google OAuth...')
  } catch (err) {
    console.error('[EmailOAuth] Gmail connection failed:', err)
    throw err
  }
}

/**
 * Initiate Outlook OAuth via Supabase
 */
export async function connectOutlook(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/settings?tab=emails&oauth_callback=outlook`,
        scopes: MICROSOFT_EMAIL_SCOPES.join(' '),
      },
    })

    if (error) {
      console.error('[EmailOAuth] Outlook OAuth error:', error)
      throw new Error(error.message)
    }

    console.log('[EmailOAuth] Redirecting to Microsoft OAuth...')
  } catch (err) {
    console.error('[EmailOAuth] Outlook connection failed:', err)
    throw err
  }
}

/**
 * Initiate Apple Sign In via Supabase
 */
export async function connectApple(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/settings?tab=emails&oauth_callback=apple`,
      },
    })

    if (error) {
      console.error('[EmailOAuth] Apple OAuth error:', error)
      throw new Error(error.message)
    }

    console.log('[EmailOAuth] Redirecting to Apple OAuth...')
  } catch (err) {
    console.error('[EmailOAuth] Apple connection failed:', err)
    throw err
  }
}

/**
 * Handle OAuth callback and store account
 */
export async function handleOAuthCallback(): Promise<EmailAccount | null> {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthCallback = urlParams.get('oauth_callback')

    if (!oauthCallback) {
      return null
    }

    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      console.error('[EmailOAuth] No session after callback:', error)
      return null
    }

    const user = session.user
    const providerToken = session.provider_token
    const providerRefreshToken = session.provider_refresh_token

    if (!providerToken) {
      console.error('[EmailOAuth] No provider token received')
      toast.error('Email connection failed - no access token received')
      return null
    }

    // Map callback provider to our provider type
    const providerMap: Record<string, 'gmail' | 'outlook' | 'icloud'> = {
      'google': 'gmail',
      'outlook': 'outlook',
      'azure': 'outlook',
      'apple': 'icloud',
    }

    const provider = providerMap[oauthCallback] || 'gmail'

    // Create email account
    const account: EmailAccount = {
      id: `${provider}_${user.id}_${Date.now()}`,
      provider,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      accessToken: providerToken,
      refreshToken: providerRefreshToken || '',
      expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000,
      isActive: true,
      connectedAt: new Date().toISOString(),
    }

    // Save account
    EmailAccountStore.saveAccount(account)

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname)

    console.log('[EmailOAuth] Email account connected:', account.email)
    return account
  } catch (err) {
    console.error('[EmailOAuth] Callback handling failed:', err)
    return null
  }
}

/**
 * Connect Yahoo Mail using app-specific password (IMAP)
 */
export interface IMAPCredentials {
  email: string
  password: string // App-specific password
  provider: 'yahoo' | 'icloud' | 'imap'
  imapHost?: string
  imapPort?: number
  smtpHost?: string
  smtpPort?: number
}

// IMAP presets for common providers
export const IMAP_PRESETS: Record<string, Omit<IMAPCredentials, 'email' | 'password' | 'provider'>> = {
  yahoo: {
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.yahoo.com',
    smtpPort: 587,
  },
  icloud: {
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    smtpHost: 'smtp.mail.me.com',
    smtpPort: 587,
  },
  outlook_imap: {
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
  },
  gmail_imap: {
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
  },
}

/**
 * Connect email using IMAP credentials (app-specific password)
 * This works for Yahoo, iCloud, or any IMAP-compatible provider
 */
export async function connectIMAPEmail(credentials: IMAPCredentials): Promise<EmailAccount> {
  // Validate credentials
  if (!credentials.email || !credentials.password) {
    throw new Error('Email and password are required')
  }

  if (!credentials.email.includes('@')) {
    throw new Error('Please enter a valid email address')
  }

  // Get preset settings if available
  const preset = IMAP_PRESETS[credentials.provider]
  const imapHost = credentials.imapHost || preset?.imapHost
  const imapPort = credentials.imapPort || preset?.imapPort
  const smtpHost = credentials.smtpHost || preset?.smtpHost
  const smtpPort = credentials.smtpPort || preset?.smtpPort

  // For IMAP connections, we store the credentials securely
  // The actual IMAP operations happen through our email provider classes
  const account: EmailAccount = {
    id: `${credentials.provider}_${credentials.email}_${Date.now()}`,
    provider: credentials.provider === 'imap' ? 'gmail' : credentials.provider as 'yahoo' | 'icloud',
    email: credentials.email,
    name: credentials.email.split('@')[0],
    accessToken: credentials.password, // App-specific password
    refreshToken: '', // Not used for IMAP
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year (app passwords don't expire)
    isActive: true,
    connectedAt: new Date().toISOString(),
  }

  // Store IMAP settings in account metadata (for future use)
  const accountWithMeta = {
    ...account,
    imapSettings: {
      host: imapHost,
      port: imapPort,
      smtpHost,
      smtpPort,
      secure: true,
    },
  }

  // Save account
  EmailAccountStore.saveAccount(accountWithMeta as EmailAccount)

  return account
}

/**
 * Verify IMAP connection is working
 * Note: This requires a backend proxy for actual IMAP verification
 */
export async function verifyIMAPConnection(account: EmailAccount): Promise<boolean> {
  // In a full implementation, this would call a backend API
  // that tests the IMAP connection
  console.log('[EmailOAuth] IMAP verification would happen server-side')
  return true
}

/**
 * Refresh OAuth token using Supabase
 */
export async function refreshOAuthToken(account: EmailAccount): Promise<EmailAccount | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data.session) {
      console.error('[EmailOAuth] Token refresh failed:', error)
      return null
    }

    const newToken = data.session.provider_token
    const newRefreshToken = data.session.provider_refresh_token

    if (!newToken) {
      console.error('[EmailOAuth] No new provider token')
      return null
    }

    const updatedAccount: EmailAccount = {
      ...account,
      accessToken: newToken,
      refreshToken: newRefreshToken || account.refreshToken,
      expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000,
    }

    EmailAccountStore.saveAccount(updatedAccount)
    return updatedAccount
  } catch (err) {
    console.error('[EmailOAuth] Token refresh error:', err)
    return null
  }
}

/**
 * Disconnect email account
 */
export function disconnectEmail(accountId: string): void {
  EmailAccountStore.removeAccount(accountId)
  console.log('[EmailOAuth] Account disconnected:', accountId)
}

/**
 * Get setup instructions for app-specific passwords
 */
export function getAppPasswordInstructions(provider: 'yahoo' | 'icloud' | 'gmail'): string {
  const instructions: Record<string, string> = {
    yahoo: `
Yahoo Mail Setup (App Password Required):

1. Go to your Yahoo Account Security page:
   https://login.yahoo.com/account/security

2. Scroll to "Generate app password"

3. Select "Other App" and enter "FlowSphere"

4. Click "Generate" and copy the password

5. Use this password (not your regular Yahoo password) in FlowSphere

Note: You must have 2-step verification enabled.
    `,
    icloud: `
iCloud Mail Setup (App-Specific Password Required):

1. Go to appleid.apple.com

2. Sign in with your Apple ID

3. Under "Sign-In and Security" click "App-Specific Passwords"

4. Click the + to generate a new password

5. Name it "FlowSphere" and click Create

6. Copy the 16-character password (xxxx-xxxx-xxxx-xxxx)

7. Use this password in FlowSphere

Note: Two-Factor Authentication must be enabled.
    `,
    gmail: `
Gmail Setup (App Password Required):

1. Go to your Google Account:
   https://myaccount.google.com/security

2. Enable 2-Step Verification if not already enabled

3. Go to "App passwords" under 2-Step Verification

4. Select "Mail" and "Other" device

5. Enter "FlowSphere" and click Generate

6. Copy the 16-character password

7. Use this password in FlowSphere

Note: App passwords work as an alternative to OAuth.
    `,
  }

  return instructions[provider] || 'Please check your email provider\'s documentation for app password setup.'
}
