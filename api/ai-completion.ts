/**
 * Vercel Serverless Function for AI Completion
 * Proxies requests to various AI providers to avoid CORS issues
 * With automatic fallback to next available provider
 */

import type { IncomingMessage, ServerResponse } from 'http'

interface VercelRequest extends IncomingMessage {
  body: any
  query: Record<string, string | string[]>
  cookies: Record<string, string>
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse
  json: (data: any) => void
  send: (data: any) => void
}

// Provider configurations
const PROVIDERS: Record<string, { endpoint: string; model: string }> = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile'
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'mistralai/mistral-7b-instruct:free'
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    model: 'gemini-1.5-flash'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  mistral: {
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest'
  },
  together: {
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  },
  xai: {
    endpoint: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-beta'
  }
}

// Provider priority for fallback (free providers first)
const PROVIDER_PRIORITY = ['groq', 'openrouter', 'gemini', 'openai', 'deepseek', 'mistral', 'together', 'xai', 'anthropic']

// Get API keys from environment
function getAPIKey(provider: string): string | undefined {
  const keys: Record<string, string | undefined> = {
    groq: process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY || process.env.VITE_OPEN_ROUTER_API_KEY,
    xai: process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY,
    openai: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY,
    mistral: process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY,
    together: process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY,
    gemini: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  }
  return keys[provider]
}

// Get list of available providers (those with API keys)
function getAvailableProviders(): string[] {
  return PROVIDER_PRIORITY.filter(p => !!getAPIKey(p))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { provider: requestedProvider, messages, maxTokens = 2048, temperature = 0.7 } = req.body

    if (!messages) {
      return res.status(400).json({ error: 'Missing messages' })
    }

    // Get available providers
    const availableProviders = getAvailableProviders()
    console.log('Available providers:', availableProviders)

    if (availableProviders.length === 0) {
      return res.status(500).json({
        error: 'No AI providers configured. Please add API keys in Vercel environment variables.'
      })
    }

    // Build list of providers to try (requested first, then fallbacks)
    const providersToTry = requestedProvider && getAPIKey(requestedProvider)
      ? [requestedProvider, ...availableProviders.filter(p => p !== requestedProvider)]
      : availableProviders

    let lastError: any = null

    // Try each provider in sequence
    for (const provider of providersToTry) {
      const apiKey = getAPIKey(provider)
      if (!apiKey) continue

      console.log(`Trying provider: ${provider}`)

      try {
        const result = await callProvider(provider, apiKey, messages, maxTokens, temperature)
        console.log(`Success with ${provider}`)
        return res.status(200).json(result)
      } catch (error: any) {
        console.error(`${provider} failed:`, error.message)
        lastError = error
        // Continue to next provider
      }
    }

    // All providers failed
    return res.status(500).json({
      error: lastError?.message || 'All AI providers failed. Please try again later.'
    })

  } catch (error: any) {
    console.error('AI completion error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

// Call a specific provider
async function callProvider(
  provider: string,
  apiKey: string,
  messages: any[],
  maxTokens: number,
  temperature: number
): Promise<{ content: string; tokens: number; provider: string; model: string }> {
  // Special handling for Anthropic
  if (provider === 'anthropic') {
    return callAnthropic(apiKey, messages, maxTokens, temperature)
  }

  // Special handling for Gemini
  if (provider === 'gemini') {
    return callGeminiProvider(apiKey, messages, maxTokens, temperature)
  }

  // OpenAI-compatible providers
  const config = PROVIDERS[provider]
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`)
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: maxTokens,
      temperature
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `${provider} API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    content: data.choices?.[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0,
    provider,
    model: config.model
  }
}

// Call Gemini API
async function callGeminiProvider(
  apiKey: string,
  messages: any[],
  maxTokens: number,
  temperature: number
): Promise<{ content: string; tokens: number; provider: string; model: string }> {
  const contents = messages
    .filter((m: any) => m.role !== 'system')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const systemInstruction = messages.find((m: any) => m.role === 'system')?.content

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokens: data.usageMetadata?.totalTokenCount || 0,
    provider: 'gemini',
    model: 'gemini-1.5-flash'
  }
}

// Call Anthropic API
async function callAnthropic(
  apiKey: string,
  messages: any[],
  maxTokens: number,
  temperature: number
): Promise<{ content: string; tokens: number; provider: string; model: string }> {
  const systemMessage = messages.find((m: any) => m.role === 'system')?.content || ''
  const chatMessages = messages.filter((m: any) => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      temperature,
      system: systemMessage,
      messages: chatMessages.map((m: any) => ({ role: m.role, content: m.content }))
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

  return {
    content: data.content?.[0]?.text || '',
    tokens,
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307'
  }
}

