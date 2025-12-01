/**
 * FlowSphere AI Service
 * Supports both Groq (default, cheaper & faster) and OpenAI
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type AIProvider = 'groq' | 'openai'

export async function callFlowSphereAI(messages: ChatMessage[]): Promise<string> {
  const provider: AIProvider = (import.meta.env.VITE_AI_PROVIDER || 'groq') as AIProvider
  const groqKey = import.meta.env.VITE_GROQ_API_KEY
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY

  // Try Groq first (cheaper and faster)
  if (provider === 'groq' && groqKey && groqKey !== 'your_groq_api_key_here') {
    try {
      return await callGroq(messages, groqKey)
    } catch (error) {
      console.error('Groq API error, falling back:', error)
      // Fall through to OpenAI or fallback
    }
  }

  // Try OpenAI as backup
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    try {
      return await callOpenAI(messages, openaiKey)
    } catch (error) {
      console.error('OpenAI API error:', error)
    }
  }

  // Fallback to intelligent responses
  return generateFallbackResponse(messages[messages.length - 1].content)
}

async function callGroq(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Fast, cheap, and powerful
      messages: messages,
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1,
      stream: false
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callOpenAI(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 150
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

function generateFallbackResponse(userInput: string): string {
  const input = userInput.toLowerCase()

  // Provide concise fallback responses
  if (input.includes('how') || input.includes('what') || input.includes('why') || input.includes('when') || input.includes('where')) {
    return "I control devices, automations, family tracking, emails, and navigation. Just tell me what you need."
  }

  if (input.includes('help')) {
    return "I control: devices, scenes, themes, emails, family locations, traffic, and all app features. What do you need?"
  }

  return "I didn't understand that. Try: 'lights', 'darkmode', 'kids', or 'trafficnow'"
}
