/**
 * Smart AI Router
 * Automatically routes AI requests to the cheapest available provider
 * based on task complexity and user's configured API keys
 */

import { logger } from '@/lib/security-utils'

// ==========================================
// Types & Interfaces
// ==========================================

export type AIProvider =
  | 'groq'
  | 'openrouter'
  | 'xai'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'gemini'
  | 'mistral'
  | 'together'

export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'vision'

export interface AIProviderInfo {
  id: AIProvider
  name: string
  model: string
  endpoint: string
  costPer1kTokens: number // in USD
  maxTokens: number
  supportsVision: boolean
  requiresKey: boolean
  signupUrl: string
  description: string
  complexity: TaskComplexity[] // What complexities it's good for
}

export interface AIUsageStats {
  totalMessages: number
  totalTokens: number
  totalCost: number
  byProvider: Record<
    AIProvider,
    {
      messages: number
      tokens: number
      cost: number
    }
  >
  dailyUsage: {
    date: string
    messages: number
    tokens: number
  }[]
  lastReset: number
}

export interface AIUsageLimits {
  dailyMessageLimit: number
  dailyTokenLimit: number
  warningThreshold: number // percentage (0-100)
  enabled: boolean
}

export interface UserAIConfig {
  apiKeys: Partial<Record<AIProvider, string>>
  preferredProvider?: AIProvider
  usageStats: AIUsageStats
  limits: AIUsageLimits
  autoRoute: boolean // Use smart routing
}

// ==========================================
// Provider Configurations
// ==========================================

export const AI_PROVIDERS: Record<AIProvider, AIProviderInfo> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (Free)',
    model: 'mistralai/mistral-7b-instruct:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    costPer1kTokens: 0, // Free models available
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://openrouter.ai/keys',
    description: 'FREE models available. Many AI options.',
    complexity: ['simple', 'medium', 'complex'],
  },
  xai: {
    id: 'xai',
    name: 'xAI Grok',
    model: 'grok-beta',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    costPer1kTokens: 0.0001,
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://x.ai',
    description: 'Grok AI by xAI/Elon Musk.',
    complexity: ['simple', 'medium', 'complex'],
  },
  groq: {
    id: 'groq',
    name: 'Groq (Free)',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    costPer1kTokens: 0, // Free tier - 14,400 requests/day
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://console.groq.com/keys',
    description: 'FREE - 14,400 req/day. Best for tutoring.',
    complexity: ['simple', 'medium', 'complex'],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini (Free)',
    model: 'gemini-1.5-flash',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    costPer1kTokens: 0, // Free tier - 15 req/min, 1500/day
    maxTokens: 8192,
    supportsVision: true,
    requiresKey: true,
    signupUrl: 'https://aistudio.google.com/app/apikey',
    description: 'FREE - 1500 req/day. Vision support!',
    complexity: ['simple', 'medium', 'complex', 'vision'],
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI (Free)',
    model: 'mistral-small-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    costPer1kTokens: 0, // Free tier available
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://console.mistral.ai/api-keys',
    description: 'FREE tier available. European AI.',
    complexity: ['simple', 'medium'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek (Cheapest)',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    costPer1kTokens: 0.00014, // $0.14 per 1M input tokens
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://platform.deepseek.com/api_keys',
    description: '$0.14/1M tokens - Cheapest paid option!',
    complexity: ['simple', 'medium', 'complex'],
  },
  together: {
    id: 'together',
    name: 'Together AI',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    costPer1kTokens: 0.00088,
    maxTokens: 8192,
    supportsVision: false,
    requiresKey: true,
    signupUrl: 'https://api.together.xyz/settings/api-keys',
    description: '$25 free credit. Open source models.',
    complexity: ['simple', 'medium', 'complex'],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI GPT-4o-mini',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    costPer1kTokens: 0.00015,
    maxTokens: 16384,
    supportsVision: true,
    requiresKey: true,
    signupUrl: 'https://platform.openai.com/api-keys',
    description: '$0.15/1M tokens. Vision + great quality.',
    complexity: ['simple', 'medium', 'complex', 'vision'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Claude 3 Haiku',
    model: 'claude-3-haiku-20240307',
    endpoint: 'https://api.anthropic.com/v1/messages',
    costPer1kTokens: 0.00025,
    maxTokens: 4096,
    supportsVision: true,
    requiresKey: true,
    signupUrl: 'https://console.anthropic.com/settings/keys',
    description: '$0.25/1M tokens. Best for learning.',
    complexity: ['simple', 'medium', 'complex', 'vision'],
  },
}

// Provider priority for smart routing (free first, then cheapest)
const PROVIDER_PRIORITY: AIProvider[] = [
  'openrouter', // FREE models available
  'xai', // Grok - has free tier
  'groq', // FREE - 14,400 req/day
  'gemini', // FREE - 1500 req/day
  'mistral', // FREE tier available
  'deepseek', // $0.14/1M tokens (cheapest paid)
  'openai', // $0.15/1M tokens
  'anthropic', // $0.25/1M tokens
  'together', // $0.88/1M tokens
]

// ==========================================
// Storage
// ==========================================

const STORAGE_KEY = 'flowsphere-smart-ai-config'

// Default API keys from environment (FlowSphere-provided for free tier)
const DEFAULT_KEYS: Partial<Record<AIProvider, string>> = {
  openrouter: import.meta.env.VITE_OPEN_ROUTER_API_KEY || '',
  xai: import.meta.env.VITE_XAI_API_KEY || '',
  groq: import.meta.env.VITE_GROQ_API_KEY || '',
  openai: import.meta.env.VITE_OPENAI_API_KEY || '',
  anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
  mistral: import.meta.env.VITE_MISTRAL_API_KEY || '',
  together: import.meta.env.VITE_TOGETHER_API_KEY || '',
}

function getDefaultConfig(): UserAIConfig {
  return {
    apiKeys: {},
    preferredProvider: undefined,
    usageStats: {
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {} as any,
      dailyUsage: [],
      lastReset: Date.now(),
    },
    limits: {
      dailyMessageLimit: 15, // Default free tier for regular users
      dailyTokenLimit: 15000,
      warningThreshold: 80,
      enabled: true,
    },
    autoRoute: true,
  }
}

export function getAIConfig(): UserAIConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const config = JSON.parse(stored)
      // Reset daily usage if new day
      const today = new Date().toISOString().split('T')[0]
      const lastUsageDate = config.usageStats.dailyUsage[0]?.date
      if (lastUsageDate !== today) {
        config.usageStats.dailyUsage = [
          { date: today, messages: 0, tokens: 0 },
          ...config.usageStats.dailyUsage.slice(0, 29),
        ]
      }
      return { ...getDefaultConfig(), ...config }
    }
  } catch (e) {
    logger.error('Failed to load AI config', e, 'SmartAIRouter')
  }
  return getDefaultConfig()
}

