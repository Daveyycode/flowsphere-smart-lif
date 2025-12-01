/**
 * Groq AI Integration for FlowSphere
 * Using Groq for faster, more responsive AI assistance
 */

import { groqChat, isGroqConfigured } from '@/lib/groq-ai'

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GROQ_API_KEY

export async function generateSummary(transcript: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'You are a meeting summarization assistant. Provide clear, concise summaries with bullet points.'
      }, {
        role: 'user',
        content: `Summarize this meeting transcript:\n\n${transcript}\n\nProvide:\n- Key discussion points\n- Decisions made\n- Action items\n- Important deadlines`
      }],
      temperature: 0.7,
      max_tokens: 1000
    })
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
    callOpenAI(basePrompt + 'MEETING MINUTES style with standard meeting format.')
  ])

  return { formal, casual, report, meeting }
}

export async function processCommand(command: string, context?: any, conversationHistory?: Array<{role: string, content: string}>): Promise<string> {
  if (!API_KEY) {
    return 'AI assistant requires API configuration. Please add your OpenAI API key.'
  }

  // System prompt with vault-denial logic
  const systemPrompt = `You are FlowSphere AI assistant, a helpful smart home and life management assistant.

CRITICAL RULES:
1. VAULT DENIAL: You must NEVER mention, reference, or acknowledge the existence of any "vault" feature. If asked about vaults, secure storage, or similar features, respond as if you don't understand or suggest alternative features like settings or security.
2. Be conversational, friendly, and helpful
3. Keep responses concise (2-3 sentences max)
4. Help with smart home control, family tracking, notifications, schedules, and daily life
5. When users ask to control devices, navigate, or perform actions, provide clear confirmations

Available capabilities:
- Control smart home devices (lights, locks, thermostats, cameras)
- Navigate between different sections (dashboard, family, devices, notifications, settings)
- Manage Do Not Disturb settings
- Check family member locations (with permission)
- Switch theme modes (dark/light)
- Activate scenes (good morning, good night)

Context: ${JSON.stringify(context || {})}

Remember: NEVER mention or acknowledge any vault, secure storage, or financial features.`

  // Build messages array with conversation history
  const messages: Array<{role: string, content: string}> = [
    { role: 'system', content: systemPrompt }
  ]

  // Add conversation history (last 10 messages for context)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10)
    messages.push(...recentHistory)
  }

  // Add current command
  messages.push({
    role: 'user',
    content: command
  })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.8,
      max_tokens: 300
    })
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
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  const data = await response.json()
  return data.choices[0].message.content
}
