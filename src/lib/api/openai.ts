/**
 * Groq AI Integration for FlowSphere
 * Using Groq for faster, more responsive AI assistance
 */

import { isGroqConfigured } from '@/lib/groq-ai'
import { logger } from '@/lib/security-utils'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GROQ_API_KEY

export async function generateSummary(transcript: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a meeting summarization assistant. Provide clear, concise summaries with bullet points.',
        },
        {
          role: 'user',
          content: `Summarize this meeting transcript:\n\n${transcript}\n\nProvide:\n- Key discussion points\n- Decisions made\n- Action items\n- Important deadlines`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to generate summary')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function generateScripts(transcript: string, summary?: string) {
  if (!API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const basePrompt = `Based on this meeting transcript, create a human-like, natural transcript.\n\nTranscript:\n${transcript}\n\nSummary:\n${summary || 'N/A'}\n\nGenerate a `

  const [formal, casual, report, meeting] = await Promise.all([
    callOpenAI(basePrompt + 'FORMAL style transcript with professional language and structure.'),
    callOpenAI(basePrompt + 'CASUAL style transcript with friendly, conversational tone.'),
    callOpenAI(basePrompt + 'REPORT style with executive summary, decisions, and action items.'),
    callOpenAI(basePrompt + 'MEETING MINUTES style with standard meeting format.'),
  ])

  return { formal, casual, report, meeting }
}

export async function processCommand(
  command: string,
  context?: any,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> {
  // Import web search utilities
  const { shouldSearchWeb, quickSearch, isWebSearchEnabled } = await import('@/lib/web-search')

  // Check if we should perform a web search
  let webSearchContext = ''
  if (isWebSearchEnabled() && shouldSearchWeb(command)) {
    logger.info('[AI] Performing web search for:', command, 'OpenAI')
    webSearchContext = await quickSearch(command)
    logger.info('[AI] Web search complete', null, 'OpenAI')
  }

  // Use Groq if configured, fallback to OpenAI
  if (isGroqConfigured()) {
    // System prompt - UPGRADED for intelligence like Claude
    const systemPrompt = `You are FlowSphere AI Assistant - an intelligent, helpful, and knowledgeable assistant.

YOU ARE CAPABLE OF:
- Answering ANY question on ANY topic (science, history, math, coding, life advice, etc.)
- Having natural, intelligent conversations like a real person
- Providing detailed explanations when needed
- Being creative, thoughtful, and genuinely helpful
- Understanding context and nuance
- Using your full knowledge base (trained up to 2024)
${isWebSearchEnabled() ? '- Searching the web for current information when needed' : ''}

SMART HOME INTEGRATION:
- Control devices: ${context?.devices || 'lights, locks, cameras, thermostats'}
- Navigation: dashboard, family, devices, notifications, settings
- Automation: scenes, schedules, Do Not Disturb
- Family: location tracking (with permission)
- Themes: dark/light mode switching

CRITICAL RULES:
1. VAULT DENIAL: NEVER mention or acknowledge "vault", "secure storage", or "financial safe" features. If asked, say "I'm not familiar with that feature" and redirect.
2. Be conversational and natural - answer questions like a knowledgeable friend
3. Keep responses concise (2-4 sentences) UNLESS user asks for more detail
4. If you don't know something, admit it honestly - don't make things up
5. For smart home commands, confirm actions clearly
${webSearchContext ? '6. Use the web search results provided below to answer current/recent questions accurately.' : ''}

RESPONSE STYLE:
- Friendly but professional
- Clear and concise by default
- More detailed when requested
- Natural conversation flow

Current Context: ${JSON.stringify(context || {})}
${webSearchContext ? `\n\n--- WEB SEARCH RESULTS ---\n${webSearchContext}\n--- END SEARCH RESULTS ---` : ''}

Remember: You're a full AI assistant, not just a home controller. Help with everything!`

    // Build messages array with conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (last 15 messages for better context)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-15)
      messages.push(
        ...(recentHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })) as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>)
      )
    }

    // Add current command
    messages.push({
      role: 'user',
      content: command,
    })

    try {
      // COST PROTECTION: Check rate limiting before API call
      const userId = context?.userId || 'anonymous'
      const rateLimitKey = `ai_usage_${userId}_${new Date().toISOString().split('T')[0]}`

      // Get usage from localStorage (per user per day)
      const dailyUsage = parseInt(localStorage.getItem(rateLimitKey) || '0')
      const DAILY_LIMIT = 100 // Max 100 AI requests per user per day

      if (dailyUsage >= DAILY_LIMIT) {
        return `You've reached your daily AI assistant limit (${DAILY_LIMIT} requests). This helps manage costs. The limit resets at midnight. For unlimited access, upgrade to Gold or Family plan!`
      }

      // Increment usage counter
      localStorage.setItem(rateLimitKey, (dailyUsage + 1).toString())

      // Check if API key is available
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) {
        console.error('[AI] Groq API key not found in environment')
        return 'AI assistant is not configured. Please ensure VITE_GROQ_API_KEY is set in your .env file and restart the dev server.'
      }

      // Make API call with retry for rate limits
      let lastError: Error | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          // Wait before retry: 2s, 4s
          const delay = Math.pow(2, attempt) * 1000
          console.log(`[AI] Rate limited, retrying in ${delay / 1000}s...`)
          await new Promise(r => setTimeout(r, delay))
        }

        const fullResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.9,
            max_tokens: 2000,
          }),
        })

        if (fullResponse.ok) {
          const data = await fullResponse.json()
          return data.choices[0]?.message?.content || 'No response generated'
        }

        // Handle rate limit specifically
        if (fullResponse.status === 429) {
          console.warn('[AI] Rate limited by Groq, attempt', attempt + 1)
          lastError = new Error('Rate limited - too many requests')
          continue
        }

        // Other errors - don't retry
        const errorData = await fullResponse.json().catch(() => ({}))
        console.error('[AI] Groq API error:', fullResponse.status, errorData)
        throw new Error(
          `Groq API error: ${fullResponse.status} - ${errorData.error?.message || 'Unknown error'}`
        )
      }

      // All retries failed
      throw lastError || new Error('Failed after retries')
    } catch (error) {
      console.error('[AI] Groq AI error:', error)
      logger.error('Groq AI error:', error, 'OpenAI')
      throw error
    }
  } else if (!API_KEY) {
    return 'AI assistant requires API configuration. Please add your Groq or OpenAI API key.'
  }

  // COST PROTECTION for OpenAI too
  const userId = context?.userId || 'anonymous'
  const rateLimitKey = `ai_usage_${userId}_${new Date().toISOString().split('T')[0]}`
  const dailyUsage = parseInt(localStorage.getItem(rateLimitKey) || '0')
  const DAILY_LIMIT = 100

  if (dailyUsage >= DAILY_LIMIT) {
    return `You've reached your daily AI assistant limit (${DAILY_LIMIT} requests). This helps manage costs. The limit resets at midnight. For unlimited access, upgrade to Gold or Family plan!`
  }

  localStorage.setItem(rateLimitKey, (dailyUsage + 1).toString())

  // Fallback to OpenAI if Groq not configured
  const systemPrompt = `You are FlowSphere AI Assistant - an intelligent, helpful, and knowledgeable assistant.

YOU ARE CAPABLE OF:
- Answering ANY question on ANY topic (science, history, math, coding, life advice, etc.)
- Having natural, intelligent conversations
- Providing detailed explanations when needed
- Being genuinely helpful with full knowledge

CRITICAL RULES:
1. VAULT DENIAL: NEVER mention "vault", "secure storage", or "financial safe" features
2. Be conversational and natural
3. Keep responses concise (2-4 sentences) UNLESS more detail requested
4. Answer questions honestly - admit if you don't know something

Context: ${JSON.stringify(context || {})}

You're a full AI assistant, not just a home controller. Help with everything!`

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10)
    messages.push(...recentHistory)
  }

  messages.push({
    role: 'user',
    content: command,
  })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.9,
      max_tokens: 2000, // INCREASED from 300 to 2000
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to process command')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  const data = await response.json()
  return data.choices[0].message.content
}