export function saveAIConfig(config: UserAIConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    logger.error('Failed to save AI config', e, 'SmartAIRouter')
  }
}

// ==========================================
// API Key Management
// ==========================================

export function setAPIKey(provider: AIProvider, key: string): void {
  const config = getAIConfig()
  config.apiKeys[provider] = key
  saveAIConfig(config)
}

export function removeAPIKey(provider: AIProvider): void {
  const config = getAIConfig()
  delete config.apiKeys[provider]
  saveAIConfig(config)
}

export function hasAPIKey(provider: AIProvider): boolean {
  const config = getAIConfig()
  // Check user's key first, then fall back to default env key
  return !!(config.apiKeys[provider] || DEFAULT_KEYS[provider])
}

export function getAPIKey(provider: AIProvider): string | undefined {
  const config = getAIConfig()
  // User's key takes priority, then fall back to default env key
  return config.apiKeys[provider] || DEFAULT_KEYS[provider]
}

// ==========================================
// Smart Routing
// ==========================================

export function determineComplexity(prompt: string): TaskComplexity {
  const wordCount = prompt.split(/\s+/).length
  const hasCode = /```|function|const|let|var|import|class/.test(prompt)
  const hasImage = /image|picture|photo|screenshot|vision/.test(prompt.toLowerCase())

  if (hasImage) return 'vision'
  if (hasCode || wordCount > 200) return 'complex'
  if (wordCount > 50) return 'medium'
  return 'simple'
}

export function selectBestProvider(complexity: TaskComplexity = 'simple'): AIProvider | null {
  const config = getAIConfig()

  // If user has a preferred provider and it has a key, use it
  if (config.preferredProvider && hasAPIKey(config.preferredProvider)) {
    return config.preferredProvider
  }

  // Smart routing: find cheapest available provider for this complexity
  for (const provider of PROVIDER_PRIORITY) {
    if (!hasAPIKey(provider)) continue

    const info = AI_PROVIDERS[provider]
    if (info.complexity.includes(complexity)) {
      return provider
    }

    // For vision tasks, only use providers that support it
    if (complexity === 'vision' && !info.supportsVision) continue
  }

  // Fallback to Groq if available
  if (hasAPIKey('groq')) return 'groq'

  return null
}

export function getAvailableProviders(): AIProviderInfo[] {
  return PROVIDER_PRIORITY.map(p => AI_PROVIDERS[p]).filter(p => hasAPIKey(p.id))
}

export function getAllProviders(): AIProviderInfo[] {
  return PROVIDER_PRIORITY.map(p => ({
    ...AI_PROVIDERS[p],
    hasKey: hasAPIKey(p),
  })) as any
}

// ==========================================
// Usage Tracking & Limits
// ==========================================

export function trackUsage(provider: AIProvider, tokens: number): void {
  const config = getAIConfig()
  const info = AI_PROVIDERS[provider]
  const cost = (tokens / 1000) * info.costPer1kTokens
  const today = new Date().toISOString().split('T')[0]

  // Update totals
  config.usageStats.totalMessages++
  config.usageStats.totalTokens += tokens
  config.usageStats.totalCost += cost

  // Update per-provider stats
  if (!config.usageStats.byProvider[provider]) {
    config.usageStats.byProvider[provider] = { messages: 0, tokens: 0, cost: 0 }
  }
  config.usageStats.byProvider[provider].messages++
  config.usageStats.byProvider[provider].tokens += tokens
  config.usageStats.byProvider[provider].cost += cost

  // Update daily usage
  if (config.usageStats.dailyUsage[0]?.date === today) {
    config.usageStats.dailyUsage[0].messages++
    config.usageStats.dailyUsage[0].tokens += tokens
  } else {
    config.usageStats.dailyUsage.unshift({ date: today, messages: 1, tokens })
    config.usageStats.dailyUsage = config.usageStats.dailyUsage.slice(0, 30)
  }

  saveAIConfig(config)
}

export function getUsageStats(): AIUsageStats {
  return getAIConfig().usageStats
}

export function getTodayUsage(): { messages: number; tokens: number } {
  const config = getAIConfig()
  const today = new Date().toISOString().split('T')[0]
  const todayStats = config.usageStats.dailyUsage.find(d => d.date === today)
  return todayStats || { messages: 0, tokens: 0 }
}

export function checkUsageLimits(): {
  canProceed: boolean
  warning: string | null
  messagesRemaining: number
  tokensRemaining: number
  percentUsed: number
} {
  const config = getAIConfig()
  const limits = config.limits
  const today = getTodayUsage()

  if (!limits.enabled) {
    return {
      canProceed: true,
      warning: null,
      messagesRemaining: Infinity,
      tokensRemaining: Infinity,
      percentUsed: 0,
    }
  }

  const messagesRemaining = Math.max(0, limits.dailyMessageLimit - today.messages)
  const tokensRemaining = Math.max(0, limits.dailyTokenLimit - today.tokens)
  const percentUsed = Math.max(
    (today.messages / limits.dailyMessageLimit) * 100,
    (today.tokens / limits.dailyTokenLimit) * 100
  )

  let warning: string | null = null
  let canProceed = true

  if (messagesRemaining === 0 || tokensRemaining === 0) {
    canProceed = false
    warning = 'Daily AI limit reached. Add your own API key in Settings to continue.'
  } else if (percentUsed >= limits.warningThreshold) {
    warning = `You've used ${Math.round(percentUsed)}% of your daily AI limit. Consider adding your own API key.`
  }

  return { canProceed, warning, messagesRemaining, tokensRemaining, percentUsed }
}

