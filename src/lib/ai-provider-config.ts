/**
 * AI Provider Configuration
 * Allows users to use their own API keys (BYOK - Bring Your Own Key)
 * or use FlowSphere's default free providers
 */

import { logger } from '@/lib/security-utils'

export type AIProvider = 'groq' | 'openai' | 'anthropic' | 'deepseek'

export interface AIProviderConfig {
  provider: AIProvider
  apiKey?: string
  model: string
  maxTokens: number
}

export interface UserAISettings {
  preferredProvider: AIProvider
  customKeys: {
    groq?: string
    openai?: string
    anthropic?: string
    deepseek?: string
  }
  usageStats: {
    totalMessages: number
    tokensUsed: number
    lastUsed: number
  }
}

const SETTINGS_KEY = 'flowsphere-ai-settings'

// Default models for each provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  deepseek: 'deepseek-chat'
}

// API endpoints
const API_ENDPOINTS: Record<AIProvider, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  deepseek: 'https://api.deepseek.com/v1/chat/completions'
}

// Default free provider (Groq has generous free tier)
const DEFAULT_PROVIDER: AIProvider = 'groq'

/**
 * Get user's AI settings
 */
export function getAISettings(): UserAISettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    logger.error('Failed to load AI settings', error, 'AIProvider')
  }

  // Default settings
  return {
    preferredProvider: DEFAULT_PROVIDER,
    customKeys: {},
    usageStats: {
      totalMessages: 0,
      tokensUsed: 0,
      lastUsed: 0
    }
  }
}

/**
 * Save user's AI settings
 */
export function saveAISettings(settings: UserAISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    logger.error('Failed to save AI settings', error, 'AIProvider')
  }
}

/**
 * Set a custom API key for a provider
 */
export function setProviderAPIKey(provider: AIProvider, apiKey: string): void {
  const settings = getAISettings()
  settings.customKeys[provider] = apiKey
  settings.preferredProvider = provider
  saveAISettings(settings)
}

/**
 * Remove a custom API key
 */
export function removeProviderAPIKey(provider: AIProvider): void {
  const settings = getAISettings()
  delete settings.customKeys[provider]
  if (settings.preferredProvider === provider) {
    settings.preferredProvider = DEFAULT_PROVIDER
  }
  saveAISettings(settings)
}

/**
 * Get the active AI provider config
 */
export function getActiveProvider(): AIProviderConfig {
  const settings = getAISettings()
  const provider = settings.preferredProvider

  // Check if user has a custom key for preferred provider
  const customKey = settings.customKeys[provider]

  // Fall back to Groq if no custom key and preferred is not Groq
  if (!customKey && provider !== 'groq') {
    return {
      provider: 'groq',
      apiKey: import.meta.env.VITE_GROQ_API_KEY,
      model: DEFAULT_MODELS.groq,
      maxTokens: 4096
    }
  }

  return {
    provider,
    apiKey: customKey || import.meta.env.VITE_GROQ_API_KEY,
    model: DEFAULT_MODELS[provider],
    maxTokens: 4096
  }
}

/**
 * Check if user has any custom API keys configured
 */
export function hasCustomAPIKey(): boolean {
  const settings = getAISettings()
  return Object.keys(settings.customKeys).length > 0
}

/**
 * Get list of available providers with status
 */
export function getAvailableProviders(): Array<{
  provider: AIProvider
  name: string
  hasKey: boolean
  isFree: boolean
  description: string
}> {
  const settings = getAISettings()

  return [
    {
      provider: 'groq',
      name: 'Groq (Llama 3.3)',
      hasKey: !!settings.customKeys.groq || !!import.meta.env.VITE_GROQ_API_KEY,
      isFree: true,
      description: 'Free, fast AI. Great for tutoring and general tasks.'
    },
    {
      provider: 'openai',
      name: 'OpenAI (GPT-4)',
      hasKey: !!settings.customKeys.openai,
      isFree: false,
      description: 'Premium quality. Requires your own API key.'
    },
    {
      provider: 'anthropic',
      name: 'Claude (Anthropic)',
      hasKey: !!settings.customKeys.anthropic,
      isFree: false,
      description: 'Excellent for learning. Requires your own API key.'
    },
    {
      provider: 'deepseek',
      name: 'DeepSeek',
      hasKey: !!settings.customKeys.deepseek,
      isFree: false,
      description: 'Very affordable. Requires your own API key.'
    }
  ]
}

/**
 * Update usage statistics
 */
export function updateUsageStats(tokensUsed: number): void {
  const settings = getAISettings()
  settings.usageStats.totalMessages++
  settings.usageStats.tokensUsed += tokensUsed
  settings.usageStats.lastUsed = Date.now()
  saveAISettings(settings)
}

/**
 * Make a chat completion request to the active provider
 */
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
  options?: {
    maxTokens?: number
    temperature?: number
    stream?: boolean
  }
): Promise<{
  content: string
  tokensUsed: number
  provider: AIProvider
}> {
  const config = getActiveProvider()

  if (!config.apiKey) {
    throw new Error('No API key configured. Please add an API key in Settings > AI Provider.')
  }

  try {
    if (config.provider === 'anthropic') {
      // Anthropic uses a different API format
      const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: options?.maxTokens || config.maxTokens,
          temperature: options?.temperature || 0.7,
          system: messages.find(m => m.role === 'system')?.content || '',
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      updateUsageStats(tokensUsed)

      return {
        content: data.content?.[0]?.text || '',
        tokensUsed,
        provider: config.provider
      }
    } else {
      // OpenAI-compatible API (Groq, OpenAI, DeepSeek)
      const response = await fetch(API_ENDPOINTS[config.provider], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: options?.maxTokens || config.maxTokens,
          temperature: options?.temperature || 0.7,
          stream: options?.stream || false
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      const tokensUsed = data.usage?.total_tokens || 0
      updateUsageStats(tokensUsed)

      return {
        content: data.choices?.[0]?.message?.content || '',
        tokensUsed,
        provider: config.provider
      }
    }
  } catch (error) {
    logger.error('Chat completion failed', error, 'AIProvider')
    throw error
  }
}

/**
 * Test if an API key is valid
 */
export async function testAPIKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const testMessages = [
      { role: 'user' as const, content: 'Say "Hello" in one word.' }
    ]

    if (provider === 'anthropic') {
      const response = await fetch(API_ENDPOINTS.anthropic, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: DEFAULT_MODELS.anthropic,
          max_tokens: 10,
          messages: testMessages
        })
      })
      return response.ok
    } else {
      const response = await fetch(API_ENDPOINTS[provider], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: DEFAULT_MODELS[provider],
          messages: testMessages,
          max_tokens: 10
        })
      })
      return response.ok
    }
  } catch {
    return false
  }
}
