/**
 * API Key & Certificate Management
 * Allows users to input their own API keys and certificates to connect devices
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Plus, Trash, Eye, EyeSlash, Copy, Check, DeviceMobile } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { cn } from '@/lib/utils'

interface APIKey {
  id: string
  name: string
  provider: string
  apiKey: string
  certificate?: string
  createdAt: string
  lastUsed?: string
  isActive: boolean
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic (Claude)', icon: '🧠' },
  { value: 'google', label: 'Google Cloud', icon: '🔷' },
  { value: 'aws', label: 'AWS', icon: '🟧' },
  { value: 'azure', label: 'Microsoft Azure', icon: '☁️' },
  { value: 'iot-device', label: 'IoT Device', icon: '📱' },
  { value: 'smart-home', label: 'Smart Home Hub', icon: '🏠' },
  { value: 'other', label: 'Other', icon: '🔑' }
]

export function APIKeyManagement() {
  const [apiKeys, setApiKeys] = useKV<APIKey[]>('flowsphere-api-keys', [])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const [newKey, setNewKey] = useState({
    name: '',
    provider: 'other',
    apiKey: '',
    certificate: ''
  })

  const handleAddKey = () => {
    if (!newKey.name || !newKey.apiKey) {
      toast.error('Please provide a name and API key')
      return
    }

    const key: APIKey = {
      id: `key-${Date.now()}`,
      name: newKey.name,
      provider: newKey.provider,
      apiKey: newKey.apiKey,
      certificate: newKey.certificate || undefined,
      createdAt: new Date().toISOString(),
      isActive: true
    }

    setApiKeys((current) => [...(current || []), key])
    toast.success(`API key "${newKey.name}" added successfully`)

    setNewKey({ name: '', provider: 'other', apiKey: '', certificate: '' })
    setIsAddDialogOpen(false)
  }

  const handleDeleteKey = (id: string) => {
    const key = apiKeys?.find(k => k.id === id)
    setApiKeys((current) => current?.filter(k => k.id !== id) || [])
    toast.success(`Deleted "${key?.name}"`)
  }

  const handleToggleActive = (id: string) => {
    setApiKeys((current) =>
      current?.map(k =>
        k.id === id ? { ...k, isActive: !k.isActive } : k
      ) || []
    )
  }

  const handleToggleVisibility = (id: string) => {
    setVisibleKeys((current) => {
      const newSet = new Set(current)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(id)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••'
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4)
  }

  const getProviderInfo = (provider: string) => {
    return PROVIDERS.find(p => p.value === provider) || PROVIDERS[PROVIDERS.length - 1]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6" weight="duotone" />
            API Keys & Certificates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your devices and services with your own API keys
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New API Key</DialogTitle>
              <DialogDescription>
                Enter your API key and optional certificate to connect external services
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Key Name *</Label>
                <Input
                  placeholder="e.g., My OpenAI Key"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Provider *</Label>
                <Select value={newKey.provider} onValueChange={(value) => setNewKey({ ...newKey, provider: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        <span className="flex items-center gap-2">
                          <span>{provider.icon}</span>
                          {provider.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key *</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              <div className="space-y-2">
                <Label>Certificate (Optional)</Label>
                <Textarea
                  placeholder="Paste your certificate or authentication token here..."
                  value={newKey.certificate}
                  onChange={(e) => setNewKey({ ...newKey, certificate: e.target.value })}
                  className="font-mono text-xs min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddKey}>
                  Add API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!apiKeys || apiKeys.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <p className="text-muted-foreground">No API keys added yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your API keys to connect external devices and services
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key, index) => {
            const provider = getProviderInfo(key.provider)
            const isVisible = visibleKeys.has(key.id)
            const isCopied = copiedKey === key.id

            return (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={cn(
                  "border-2 transition-all",
                  key.isActive ? "border-primary/30" : "border-border opacity-60"
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                          {provider.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{key.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {provider.label}
                            {key.isActive ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">API Key</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={isVisible ? key.apiKey : maskApiKey(key.apiKey)}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleVisibility(key.id)}
                        >
                          {isVisible ? (
                            <EyeSlash className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyKey(key.apiKey, key.id)}
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {key.certificate && (
                      <div className="space-y-2">
                        <Label className="text-xs">Certificate</Label>
                        <Textarea
                          value={key.certificate}
                          readOnly
                          className="font-mono text-xs h-20"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsed && ` • Last used ${new Date(key.lastUsed).toLocaleDateString()}`}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(key.id)}
                      >
                        {key.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DeviceMobile className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" weight="duotone" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Security Notice</p>
              <p className="text-xs text-muted-foreground">
                Your API keys are stored locally in your browser and never transmitted to our servers.
                Keep your keys secure and never share them with others.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