export function setUsageLimits(limits: Partial<AIUsageLimits>): void {
  const config = getAIConfig()
  config.limits = { ...config.limits, ...limits }
  saveAIConfig(config)
}

// ==========================================
// AI Completion
// ==========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionOptions {
  maxTokens?: number
  temperature?: number
  provider?: AIProvider // Force specific provider
  complexity?: TaskComplexity
}

export interface CompletionResult {
  content: string
  provider: AIProvider
  tokens: number
  cost: number
  model: string
}

export async function smartCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  // Check usage limits first
  const limitCheck = checkUsageLimits()
  if (!limitCheck.canProceed) {
    throw new Error(limitCheck.warning || 'AI usage limit reached')
  }

  // Determine complexity if not specified
  const userMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
  const complexity = options.complexity || determineComplexity(userMessage)

  // Select provider
  const provider = options.provider || selectBestProvider(complexity)
  if (!provider) {
    throw new Error('No AI provider available. Please add an API key in Settings > AI Provider.')
  }

  const providerInfo = AI_PROVIDERS[provider]

  try {
    // Use serverless function to avoid CORS issues
    const result = await callServerlessProxy(messages, provider, providerInfo, options)

    // Track usage
    trackUsage(provider, result.tokens)

    return result
  } catch (error: any) {
    logger.error(`AI completion failed for ${provider}`, error, 'SmartAIRouter')

    // Try fallback to next available provider
    if (!options.provider) {
      const availableProviders = PROVIDER_PRIORITY.filter(p => hasAPIKey(p) && p !== provider)
      for (const fallbackProvider of availableProviders) {
        try {
          logger.info(`Falling back to ${fallbackProvider}`, {}, 'SmartAIRouter')
          return await smartCompletion(messages, { ...options, provider: fallbackProvider })
        } catch (fallbackError) {
          logger.error(`Fallback ${fallbackProvider} also failed`, fallbackError, 'SmartAIRouter')
          continue
        }
      }
    }

    throw error
  }
}

