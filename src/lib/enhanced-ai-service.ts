/**
 * Enhanced FlowSphere AI Service with Smart Context
 */

import { Device, Automation } from '@/components/devices-automations-view'
import { FamilyMember } from '@/components/family-view'
import { Notification } from '@/components/notifications-view'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIContext {
  devices?: Device[]
  automations?: Automation[]
  familyMembers?: FamilyMember[]
  notifications?: Notification[]
  userName?: string
  subscription?: string
  currentTime?: string
  dndEnabled?: boolean
}

export interface SmartSuggestion {
  id: string
  type: 'action' | 'insight' | 'reminder' | 'optimization'
  title: string
  description: string
  icon: string
  action?: () => void
  priority: 'low' | 'medium' | 'high'
}

/**
 * Generate contextual system prompt
 */
function generateContextPrompt(context: AIContext): string {
  const {
    devices = [],
    automations = [],
    familyMembers = [],
    notifications = [],
    userName = 'User',
    subscription = 'basic',
    currentTime = new Date().toLocaleTimeString(),
    dndEnabled = false,
  } = context

  const deviceCount = devices.length
  const activeDevices = devices.filter(d => d.status === 'online').length
  const autoCount = automations.length
  const activeAutos = automations.filter(a => a.isActive).length
  const unreadNotifs = notifications.filter(n => !n.read).length

  return `You are FlowSphere AI, an intelligent home automation assistant for ${userName}.

Current Status (${currentTime}):
- Devices: ${activeDevices}/${deviceCount} online
- Automations: ${activeAutos}/${autoCount} active
- Notifications: ${unreadNotifs} unread
- Do Not Disturb: ${dndEnabled ? 'ON' : 'OFF'}
- Subscription: ${subscription}
- Family Members: ${familyMembers.length}

Your role:
- Control devices & automations
- Monitor family locations
- Manage notifications & alerts
- Provide traffic & route info
- Suggest optimizations
- Execute voice commands

Be concise, helpful, and proactive. Use emojis sparingly. Always confirm actions before executing.`
}

/**
 * Enhanced AI call with context
 */
export async function callEnhancedAI(
  userMessage: string,
  context: AIContext,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  const systemPrompt = generateContextPrompt(context)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-5), // Keep last 5 messages for context
    { role: 'user', content: userMessage },
  ]

  const provider = (import.meta.env.VITE_AI_PROVIDER || 'groq') as 'groq' | 'openai'
  const groqKey = import.meta.env.VITE_GROQ_API_KEY
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY

  // Try Groq first (faster & cheaper)
  if (provider === 'groq' && groqKey && groqKey !== 'your_groq_api_key_here') {
    try {
      return await callGroq(messages, groqKey)
    } catch (error) {
      console.error('Groq error:', error)
    }
  }

  // Try OpenAI as backup
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    try {
      return await callOpenAI(messages, openaiKey)
    } catch (error) {
      console.error('OpenAI error:', error)
    }
  }

  // Intelligent fallback
  return generateSmartFallback(userMessage, context)
}

async function callGroq(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 200,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callOpenAI(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 200,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

function generateSmartFallback(userMessage: string, context: AIContext): string {
  const msg = userMessage.toLowerCase()
  const { devices = [], familyMembers = [], notifications = [] } = context

  // Device control
  if (msg.includes('light') || msg.includes('lamp')) {
    const lights = devices.filter(d => d.name.toLowerCase().includes('light'))
    return lights.length > 0
      ? `I found ${lights.length} lights. Which one would you like to control?`
      : "I don't see any lights configured. Would you like to add one?"
  }

  // Family tracking
  if (msg.includes('family') || msg.includes('kids') || msg.includes('where')) {
    return familyMembers.length > 0
      ? `All ${familyMembers.length} family members are tracked. Would you like to see their locations?`
      : 'No family members added yet. Add them in the Family section.'
  }

  // Notifications
  if (msg.includes('notification') || msg.includes('alert')) {
    const unread = notifications.filter(n => !n.read).length
    return unread > 0
      ? `You have ${unread} unread notifications. Would you like to review them?`
      : "You're all caught up! No unread notifications."
  }

  // Help
  if (msg.includes('help') || msg.includes('what can you')) {
    return 'I can help you: control devices 💡 | track family 👨‍👩‍👧‍👦 | manage notifications 🔔 | check traffic 🚗 | and more! What do you need?'
  }

  return "I'm here to help! Try asking about your devices, family, notifications, or traffic updates."
}

/**
 * Generate smart suggestions based on context
 */
export function generateSmartSuggestions(context: AIContext): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  const { devices = [], notifications = [], automations = [], dndEnabled = false } = context

  const hour = new Date().getHours()

  // Evening automation suggestion
  if (hour >= 18 && hour < 22) {
    const hasEveningAuto = automations.some(
      a => a.name.toLowerCase().includes('evening') || a.name.toLowerCase().includes('night')
    )
    if (!hasEveningAuto) {
      suggestions.push({
        id: 'evening-auto',
        type: 'optimization',
        title: 'Create Evening Routine',
        description: 'Automatically dim lights and lock doors at sunset',
        icon: '🌙',
        priority: 'medium',
      })
    }
  }

  // Unread notifications
  const unread = notifications.filter(n => !n.read).length
  if (unread > 5) {
    suggestions.push({
      id: 'clear-notifs',
      type: 'reminder',
      title: `${unread} Unread Notifications`,
      description: 'You have pending notifications to review',
      icon: '🔔',
      priority: 'high',
    })
  }

  // Offline devices
  const offline = devices.filter(d => d.status === 'offline').length
  if (offline > 0) {
    suggestions.push({
      id: 'offline-devices',
      type: 'insight',
      title: `${offline} Device${offline > 1 ? 's' : ''} Offline`,
      description: 'Some devices may need attention',
      icon: '⚠️',
      priority: 'medium',
    })
  }

  // DND reminder
  if (dndEnabled && hour >= 8 && hour < 22) {
    suggestions.push({
      id: 'dnd-on',
      type: 'reminder',
      title: 'Do Not Disturb Active',
      description: 'You might miss important alerts',
      icon: '🔕',
      priority: 'low',
    })
  }

  return suggestions.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 }
    return priority[b.priority] - priority[a.priority]
  })
}

/**
 * Generate proactive insights
 */
export function generateProactiveInsights(context: AIContext): string[] {
  const insights: string[] = []
  const { devices = [], automations = [] } = context

  const activeDevices = devices.filter(d => d.status === 'online').length
  const totalDevices = devices.length

  if (totalDevices > 0) {
    const percentage = Math.round((activeDevices / totalDevices) * 100)
    if (percentage === 100) {
      insights.push('✨ All devices are online and running smoothly!')
    } else if (percentage < 50) {
      insights.push(`⚠️ Only ${percentage}% of devices are online. Check your network.`)
    }
  }

  const activeAutomations = automations.filter(a => a.isActive).length
  if (activeAutomations === 0 && automations.length > 0) {
    insights.push('💡 Tip: Enable automations to save time and energy')
  }

  return insights
}
