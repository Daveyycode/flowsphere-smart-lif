import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useDeviceType } from '@/hooks/use-mobile'
import {
  Brain,
  Key,
  CheckCircle,
  Warning,
  Eye,
  EyeSlash,
  Trash,
  TestTube,
  Sparkle,
  Info
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  getAISettings,
  getAvailableProviders,
  setProviderAPIKey,
  removeProviderAPIKey,
  testAPIKey,
  AIProvider,
  UserAISettings
} from '@/lib/ai-provider-config'

export function AIProviderSettings() {
  const deviceType = useDeviceType()
  const isMobile = deviceType === 'mobile'

  const [settings, setSettings] = useState<UserAISettings | null>(null)
  const [providers, setProviders] = useState(getAvailableProviders())
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [newKeys, setNewKeys] = useState<Record<string, string>>({})
  const [testingProvider, setTestingProvider] = useState<AIProvider | null>(null)

  useEffect(() => {
    setSettings(getAISettings())
    setProviders(getAvailableProviders())
  }, [])

  const handleSaveKey = async (provider: AIProvider) => {
    const key = newKeys[provider]
    if (!key || !key.trim()) {
      toast.error('Please enter an API key')
      return
    }

    // Test the key first
    setTestingProvider(provider)
    const isValid = await testAPIKey(provider, key.trim())
    setTestingProvider(null)

    if (isValid) {
      setProviderAPIKey(provider, key.trim())
      setNewKeys(prev => ({ ...prev, [provider]: '' }))
      setSettings(getAISettings())
      setProviders(getAvailableProviders())
      toast.success(`${provider} API key saved successfully!`)
    } else {
      toast.error(`Invalid ${provider} API key. Please check and try again.`)
    }
  }

  const handleRemoveKey = (provider: AIProvider) => {
    removeProviderAPIKey(provider)
    setSettings(getAISettings())
    setProviders(getAvailableProviders())
    toast.success(`${provider} API key removed`)
  }

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const getProviderLogo = (provider: AIProvider) => {
    switch (provider) {
      case 'groq': return '⚡'
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'deepseek': return '🔍'
      default: return '✨'
    }
  }

  if (!settings) return null

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4")}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className={cn(isMobile ? "pb-2" : "pb-4")}>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-500" weight="fill" />
            </div>
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                AI Provider Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure your AI providers for Tutor AI and other features
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">Bring Your Own API Key (BYOK)</p>
              <p className="text-muted-foreground mt-1">
                FlowSphere uses Groq by default (free tier). You can add your own API keys
                for OpenAI, Anthropic, or DeepSeek to use those providers instead.
                Your keys are stored locally on your device.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkle className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{settings.usageStats.totalMessages}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {settings.usageStats.tokensUsed > 1000
                  ? `${(settings.usageStats.tokensUsed / 1000).toFixed(1)}k`
                  : settings.usageStats.tokensUsed}
              </p>
              <p className="text-xs text-muted-foreground">Tokens Used</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold capitalize">{settings.preferredProvider}</p>
              <p className="text-xs text-muted-foreground">Active Provider</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <Card key={provider.provider}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xl">
                    {getProviderLogo(provider.provider)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.name}</h3>
                      {provider.isFree && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
                          Free
                        </span>
                      )}
                      {settings.preferredProvider === provider.provider && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>

                {provider.hasKey && (
                  <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
                )}
              </div>

              {/* API Key Input */}
              {!provider.isFree && (
                <div className="space-y-3">
                  {provider.hasKey ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono">
                        ••••••••••••••••
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveKey(provider.provider)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showKeys[provider.provider] ? 'text' : 'password'}
                            placeholder={`Enter your ${provider.name} API key`}
                            value={newKeys[provider.provider] || ''}
                            onChange={(e) => setNewKeys(prev => ({
                              ...prev,
                              [provider.provider]: e.target.value
                            }))}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowKey(provider.provider)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[provider.provider] ? (
                              <EyeSlash className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSaveKey(provider.provider)}
                          disabled={testingProvider === provider.provider || !newKeys[provider.provider]}
                        >
                          {testingProvider === provider.provider ? (
                            <TestTube className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Key className="w-4 h-4" />
                          )}
                          <span className="ml-2">Save</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {provider.provider === 'openai' && 'Get your API key from platform.openai.com'}
                        {provider.provider === 'anthropic' && 'Get your API key from console.anthropic.com'}
                        {provider.provider === 'deepseek' && 'Get your API key from platform.deepseek.com'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {provider.isFree && provider.provider === 'groq' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Groq provides free access with generous limits. No API key required for basic usage.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
