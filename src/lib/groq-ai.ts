/**
 * Groq AI Integration
 * SECURITY UPDATE (Dec 9, 2025): Now uses Edge Function to keep API key server-side
 * Falls back to direct API call if Edge Function not deployed (for dev)
 */

import { logger } from '@/lib/security-utils'

// Supabase configuration for Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const GROQ_EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/groq-ai`

// Fallback for local development (will be removed after Edge Function deployed)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqChatOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * Send a prompt to Groq AI via Edge Function (secure) or direct API (fallback)
 */
export async function groqChat(prompt: string, options: GroqChatOptions = {}): Promise<string> {
  const { model = 'llama-3.3-70b-versatile', temperature = 0.7, max_tokens = 2048 } = options

  // Try Edge Function first (secure - API key hidden server-side)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(GROQ_EDGE_FUNCTION, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          temperature,
          max_tokens,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          return data.content
        }
      }
      // If Edge Function fails, fall through to direct API
      logger.warn('Edge Function failed, falling back to direct API', undefined, 'GroqAI')
    } catch (error) {
      logger.warn('Edge Function unavailable, using direct API', error, 'GroqAI')
    }
  }

  // Fallback: Direct API call (for development or if Edge Function not deployed)
  if (!GROQ_API_KEY) {
    throw new Error(
      'Groq AI not configured. Deploy the groq-ai Edge Function or add VITE_GROQ_API_KEY.'
    )
  }

  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ]

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        `Groq API error: ${response.status} - ${error.error?.message || 'Unknown error'}`
      )
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    logger.error('Groq AI error', error, 'GroqAI')
    throw error
  }
}

/**
 * Chat with conversation history
 */
export async function groqChatWithHistory(
  messages: GroqMessage[],
  options: GroqChatOptions = {}
): Promise<string> {
  const { model = 'llama-3.3-70b-versatile', temperature = 0.7, max_tokens = 2048 } = options

  // Try Edge Function first
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(GROQ_EDGE_FUNCTION, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          temperature,
          max_tokens,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          return data.content
        }
      }
    } catch (error) {
      logger.warn('Edge Function unavailable for chat history', error, 'GroqAI')
    }
  }

  // Fallback: Direct API
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    logger.error('Groq AI error', error, 'GroqAI')
    throw error
  }
}

/**
 * Streaming chat response (uses direct API - Edge Functions don't support streaming easily)
 */
export async function* groqChatStream(
  prompt: string,
  options: GroqChatOptions = {}
): AsyncGenerator<string> {
  const { model = 'llama-3.3-70b-versatile', temperature = 0.7, max_tokens = 2048 } = options

  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured for streaming')
  }

  const messages: GroqMessage[] = [{ role: 'user', content: prompt }]

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'))

    for (const line of lines) {
      const data = line.replace('data: ', '').trim()
      if (data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices[0]?.delta?.content
        if (content) yield content
      } catch (e) {
        // Skip parse errors
      }
    }
  }
}

/**
 * Check if Groq is properly configured (Edge Function or direct API)
 */
export function isGroqConfigured(): boolean {
  // Edge Function is configured if Supabase is set up
  const hasEdgeFunction = !!SUPABASE_URL && !!SUPABASE_ANON_KEY
  // Direct API is configured if key exists
  const hasDirectAPI = !!GROQ_API_KEY && GROQ_API_KEY.startsWith('gsk_')

  const isConfigured = hasEdgeFunction || hasDirectAPI

  if (!isConfigured) {
    console.warn(
      '[Groq] Not configured. Edge Function:',
      hasEdgeFunction,
      'Direct API:',
      hasDirectAPI
    )
  }

  return isConfigured
}
