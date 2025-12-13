/**
 * AI Setup Guide Component
 * Helps users configure API keys for AI providers
 * Shows usage limits, warnings, and signup links
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Key,
  Robot,
  CheckCircle,
  Warning,
  ArrowSquareOut,
  Trash,
  Eye,
  EyeSlash,
  Lightning,
  Info,
  X,
  Sparkle,
  ChartBar,
  Gear,
} from '@phosphor-icons/react'
import {
  AI_PROVIDERS,
  AIProvider,
  AIProviderInfo,
  getAIConfig,
  setAPIKey,
  removeAPIKey,
  hasAPIKey,
  testAPIKey,
  checkUsageLimits,
  getTodayUsage,
  getUsageStats,
  setUsageLimits,
  getAllProviders,
} from '@/lib/smart-ai-router'
import { toast } from 'sonner'

// ==========================================
// Types
// ==========================================

interface AISetupGuideProps {
  onClose?: () => void
  compact?: boolean
  showUsageOnly?: boolean
}

// ==========================================
// Usage Warning Banner
// ==========================================

export function AIUsageWarning() {
  const limitCheck = checkUsageLimits()

  if (!limitCheck.warning) return null

  const isLimit = !limitCheck.canProceed

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg mb-4',
        isLimit
          ? 'bg-red-500/20 border border-red-500/30'
          : 'bg-yellow-500/20 border border-yellow-500/30'
      )}
    >
      <Warning
        className={cn('w-5 h-5 flex-shrink-0', isLimit ? 'text-red-500' : 'text-yellow-500')}
        weight="fill"
      />
      <div className="flex-1 text-sm">
        <p className={cn('font-medium', isLimit ? 'text-red-500' : 'text-yellow-500')}>
          {isLimit ? 'Daily AI Limit Reached' : 'Approaching Limit'}
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">{limitCheck.warning}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const dialog = document.getElementById('ai-setup-dialog')
          if (dialog) dialog.click()
        }}
      >
        <Key className="w-4 h-4 mr-1" />
        Add Key
      </Button>
    </motion.div>
  )
}

// ==========================================
// Usage Stats Card
// ==========================================

export function AIUsageStats({ compact = false }: { compact?: boolean }) {
  const config = getAIConfig()
  const todayUsage = getTodayUsage()
  const stats = getUsageStats()
  const limits = config.limits

  const messagePercent = limits.enabled
    ? Math.min(100, (todayUsage.messages / limits.dailyMessageLimit) * 100)
    : 0
  const tokenPercent = limits.enabled
    ? Math.min(100, (todayUsage.tokens / limits.dailyTokenLimit) * 100)
    : 0

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Lightning className="w-4 h-4 text-yellow-500" />
          <span>
            {todayUsage.messages}/{limits.enabled ? limits.dailyMessageLimit : '∞'}
          </span>
        </div>
        <Progress value={messagePercent} className="w-20 h-2" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChartBar className="w-4 h-4" />
          AI Usage Today
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Messages</span>
            <span>
              {todayUsage.messages} / {limits.enabled ? limits.dailyMessageLimit : 'Unlimited'}
            </span>
          </div>
          <Progress
            value={messagePercent}
            className={cn(
              'h-2',
              messagePercent >= 80 && '[&>div]:bg-yellow-500',
              messagePercent >= 100 && '[&>div]:bg-red-500'
            )}
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Tokens Used</span>
            <span>
              {todayUsage.tokens.toLocaleString()} /{' '}
              {limits.enabled ? limits.dailyTokenLimit.toLocaleString() : 'Unlimited'}
            </span>
          </div>
          <Progress
            value={tokenPercent}
            className={cn(
              'h-2',
              tokenPercent >= 80 && '[&>div]:bg-yellow-500',
              tokenPercent >= 100 && '[&>div]:bg-red-500'
            )}
          />
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Total Cost (all time)</span>
            <span className="font-medium">${stats.totalCost.toFixed(4)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// Provider Card
// ==========================================

function ProviderCard({
  provider,
  onKeyAdded,
}: {
  provider: AIProviderInfo & { hasKey?: boolean }
  onKeyAdded: () => void
}) {
  const [showInput, setShowInput] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const hasKey = hasAPIKey(provider.id)

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }

    setTesting(true)
    const isValid = await testAPIKey(provider.id, apiKey.trim())
    setTesting(false)

    if (isValid) {
      setAPIKey(provider.id, apiKey.trim())
      setApiKey('')
      setShowInput(false)
      onKeyAdded()
      toast.success(`${provider.name} API key saved!`)
    } else {
      toast.error('Invalid API key. Please check and try again.')
    }
  }

  const handleRemoveKey = () => {
    removeAPIKey(provider.id)
    onKeyAdded()
    toast.success(`${provider.name} API key removed`)
  }

  const costDisplay =
    provider.costPer1kTokens === 0
      ? 'Free'
      : `$${(provider.costPer1kTokens * 1000).toFixed(2)}/1M tokens`

  return (
    <Card className={cn('transition-all', hasKey && 'ring-1 ring-green-500/50 bg-green-500/5')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                hasKey ? 'bg-green-500/20' : 'bg-muted'
              )}
            >
              {hasKey ? (
                <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
              ) : (
                <Robot className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{provider.name}</h3>
              <p className="text-xs text-muted-foreground">{costDisplay}</p>
            </div>
          </div>

          {hasKey && !provider.requiresKey && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
              Default
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{provider.description}</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {provider.supportsVision && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
              Vision
            </span>
          )}
          {provider.complexity.map(c => (
            <span
              key={c}
              className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize"
            >
              {c}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {showInput ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Paste your API key..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveKey} disabled={testing} className="flex-1">
                  {testing ? 'Testing...' : 'Save Key'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInput(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              {hasKey ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInput(true)}
                    className="flex-1"
                  >
                    <Key className="w-4 h-4 mr-1" />
                    Update Key
                  </Button>
                  {provider.requiresKey && (
                    <Button size="sm" variant="ghost" onClick={handleRemoveKey}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setShowInput(true)} className="flex-1">
                    <Key className="w-4 h-4 mr-1" />
                    Add API Key
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(provider.signupUrl, '_blank')}
                  >
                    <ArrowSquareOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!hasKey && (
          <a
            href={provider.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-2"
          >
            Get your free API key
            <ArrowSquareOut className="w-3 h-3" />
          </a>
        )}
      </CardContent>
    </Card>
  )
}

// ==========================================
// Main Setup Guide Component
// ==========================================

export function AISetupGuide({ onClose, compact, showUsageOnly }: AISetupGuideProps) {
  const [providers, setProviders] = useState<(AIProviderInfo & { hasKey?: boolean })[]>([])
  const [config, setConfig] = useState(getAIConfig())

  const refreshProviders = () => {
    setProviders(getAllProviders())
    setConfig(getAIConfig())
  }

  useEffect(() => {
    refreshProviders()
  }, [])

  const configuredCount = providers.filter(p => p.hasKey).length

  if (showUsageOnly) {
    return <AIUsageStats compact={compact} />
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-yellow-500" weight="fill" />
              <span className="font-medium">AI Providers</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {configuredCount}/{providers.length} configured
            </span>
          </div>
          <Progress value={(configuredCount / providers.length) * 100} className="h-2 mb-3" />
          <p className="text-xs text-muted-foreground mb-3">
            Add your own API keys for unlimited AI usage. FlowSphere routes to the cheapest provider
            automatically.
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              const dialog = document.getElementById('ai-setup-dialog')
              if (dialog) dialog.click()
            }}
          >
            <Gear className="w-4 h-4 mr-2" />
            Configure AI Providers
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Robot className="w-7 h-7 text-white" weight="fill" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Provider Setup</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  FlowSphere intelligently routes requests to the cheapest available AI provider.
                  Add your own API keys for unlimited usage.
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Warning */}
      <AIUsageWarning />

      {/* Usage Stats */}
      <AIUsageStats />

      {/* Info Banner */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-500">How Smart Routing Works</p>
              <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                <li>• FlowSphere automatically picks the cheapest available provider</li>
                <li>• Simple tasks go to free/cheap providers (Groq, DeepSeek)</li>
                <li>• Complex tasks use more capable models when needed</li>
                <li>• Vision tasks only use providers that support images</li>
                <li>• Add more API keys for better fallback options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limits Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gear className="w-4 h-4" />
            Usage Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Daily Limits</Label>
              <p className="text-xs text-muted-foreground">Prevent unexpected costs</p>
            </div>
            <Switch
              checked={config.limits.enabled}
              onCheckedChange={enabled => {
                setUsageLimits({ enabled })
                refreshProviders()
              }}
            />
          </div>

          {config.limits.enabled && (
            <>
              <div>
                <Label className="text-xs">Daily Message Limit</Label>
                <Input
                  type="number"
                  value={config.limits.dailyMessageLimit}
                  onChange={e => {
                    setUsageLimits({ dailyMessageLimit: parseInt(e.target.value) || 100 })
                    refreshProviders()
                  }}
                  min={10}
                  max={1000}
                />
              </div>
              <div>
                <Label className="text-xs">Daily Token Limit</Label>
                <Input
                  type="number"
                  value={config.limits.dailyTokenLimit}
                  onChange={e => {
                    setUsageLimits({ dailyTokenLimit: parseInt(e.target.value) || 100000 })
                    refreshProviders()
                  }}
                  min={10000}
                  max={1000000}
                  step={10000}
                />
              </div>
              <div>
                <Label className="text-xs">Warning at (%)</Label>
                <Input
                  type="number"
                  value={config.limits.warningThreshold}
                  onChange={e => {
                    setUsageLimits({ warningThreshold: parseInt(e.target.value) || 80 })
                    refreshProviders()
                  }}
                  min={50}
                  max={95}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Provider List */}
      <div>
        <h3 className="font-semibold mb-3">
          Available Providers ({configuredCount}/{providers.length} configured)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map(provider => (
            <ProviderCard key={provider.id} provider={provider} onKeyAdded={refreshProviders} />
          ))}
        </div>
      </div>

      {/* How to Get API Keys */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4" />
            How to Get API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </span>
              <span>Click the link next to any provider above to visit their website</span>
            </li>
            <li className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </span>
              <span>Create a free account (most providers offer free credits)</span>
            </li>
            <li className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </span>
              <span>Navigate to API Keys or Settings in their dashboard</span>
            </li>
            <li className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                4
              </span>
              <span>Generate a new API key and paste it here</span>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
            <p className="text-xs text-green-500 font-medium">Recommended Free Options:</p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <li>
                • <strong>Groq</strong> - Completely free, fast responses
              </li>
              <li>
                • <strong>Google Gemini</strong> - Free tier available, supports vision
              </li>
              <li>
                • <strong>DeepSeek</strong> - Extremely cheap ($0.10/1M tokens)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AISetupGuide
