/**
 * Email Connection Component
 * Handles OAuth flow for Gmail, Yahoo, Outlook, and iCloud Mail
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Envelope, EnvelopeOpen, Check, X, Link as LinkIcon, Warning } from '@phosphor-icons/react'
import { GmailProvider } from '@/lib/email/gmail-provider'
import { YahooProvider } from '@/lib/email/yahoo-provider'
import { OutlookProvider } from '@/lib/email/outlook-provider'
import { ICloudProvider } from '@/lib/email/icloud-provider'
import { EmailAccountStore, EmailAccount } from '@/lib/email/email-service'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

interface EmailConnectionProps {
  currentPlan?: 'basic' | 'pro' | 'gold' | 'family'
}

export function EmailConnection({ currentPlan = 'basic' }: EmailConnectionProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [showApiSetup, setShowApiSetup] = useState(false)

  const gmailProvider = new GmailProvider()
  const yahooProvider = new YahooProvider()
  const outlookProvider = new OutlookProvider()
  const icloudProvider = new ICloudProvider()

  useEffect(() => {
    loadAccounts()

    // Check for OAuth callback
    handleOAuthCallback()
  }, [])

  const loadAccounts = () => {
    const storedAccounts = EmailAccountStore.getAccounts()
    setAccounts(storedAccounts)
    // Note: Email monitoring is now handled globally by EmailMonitorService component
  }

  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const authToken = urlParams.get('auth_token')
    const provider = urlParams.get('provider')
    const error = urlParams.get('error')

    // Handle OAuth error
    if (error) {
      toast.error(`Failed to connect: ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Handle successful OAuth callback
    if (authToken && provider) {
      try {
        toast.info('Connecting your account...')

        // Complete OAuth flow with backend
        const response = await authApi.completeOAuth(authToken)

        if (response.success && response.data) {
          const account: EmailAccount = {
            id: response.data.account.id,
            provider: response.data.account.provider as any,
            email: response.data.account.email,
            name: response.data.account.name,
            accessToken: response.data.account.accessToken,
            refreshToken: response.data.account.refreshToken,
            expiresAt: response.data.account.expiresAt,
            isActive: true,
            connectedAt: response.data.account.connectedAt
          }

          EmailAccountStore.saveAccount(account)
          loadAccounts()

          const providerName = provider === 'google' ? 'Gmail' : provider.charAt(0).toUpperCase() + provider.slice(1)
          toast.success(`${providerName} account connected! Email monitoring is now active.`)
        } else {
          toast.error(`Failed to connect: ${response.error || 'Unknown error'}`)
        }

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        console.error('OAuth callback error:', error)
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error details:', errorMsg)
        toast.error(`Failed to connect: ${errorMsg}`)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
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

  const handleConnect = (provider: 'google' | 'yahoo' | 'outlook' | 'apple') => {
    // Check email limit based on plan
    const limit = getEmailLimit()
    if (accounts.length >= limit) {
      toast.error(`Email limit reached (${limit} accounts max for ${currentPlan} plan)`, {
        description: 'Upgrade your plan to connect more email accounts'
      })
      return
    }

    setIsConnecting(true)

    try {
      // Use backend OAuth API
      authApi.initiateOAuth(provider, window.location.origin)
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = (accountId: string) => {
    EmailAccountStore.removeAccount(accountId)
    loadAccounts()
    toast.success('Account disconnected')
    // Note: Global monitoring service will automatically adjust
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
    // Note: Global monitoring service will automatically adjust
  }

  const getProviderIcon = (provider: string) => {
    return (provider === 'gmail' || provider === 'google') ? '📧'
         : provider === 'yahoo' ? '📨'
         : (provider === 'icloud' || provider === 'apple') ? '☁️'
         : '📬'
  }

  const getProviderColor = (provider: string) => {
    return (provider === 'gmail' || provider === 'google') ? 'bg-blue-500/10 text-blue-500'
         : provider === 'yahoo' ? 'bg-purple-500/10 text-purple-500'
         : (provider === 'icloud' || provider === 'apple') ? 'bg-gray-500/10 text-gray-600'
         : 'bg-cyan-500/10 text-cyan-500'
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
                                {account.provider === 'google' || account.provider === 'gmail' ? 'Gmail'
                                 : account.provider === 'apple' || account.provider === 'icloud' ? 'iCloud'
                                 : account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
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
              <span className="text-2xl">📧</span>
              <span className="font-semibold">Gmail</span>
              {accounts.filter(a => a.provider === 'google' || a.provider === 'gmail').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'google' || a.provider === 'gmail').length} connected
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleConnect('outlook')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">📬</span>
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
              <span className="text-2xl">☁️</span>
              <span className="font-semibold">iCloud Mail</span>
              {accounts.filter(a => a.provider === 'apple' || a.provider === 'icloud').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'apple' || a.provider === 'icloud').length} connected
                </Badge>
              )}
            </Button>

            <Button
              onClick={() => handleConnect('yahoo')}
              disabled={isConnecting}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <span className="text-2xl">📨</span>
              <span className="font-semibold">Yahoo Mail</span>
              {accounts.filter(a => a.provider === 'yahoo').length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {accounts.filter(a => a.provider === 'yahoo').length} connected
                </Badge>
              )}
            </Button>
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

      {/* API Setup Dialog */}
      <Dialog open={showApiSetup} onOpenChange={setShowApiSetup}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warning className="w-5 h-5 text-amber-500" weight="duotone" />
              API Setup Required
            </DialogTitle>
            <DialogDescription>
              To connect email accounts, you need to set up API credentials. Follow the guide below:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Gmail API Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable Gmail API in API Library</li>
                <li>Create OAuth 2.0 credentials (Web application)</li>
                <li>Add authorized redirect URI: <code className="bg-muted px-2 py-1 rounded">{window.location.origin}/auth/gmail/callback</code></li>
                <li>Copy Client ID and Client Secret</li>
                <li>Add to .env file:
                  <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GOOGLE_CLIENT_SECRET=your_client_secret`}
                  </pre>
                </li>
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Yahoo Mail API Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://developer.yahoo.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Yahoo Developer Network</a></li>
                <li>Create a new app</li>
                <li>Select Mail API permissions</li>
                <li>Add redirect URI: <code className="bg-muted px-2 py-1 rounded">{window.location.origin}/auth/yahoo/callback</code></li>
                <li>Copy Client ID and Client Secret</li>
                <li>Add to .env file:
                  <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`VITE_YAHOO_CLIENT_ID=your_client_id
VITE_YAHOO_CLIENT_SECRET=your_client_secret`}
                  </pre>
                </li>
              </ol>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Outlook API Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Go to <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Azure Portal</a></li>
                <li>Register a new app in Azure Active Directory</li>
                <li>Add Microsoft Graph API permissions (Mail.Read, Mail.Send, Mail.ReadWrite)</li>
                <li>Add redirect URI: <code className="bg-muted px-2 py-1 rounded">{window.location.origin}/auth/outlook/callback</code></li>
                <li>Create a client secret</li>
                <li>Add to .env file:
                  <pre className="bg-muted p-3 rounded mt-2 text-xs overflow-x-auto">
{`VITE_OUTLOOK_CLIENT_ID=your_client_id
VITE_OUTLOOK_CLIENT_SECRET=your_client_secret`}
                  </pre>
                </li>
              </ol>
            </div>

            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <strong>Important:</strong> After adding credentials to your .env file, restart the development server for changes to take effect.
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