// Call serverless proxy to avoid CORS issues
async function callServerlessProxy(
  messages: ChatMessage[],
  provider: AIProvider,
  providerInfo: AIProviderInfo,
  options: CompletionOptions
): Promise<CompletionResult> {
  const response = await fetch('/api/ai-completion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      messages,
      maxTokens: options.maxTokens || providerInfo.maxTokens,
      temperature: options.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    content: data.content || '',
    provider: data.provider || provider,
    tokens: data.tokens || 0,
    cost: ((data.tokens || 0) / 1000) * providerInfo.costPer1kTokens,
    model: data.model || providerInfo.model,
  }
}

async function callOpenAICompatible(
  messages: ChatMessage[],
  apiKey: string,
  provider: AIProviderInfo,
  options: CompletionOptions
): Promise<CompletionResult> {
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: options.maxTokens || provider.maxTokens,
      temperature: options.temperature || 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  const tokens = data.usage?.total_tokens || 0

  return {
    content: data.choices?.[0]?.message?.content || '',
    provider: provider.id,
    tokens,
    cost: (tokens / 1000) * provider.costPer1kTokens,
    model: provider.model,
  }
}

async function callAnthropic(
  messages: ChatMessage[],
  apiKey: string,
  provider: AIProviderInfo,
  options: CompletionOptions
): Promise<CompletionResult> {
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const chatMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: options.maxTokens || provider.maxTokens,
      temperature: options.temperature || 0.7,
      system: systemMessage,
      messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

  return {
    content: data.content?.[0]?.text || '',
    provider: provider.id,
    tokens,
    cost: (tokens / 1000) * provider.costPer1kTokens,
    model: provider.model,
  }
}

async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  provider: AIProviderInfo,
  options: CompletionOptions
): Promise<CompletionResult> {
  // Convert to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemInstruction = messages.find(m => m.role === 'system')?.content

  const response = await fetch(`${provider.endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        maxOutputTokens: options.maxTokens || provider.maxTokens,
        temperature: options.temperature || 0.7,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const tokens = data.usageMetadata?.totalTokenCount || 0

  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    provider: provider.id,
    tokens,
    cost: (tokens / 1000) * provider.costPer1kTokens,
    model: provider.model,
  }
}

// ==========================================
// Test API Key
// ==========================================

export async function testAPIKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const testMessages: ChatMessage[] = [{ role: 'user', content: 'Say "OK" in one word.' }]

    const providerInfo = AI_PROVIDERS[provider]

    if (provider === 'anthropic') {
      await callAnthropic(testMessages, apiKey, providerInfo, { maxTokens: 10 })
    } else if (provider === 'gemini') {
      await callGemini(testMessages, apiKey, providerInfo, { maxTokens: 10 })
    } else {
      await callOpenAICompatible(testMessages, apiKey, providerInfo, { maxTokens: 10 })
    }

    return true
  } catch {
    return false
  }
}

// ==========================================
// Exports for backward compatibility
// ==========================================

// Alias for existing code that uses chatCompletion
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<{ content: string; tokensUsed: number; provider: AIProvider }> {
  const result = await smartCompletion(messages, options)
  return {
    content: result.content,
    tokensUsed: result.tokens,
    provider: result.provider,
  }
}
