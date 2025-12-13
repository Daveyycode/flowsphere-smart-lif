/**
 * CEO Security Monitor
 * Displays login attempts, API keys, and security events
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Warning,
  Check,
  X,
  Key,
  Eye,
  EyeSlash,
  Copy,
  Plus,
  Trash,
  Clock,
  MapPin,
  DeviceMobile,
  QrCode,
  User,
  LockKey,
  ChartLine,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { LoginAttempt, APIKey } from '@/lib/ceo-auth'
import { generateAPIKey } from '@/lib/ceo-auth'

export function CEOSecurityMonitor() {
  const [loginAttempts, setLoginAttempts] = useKV<LoginAttempt[]>(
    'flowsphere-ceo-login-attempts',
    []
  )
  const [apiKeys, setApiKeys] = useKV<APIKey[]>('flowsphere-ceo-api-keys', [
    {
      id: '1',
      name: 'AI Monitoring Service',
      key: 'fsk_' + 'x'.repeat(32),
      service: 'ai-monitoring',
      createdAt: new Date().toISOString(),
      enabled: true,
    },
  ])

  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyService, setNewKeyService] = useState<APIKey['service']>('ai-monitoring')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [selectedAttempt, setSelectedAttempt] = useState<LoginAttempt | null>(null)

  const successfulAttempts = loginAttempts?.filter(a => a.success).length || 0
  const failedAttempts = loginAttempts?.filter(a => !a.success).length || 0

  const createAPIKey = () => {
    if (!newKeyName) {
      toast.error('Please enter a key name')
      return
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: generateAPIKey(),
      service: newKeyService,
      createdAt: new Date().toISOString(),
      enabled: true,
    }

    setApiKeys([...(apiKeys || []), newKey])
    setNewKeyName('')
    setShowKeyModal(false)
    toast.success('API key created successfully')
  }

  const deleteAPIKey = (id: string) => {
    setApiKeys((apiKeys || []).filter(k => k.id !== id))
    toast.success('API key deleted')
  }

  const toggleAPIKey = (id: string) => {
    setApiKeys((apiKeys || []).map(k => (k.id === id ? { ...k, enabled: !k.enabled } : k)))
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('API key copied to clipboard')
  }

  const maskKey = (key: string) => {
    return key.substring(0, 8) + '*'.repeat(20) + key.substring(key.length - 4)
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Attempts</p>
                <p className="text-2xl font-bold">{loginAttempts?.length || 0}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-accent" weight="duotone" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Successful</p>
                <p className="text-2xl font-bold text-green-500">{successfulAttempts}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" weight="bold" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Failed</p>
                <p className="text-2xl font-bold text-destructive">{failedAttempts}</p>
              </div>
              <Warning className="w-8 h-8 text-destructive" weight="fill" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLine className="w-5 h-5 text-accent" weight="duotone" />
            Login Attempt History
          </CardTitle>
          <CardDescription>
            All successful and unsuccessful login attempts are monitored by AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {!loginAttempts || loginAttempts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" weight="duotone" />
                  <p className="text-sm">No login attempts recorded yet</p>
                </div>
              ) : (
                loginAttempts.map(attempt => (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all',
                      attempt.success
                        ? 'border-green-500/20 bg-green-500/5 hover:border-green-500/40'
                        : 'border-destructive/20 bg-destructive/5 hover:border-destructive/40'
                    )}
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {attempt.success ? (
                            <Check className="w-5 h-5 text-green-500" weight="bold" />
                          ) : (
                            <X className="w-5 h-5 text-destructive" weight="bold" />
                          )}
                          <span className="font-semibold">
                            {attempt.success ? 'Successful Login' : 'Failed Login'}
                          </span>
                          <Badge
                            variant={attempt.method === 'qr' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {attempt.method === 'qr' ? (
                              <>
                                <QrCode className="w-3 h-3 mr-1" />
                                QR Code
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                Manual
                              </>
                            )}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(attempt.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            <span>Username: {attempt.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DeviceMobile className="w-3 h-3" />
                            <span className="truncate">{attempt.ipAddress}</span>
                          </div>
                          {attempt.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              <span>{attempt.location}</span>
                            </div>
                          )}
                        </div>

                        {!attempt.success && attempt.failureReason && (
                          <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                            <p className="text-xs text-destructive font-medium">
                              Reason: {attempt.failureReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" weight="duotone" />
                AI Monitoring API Keys
              </CardTitle>
              <CardDescription>
                Keys for AI services to report and monitor security events
              </CardDescription>
            </div>
            <Button onClick={() => setShowKeyModal(true)} size="sm" className="bg-accent">
              <Plus className="w-4 h-4 mr-2" />
              New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" weight="duotone" />
                <p className="text-sm">No API keys created yet</p>
              </div>
            ) : (
              apiKeys.map(key => (
                <div
                  key={key.id}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    key.enabled
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-border bg-muted/30 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{key.name}</h4>
                        <Badge variant="outline" className="text-xs capitalize">
                          {key.service.replace('-', ' ')}
                        </Badge>
                        {key.enabled ? (
                          <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsed &&
                          ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="flex-1 p-2 rounded bg-muted text-xs font-mono break-all">
                      {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyVisibility(key.id)}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeSlash className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyKey(key.key)}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAPIKey(key.id)}
                      className="flex-1"
                    >
                      {key.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAPIKey(key.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowKeyModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="border-2 border-accent/30 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Key className="w-5 h-5 text-accent" weight="fill" />
                        Create New API Key
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Generate a key for AI services to access security data
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKeyModal(false)}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production AI Monitor"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key-service">Service Type</Label>
                    <select
                      id="key-service"
                      value={newKeyService}
                      onChange={e => setNewKeyService(e.target.value as APIKey['service'])}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="ai-monitoring">AI Monitoring</option>
                      <option value="reporting">Reporting</option>
                      <option value="alerts">Alerts</option>
                      <option value="analytics">Analytics</option>
                    </select>
                  </div>

                  <Separator />

                  <Button
                    onClick={createAPIKey}
                    className="w-full bg-gradient-to-r from-accent to-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate API Key
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
