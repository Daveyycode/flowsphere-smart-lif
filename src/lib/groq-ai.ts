/**
 * Groq AI Integration
 * Replaces GitHub Spark LLM with Groq for all AI features
 */

import { logger } from '@/lib/security-utils'

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
 * Send a prompt to Groq AI and get a response
 */
export async function groqChat(
  prompt: string,
  options: GroqChatOptions = {}
): Promise<string> {
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    max_tokens = 2048,
    stream = false
  } = options

  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your .env file.')
  }

  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: prompt
    }
  ]

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Groq API error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
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
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    max_tokens = 2048
  } = options

  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
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
 * Streaming chat response
 */
export async function* groqChatStream(
  prompt: string,
  options: GroqChatOptions = {}
): AsyncGenerator<string> {
  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.7,
    max_tokens = 2048
  } = options

  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured')
  }

  const messages: GroqMessage[] = [{ role: 'user', content: prompt }]

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true
    })
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
 * Check if Groq is properly configured
 */
export function isGroqConfigured(): boolean {
  const isConfigured = !!GROQ_API_KEY && GROQ_API_KEY.startsWith('gsk_')
  if (!isConfigured) {
    console.warn('[Groq] API key not configured. Key exists:', !!GROQ_API_KEY, 'Starts with gsk_:', GROQ_API_KEY?.startsWith('gsk_'))
  }
  return isConfigured
}
