/**
 * Email Connection Component
 * Handles OAuth flow for Gmail, Yahoo, Outlook, and iCloud Mail
 * UPDATED: Uses Direct OAuth with Edge Functions (Dec 11, 2025)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Envelope, EnvelopeOpen, Check, X, Link as LinkIcon, Warning, Key, Eye, EyeSlash, Info, Spinner } from '@phosphor-icons/react'
import { EmailAccountStore, EmailAccount } from '@/lib/email/email-service'
import { GmailProvider } from '@/lib/email/gmail-provider'
import { YahooProvider } from '@/lib/email/yahoo-provider'
import { OutlookProvider } from '@/lib/email/outlook-provider'
import {
  connectIMAPEmail,
  getAppPasswordInstructions,
  IMAPCredentials,
  IMAP_PRESETS,
} from '@/lib/email/email-oauth'
import { toast } from 'sonner'

interface EmailConnectionProps {
  currentPlan?: 'basic' | 'pro' | 'gold' | 'family'
}

// Initialize providers
const gmailProvider = new GmailProvider()
const yahooProvider = new YahooProvider()
const outlookProvider = new OutlookProvider()

export function EmailConnection({ currentPlan = 'basic' }: EmailConnectionProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [showIMAPDialog, setShowIMAPDialog] = useState(false)
  const [imapProvider, setImapProvider] = useState<'yahoo' | 'icloud' | 'imap'>('yahoo')
  const [imapEmail, setImapEmail] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    loadAccounts()
    // Check for OAuth callback on mount
    handleOAuthCallback()
  }, [])

  const loadAccounts = () => {
    const storedAccounts = EmailAccountStore.getAccounts()
    setAccounts(storedAccounts)
  }

  /**
   * Handle OAuth callback from redirect
   * URL format: /auth/{provider}/callback?code=xxx
   */
  const handleOAuthCallback = async () => {
    const path = window.location.pathname
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    // Check if this is an OAuth callback
    if (!path.includes('/auth/') || !path.includes('/callback')) {
      return
    }

    // Handle OAuth errors
    if (error) {
      console.error('[EmailOAuth] OAuth error:', error)
      toast.error('Email connection failed', {
        description: urlParams.get('error_description') || error
      })
      window.history.replaceState({}, document.title, '/settings?tab=emails')
      return
    }

    if (!code) {
      return
    }

    // Determine provider from path
    let provider: 'gmail' | 'yahoo' | 'outlook' | null = null
    if (path.includes('/gmail/')) provider = 'gmail'
    else if (path.includes('/yahoo/')) provider = 'yahoo'
    else if (path.includes('/outlook/')) provider = 'outlook'

    if (!provider) {
      console.error('[EmailOAuth] Unknown provider in path:', path)
      return
    }

    setIsConnecting(true)
    setConnectingProvider(provider)

    try {
      let accessToken: string
      let refreshToken: string
      let expiresIn: number
      let userInfo: { email: string; name: string }

      // Exchange code for tokens using Edge Function
      switch (provider) {
        case 'gmail':
          const gmailTokens = await gmailProvider.exchangeCodeForTokens(code)
          accessToken = gmailTokens.accessToken
          refreshToken = gmailTokens.refreshToken
          expiresIn = gmailTokens.expiresIn
          userInfo = await gmailProvider.getUserInfo(accessToken)
          break

        case 'yahoo':
          const yahooTokens = await yahooProvider.exchangeCodeForTokens(code)
          accessToken = yahooTokens.accessToken
          refreshToken = yahooTokens.refreshToken
          expiresIn = yahooTokens.expiresIn
          userInfo = await yahooProvider.getUserInfo(accessToken)
          break

        case 'outlook':
          const outlookTokens = await outlookProvider.exchangeCodeForTokens(code)
          accessToken = outlookTokens.accessToken
          refreshToken = outlookTokens.refreshToken
          expiresIn = outlookTokens.expiresIn
          userInfo = await outlookProvider.getUserInfo(accessToken)
          break

        default:
          throw new Error('Unknown provider')
      }

      // Create and save account
      const account: EmailAccount = {
        id: `${provider}_${userInfo.email}_${Date.now()}`,
        provider,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        isActive: true,
        connectedAt: new Date().toISOString(),
      }

      EmailAccountStore.saveAccount(account)
      loadAccounts()

      toast.success(`${userInfo.email} connected successfully!`, {
        description: 'Email monitoring is now active'
      })

      // Clean URL and redirect to settings
      window.history.replaceState({}, document.title, '/settings?tab=emails')

    } catch (error) {
      console.error('[EmailOAuth] Token exchange failed:', error)
      toast.error('Failed to connect email', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      window.history.replaceState({}, document.title, '/settings?tab=emails')
    } finally {
      setIsConnecting(false)
      setConnectingProvider(null)
    }
  }

  const getEmailLimit = () => {
    switch (currentPlan) {
      case 'basic': return 2
      case 'pro': return 5
      case 'gold': return 10
      case 'family': return 999 // Unlimited
      default: return 2
    }
  }

  const handleConnect = async (provider: 'google' | 'yahoo' | 'outlook' | 'apple') => {
    // Check email limit based on plan
    const limit = getEmailLimit()
    if (accounts.length >= limit) {
      toast.error(`Email limit reached (${limit} accounts max for ${currentPlan} plan)`, {
        description: 'Upgrade your plan to connect more email accounts'
      })
      return
    }

    setIsConnecting(true)
    setConnectingProvider(provider)

    try {
      let authUrl: string

      switch (provider) {
        case 'google':
          // Use Direct OAuth with Edge Function
          authUrl = gmailProvider.getAuthUrl()
          window.location.href = authUrl
          return

        case 'yahoo':
          // Use Direct OAuth with Edge Function
          authUrl = yahooProvider.getAuthUrl()
          window.location.href = authUrl
          return

        case 'outlook':
          // Use Direct OAuth with Edge Function
          authUrl = outlookProvider.getAuthUrl()
          window.location.href = authUrl
          return

        case 'apple':
          // Apple/iCloud requires app-specific password
          setImapProvider('icloud')
          setShowIMAPDialog(true)
          setIsConnecting(false)
          setConnectingProvider(null)
          return
      }
    } catch (error) {
      console.error('Connection error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to connect: ${errorMsg}`)
      setIsConnecting(false)
      setConnectingProvider(null)
    }
  }

  const handleIMAPConnect = async () => {
    if (!imapEmail || !imapPassword) {
      toast.error('Please enter email and app password')
      return
    }

    setIsConnecting(true)

    try {
      const credentials: IMAPCredentials = {
        email: imapEmail,
        password: imapPassword,
        provider: imapProvider,
        ...IMAP_PRESETS[imapProvider],
      }

      const account = await connectIMAPEmail(credentials)
      toast.success(`${account.email} connected successfully!`)
      loadAccounts()
      setShowIMAPDialog(false)
      setImapEmail('')
      setImapPassword('')
    } catch (error) {
      console.error('IMAP connection error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to connect email')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = (accountId: string) => {
    EmailAccountStore.removeAccount(accountId)
    loadAccounts()
    toast.success('Account disconnected')
  }

  const handleToggleActive = (account: EmailAccount) => {
    const updated = {
      ...account,
      isActive: !account.isActive
    }
    EmailAccountStore.saveAccount(updated)
    loadAccounts()

    if (updated.isActive) {
      toast.success('Account monitoring enabled')
    } else {
      toast.success('Account monitoring paused')
    }
  }

  const getProviderIcon = (provider: string) => {
    return (provider === 'gmail' || provider === 'google') ? '📧'
         : provider === 'yahoo' ? '📨'
         : (provider === 'icloud' || provider === 'apple') ? '☁️'
         : '📬'
  }

  const getProviderColor = (provider: string) => {
    return (provider === 'gmail' || provider === 'google') ? 'bg-red-500/10 text-red-500'
         : provider === 'yahoo' ? 'bg-purple-500/10 text-purple-500'
         : (provider === 'icloud' || provider === 'apple') ? 'bg-gray-500/10 text-gray-600'
         : 'bg-blue-500/10 text-blue-500'
  }

  const getProviderDisplayName = (provider: string) => {
    if (provider === 'google' || provider === 'gmail') return 'Gmail'
    if (provider === 'apple' || provider === 'icloud') return 'iCloud'
    return provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  const getIMAPProviderTitle = () => {
    switch (imapProvider) {
      case 'yahoo': return 'Connect Yahoo Mail'
      case 'icloud': return 'Connect iCloud Mail'
      default: return 'Connect Email (IMAP)'
    }
  }

  const isProviderConnecting = (provider: string) => {
    return isConnecting && connectingProvider === provider
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Envelope className="w-5 h-5" weight="duotone" />
            Connected Email Accounts
          </CardTitle>
          <CardDescription>
            Connect your email accounts for real-time monitoring, AI classification, and intelligent alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Accounts */}
          {accounts.length > 0 && (
            <ScrollArea className="h-auto max-h-64 pr-4">
              <div className="space-y-3">
                {accounts.map((account) => (
                  <Card key={account.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${getProviderColor(account.provider)} flex items-center justify-center`}>
                            <span className="text-xl">{getProviderIcon(account.provider)}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{account.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={account.isActive ? 'default' : 'secondary'} className="text-xs">
                                {account.isActive ? 'Active' : 'Paused'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {getProviderDisplayName(account.provider)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(account)}
                          >
                            {account.isActive ? <EnvelopeOpen className="w-4 h-4" /> : <Envelope className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(account.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Connection Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            <Button
              onClick={() => handleConnect('google')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {isProviderConnecting('google') ? (
                <Spinner className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl">📧</span>
              )}
              <span className="font-semibold">Gmail</span>
              {accounts.filter(a => a.provider === 'gmail').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'gmail').length} connected
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleConnect('yahoo')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {isProviderConnecting('yahoo') ? (
                <Spinner className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl">📨</span>
              )}
              <span className="font-semibold">Yahoo Mail</span>
              {accounts.filter(a => a.provider === 'yahoo').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'yahoo').length} connected
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleConnect('outlook')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {isProviderConnecting('outlook') ? (
                <Spinner className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl">📬</span>
              )}
              <span className="font-semibold">Outlook</span>
              {accounts.filter(a => a.provider === 'outlook').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'outlook').length} connected
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleConnect('apple')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              {isProviderConnecting('apple') ? (
                <Spinner className="w-6 h-6 animate-spin" />
              ) : (
                <span className="text-2xl">☁️</span>
              )}
              <span className="font-semibold">iCloud Mail</span>
              {accounts.filter(a => a.provider === 'icloud').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'icloud').length} connected
                </Badge>
              )}
            </Button>
          </div>

          {/* Plan Info */}
          <div className="text-sm text-muted-foreground text-center pt-2">
            {accounts.length} / {getEmailLimit() === 999 ? '∞' : getEmailLimit()} email accounts connected
            {currentPlan !== 'family' && (
              <span className="ml-2 text-primary">
                (Upgrade for more)
              </span>
            )}
          </div>

          {/* Features Info */}
          <Card className="bg-muted/50 border-none mt-4">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                What you get with connected accounts:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" weight="bold" />
                  <span>Real-time email monitoring with AI classification</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" weight="bold" />
                  <span>Emergency alerts from family, CCTV, and security systems</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" weight="bold" />
                  <span>Intelligent subscription tracking and billing reminders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" weight="bold" />
                  <span>Powerful email search across all accounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" weight="bold" />
                  <span>Send emails directly from FlowSphere</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* IMAP/App Password Dialog */}
      <Dialog open={showIMAPDialog} onOpenChange={setShowIMAPDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" weight="duotone" />
              {getIMAPProviderTitle()}
            </DialogTitle>
            <DialogDescription>
              {imapProvider === 'yahoo'
                ? 'Yahoo Mail requires an app-specific password for third-party apps.'
                : imapProvider === 'icloud'
                ? 'iCloud Mail requires an app-specific password for FlowSphere.'
                : 'Enter your email credentials to connect.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="imap-email">Email Address</Label>
              <Input
                id="imap-email"
                type="email"
                placeholder={imapProvider === 'yahoo' ? 'you@yahoo.com' : imapProvider === 'icloud' ? 'you@icloud.com' : 'you@example.com'}
                value={imapEmail}
                onChange={(e) => setImapEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imap-password">App Password</Label>
              <div className="relative">
                <Input
                  id="imap-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use an app-specific password, not your regular password
              </p>
            </div>

            {/* Instructions Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-primary"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <Info className="w-4 h-4 mr-2" />
              {showInstructions ? 'Hide' : 'Show'} setup instructions
            </Button>

            {showInstructions && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-4">
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                    {getAppPasswordInstructions(imapProvider === 'imap' ? 'gmail' : imapProvider)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIMAPDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleIMAPConnect} disabled={isConnecting || !imapEmail || !imapPassword}>
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
