/**
 * Vercel Serverless Function for AI Completion
 * Proxies requests to various AI providers to avoid CORS issues
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Provider configurations
const PROVIDERS: Record<string, { endpoint: string; model: string }> = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile'
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
  }
}

// API keys from environment
const API_KEYS: Record<string, string | undefined> = {
  groq: process.env.VITE_GROQ_API_KEY,
  openai: process.env.VITE_OPENAI_API_KEY,
  deepseek: process.env.VITE_DEEPSEEK_API_KEY,
  mistral: process.env.VITE_MISTRAL_API_KEY,
  together: process.env.VITE_TOGETHER_API_KEY,
  anthropic: process.env.VITE_ANTHROPIC_API_KEY,
  gemini: process.env.VITE_GEMINI_API_KEY
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
    const { provider, messages, maxTokens = 2048, temperature = 0.7 } = req.body

    if (!provider || !messages) {
      return res.status(400).json({ error: 'Missing provider or messages' })
    }

    // Get API key
    const apiKey = API_KEYS[provider]
    if (!apiKey) {
      return res.status(400).json({ error: `No API key configured for ${provider}` })
    }

    // Special handling for different providers
    if (provider === 'anthropic') {
      return handleAnthropic(req, res, apiKey, messages, maxTokens, temperature)
    }

    if (provider === 'gemini') {
      return handleGemini(req, res, apiKey, messages, maxTokens, temperature)
    }

    // OpenAI-compatible providers
    const config = PROVIDERS[provider]
    if (!config) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` })
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
      console.error(`${provider} API error:`, error)
      return res.status(response.status).json({
        error: error.error?.message || `${provider} API error: ${response.status}`
      })
    }

    const data = await response.json()

    return res.status(200).json({
      content: data.choices?.[0]?.message?.content || '',
      tokens: data.usage?.total_tokens || 0,
      provider,
      model: config.model
    })

  } catch (error: any) {
    console.error('AI completion error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

async function handleAnthropic(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string,
  messages: any[],
  maxTokens: number,
  temperature: number
) {
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
    return res.status(response.status).json({
      error: error.error?.message || `Anthropic API error: ${response.status}`
    })
  }

  const data = await response.json()
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

  return res.status(200).json({
    content: data.content?.[0]?.text || '',
    tokens,
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307'
  })
}

async function handleGemini(
  req: VercelRequest,
  res: VercelResponse,
  apiKey: string,
  messages: any[],
  maxTokens: number,
  temperature: number
) {
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
    return res.status(response.status).json({
      error: error.error?.message || `Gemini API error: ${response.status}`
    })
  }

  const data = await response.json()

  return res.status(200).json({
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokens: data.usageMetadata?.totalTokenCount || 0,
    provider: 'gemini',
    model: 'gemini-1.5-flash'
  })
}
