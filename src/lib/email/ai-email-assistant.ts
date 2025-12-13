/**
 * AI Email Assistant - Groq-powered intelligent email assistant
 * Actually reads email content and provides real summaries, drafts replies, and helps compose emails
 */

import { groqChat, groqChatWithHistory, GroqMessage, isGroqConfigured } from '@/lib/groq-ai'
import { emailDatabase } from './email-database'
import { Email } from './email-service'
import { logger } from '@/lib/security-utils'

/**
 * URGENT TRIGGER WORDS - Time-sensitive emails (FLAG - can overlap with any category)
 * Includes: emergencies, family matters, hospital/medical, deadlines
 */
const URGENT_TRIGGER_WORDS = [
  // Emergency keywords
  'urgent',
  'asap',
  'immediate',
  'immediately',
  'now',
  'emergency',
  'emergencies',
  'critical',
  'action required',
  'help needed',
  'help me',
  'need help',

  // Family/Personal emergency
  'family emergency',
  'family matter',
  'family issue',
  'mom',
  'dad',
  'parent',
  'child',
  'kids',
  'son',
  'daughter',
  'wife',
  'husband',
  'spouse',
  'accident',
  'injured',
  'hurt',
  'sick',
  'ill',
  'passed away',
  'death',

  // Hospital/Medical
  'hospital',
  'hospitalized',
  'medical',
  'doctor',
  'clinic',
  'er ',
  'emergency room',
  'ambulance',
  'surgery',
  'operation',
  'diagnosis',
  'test results',
  'lab results',
  'prescription',
  'medication',
  'health alert',
  'medical emergency',

  // Work emergencies
  'outage',
  'down',
  'crash',
  'server down',
  'system down',
  'production issue',
  'fix now',
  'call me',
  'call asap',
  'important',
  'high priority',
  'p0',
  'p1',
  'reply by eod',
  'due today',
  'deadline today',
  'due tomorrow',

  // Security/Account
  'account compromised',
  'unauthorized access',
  'security alert',
  'breach',
  'suspicious activity',
  'verify now',
  'action needed immediately',

  // Final notices
  'final notice',
  'last notice',
  'expiring today',
  'expires soon',
  'last chance',
  'account suspended',
  'service termination',
  'payment overdue',
]

/**
 * URGENT SENDER PATTERNS - Senders that indicate urgency
 */
const URGENT_SENDER_PATTERNS = [
  'hospital',
  'clinic',
  'medical',
  'health',
  'emergency',
  'police',
  'fire',
  'ambulance',
  '911',
  'security',
  'fraud',
  'alert',
]

/**
 * SUBSCRIPTION TRIGGER WORDS - For identifying subscription/billing emails
 * Core feature for FlowSphere Analysis Board
 */
const SUBSCRIPTION_TRIGGER_WORDS = [
  // Subscription billing keywords (CRITICAL - core feature)
  'subscription',
  'subscribed',
  'subscriber',
  'membership',
  'billing',
  'billed',
  'invoice',
  'payment',
  'charge',
  'charged',
  'renewal',
  'renew',
  'auto-renew',
  'recurring',
  'monthly',
  'annually',
  'yearly',

  // Payment status
  'payment successful',
  'payment failed',
  'payment declined',
  'payment unsuccessful',
  'payment due',
  'payment received',
  'payment processed',
  'transaction',
  'card declined',
  'update payment',
  'payment method',

  // Subscription status
  'trial started',
  'trial ending',
  'trial expired',
  'free trial',
  'subscription activated',
  'subscription cancelled',
  'subscription canceled',
  'subscription expired',
  'subscription renewed',
  'subscription ending',
  'plan upgraded',
  'plan downgraded',
  'plan changed',

  // Known subscription services
  'netflix',
  'spotify',
  'apple music',
  'youtube premium',
  'disney+',
  'hbo max',
  'amazon prime',
  'hulu',
  'paramount+',
  'peacock',
  'crunchyroll',
  'adobe',
  'microsoft 365',
  'office 365',
  'google one',
  'icloud+',
  'dropbox',
  'notion',
  'slack',
  'zoom',
  'canva',
  'figma',
  'github',

  // Receipt/Invoice patterns
  'receipt',
  'invoice',
  'statement',
  'your order',
  'purchase confirmation',
  'amount:',
  'total:',
  'charged to',
  'paid:',
  'usd',
  'php',
  '$',
]

/**
 * PROMOTIONAL WORDS - NOT subscriptions, just marketing
 */
const PROMOTIONAL_WORDS = [
  'newsletter',
  'digest',
  'weekly',
  'tips',
  'best practices',
  'get the most',
  'promotion',
  'deal',
  'discount',
  'flash sale',
  'exclusive offer',
  'limited time',
  'sale',
  'voucher',
  'coupon',
  'shop now',
  'buy now',
  '% off',
]

/**
 * Check if email has URGENT flag using trigger words AND sender patterns
 * NOTE: Urgent is a FLAG that can overlap with any category
 * Excludes newsletters, promos, retail stores, and AUTH/LOGIN emails from being considered urgent
 */
function hasUrgentFlag(email: Email): boolean {
  const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
  const subject = email.subject.toLowerCase()
  const senderEmail = email.from.email.toLowerCase()
  const senderName = (email.from.name || '').toLowerCase()

  // AUTH/LOGIN EMAILS ARE NEVER URGENT - check this FIRST
  // These are "important" but NOT urgent
  const authKeywords = [
    'sign in',
    'log in',
    'login',
    'signin',
    'secure link',
    'magic link',
    'verification',
    'verify your',
    'verify email',
    'confirm your email',
    'password reset',
    'reset password',
    'forgot password',
    'two-factor',
    '2fa',
    'authentication code',
    'verification code',
    'one-time password',
    'otp',
    'security code',
    "let's get you signed in",
    'sign in to',
    'log in to',
  ]
  const isAuthEmail = authKeywords.some(keyword => text.includes(keyword))

  // Known auth service senders that should NEVER be marked urgent
  const authSenders = [
    'noreply',
    'no-reply',
    'mail.anthropic.com',
    'accounts.google.com',
    'account.google.com',
    'auth0',
    'okta',
    'microsoft.com',
    'apple.com',
    'github.com',
    'gitlab.com',
    'facebook.com',
    'twitter.com',
    'x.com',
  ]
  const isFromAuthSender = authSenders.some(sender => senderEmail.includes(sender))

  // If it's an auth/login email, it's NEVER urgent
  if (isAuthEmail || isFromAuthSender) return false

  // Promotional/retail - these are NEVER urgent
  const isPromo = PROMOTIONAL_WORDS.some(word => text.includes(word))
  const retailStores = ['lazada', 'shopee', 'amazon', 'zalora', 'alibaba', 'aliexpress', 'shein']
  const isFromRetail = retailStores.some(
    store => senderEmail.includes(store) || senderName.includes(store)
  )
  if (isPromo || isFromRetail) return false

  // Check if sender matches urgent sender patterns (hospital, clinic, emergency services)
  const isFromUrgentSender = URGENT_SENDER_PATTERNS.some(
    pattern => senderEmail.includes(pattern) || senderName.includes(pattern)
  )

  // Check for urgent trigger words in content
  const hasUrgentWord = URGENT_TRIGGER_WORDS.some(trigger => text.includes(trigger.toLowerCase()))

  // Check for ALL CAPS subject (but not short subjects like "RE:" or "FWD:")
  const hasAllCapsSubject =
    email.subject.length > 10 && email.subject === email.subject.toUpperCase()

  // Check for multiple exclamation marks
  const hasMultipleExclamations = (email.subject.match(/!/g) || []).length >= 2

  // Family/hospital senders are always considered urgent
  if (isFromUrgentSender) return true

  return hasUrgentWord || hasAllCapsSubject || hasMultipleExclamations
}

export interface AssistantQuery {
  query: string
  category?: string
  timeRange?: 'today' | 'week' | 'month' | 'all'
  emailContext?: Email // For reply drafting
  conversationHistory?: ConversationMessage[] // For multi-turn conversations
}

export interface DraftEmail {
  to: string
  subject: string
  body: string
  replyTo?: Email
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  emails?: Email[]
  timestamp: Date
}

export interface AssistantResponse {
  summary: string
  emails: Email[]
  suggestions: string[]
  queryType:
    | 'search'
    | 'summary'
    | 'action'
    | 'question'
    | 'draft'
    | 'compose'
    | 'analyze'
    | 'compare'
    | 'handoff'
  draftEmail?: DraftEmail
  needsConfirmation?: boolean // For "search other categories?" flow
  confirmationType?: 'search_other_categories' | 'search_archive'
  searchedCategory?: string // What category was searched
  handoffToGeneral?: boolean // When user asks about non-email tasks
  handoffQuery?: string // The query to pass to general assistant
}

/**
 * Quick action templates for common queries
 */
export const QUICK_ACTIONS = [
  {
    label: "What's urgent?",
    query: 'Summarize my urgent emails - what do they say and what action is needed?',
    icon: 'warning',
  },
  {
    label: "Today's summary",
    query: 'Give me a detailed summary of all emails I received today',
    icon: 'briefcase',
  },
  { label: 'Unread overview', query: 'Read and summarize all my unread emails', icon: 'envelope' },
  {
    label: 'Meeting requests',
    query: 'Do I have any meeting requests? What are the details?',
    icon: 'calendar',
  },
  {
    label: 'Action items',
    query: "What emails need me to take action? Be specific about what's needed.",
    icon: 'check',
  },
  { label: 'Work updates', query: 'Summarize my work-related emails from this week', icon: 'user' },
]

/**
 * Detect if a query is NOT related to emails and should be handed off to general assistant
 * Returns null if email-related, or the query to handoff if not email-related
 */
function detectNonEmailQuery(query: string): string | null {
  const lowerQuery = query.toLowerCase()

  // Email-related keywords - if ANY of these are present, it's an email query
  const emailKeywords = [
    'email',
    'emails',
    'mail',
    'inbox',
    'unread',
    'read',
    'reply',
    'forward',
    'draft',
    'compose',
    'send',
    'sent',
    'received',
    'from',
    'subject',
    'attachment',
    'urgent',
    'important',
    'meeting',
    'calendar invite',
    'newsletter',
    'subscription',
    'billing',
    'receipt',
    'notification',
    'alert',
    'message',
    'messages',
    'correspondence',
    'work email',
    'personal email',
    'spam',
    'promotions',
    'updates',
  ]

  // If the query mentions email-related terms, it's an email query
  if (emailKeywords.some(kw => lowerQuery.includes(kw))) {
    return null
  }

  // Non-email queries - general knowledge, tasks, etc.
  const nonEmailPatterns = [
    // General questions
    /^(what|who|when|where|why|how|can you|could you|tell me|explain|define)\s+/i,
    // Weather, news, facts
    /(weather|temperature|news|current events|stock|price|market)/i,
    // Math and calculations
    /(calculate|compute|solve|math|equation|formula)/i,
    // Programming/tech help
    /(code|programming|javascript|python|react|api|database|sql|css|html|bug|error|debug)/i,
    // Tasks and reminders
    /(set (a )?reminder|add (a )?task|create (a )?todo|schedule|timer|alarm)/i,
    // Home automation
    /(turn (on|off)|lights|thermostat|temperature|devices|smart home|lock|camera)/i,
    // General assistance
    /(help me (with|understand|learn)|teach me|show me how|recipe|directions|navigate)/i,
    // Conversational
    /(hello|hi|hey|thanks|thank you|goodbye|bye|how are you)/i,
    // Creative
    /(write a (poem|story|song|joke)|generate|create (a|an) (image|picture|logo))/i,
  ]

  // Check if it matches non-email patterns
  for (const pattern of nonEmailPatterns) {
    if (pattern.test(lowerQuery)) {
      return query // Return original query for handoff
    }
  }

  // If the query is very short and generic (like "hello" or single word), might be handoff
  const words = query.trim().split(/\s+/)
  if (words.length <= 2 && !emailKeywords.some(kw => lowerQuery.includes(kw))) {
    // Check for greetings
    const greetings = ['hello', 'hi', 'hey', 'sup', 'yo', 'thanks', 'thank', 'bye', 'goodbye']
    if (greetings.some(g => lowerQuery.includes(g))) {
      return query
    }
  }

  // Default: treat as email query if unclear
  return null
}

/**
 * Analyze user query to determine intent
 * Enhanced with more action types for conversational AI
 */
async function analyzeQueryIntent(query: string): Promise<{
  searchTerms: string[]
  timeFilter: 'today' | 'week' | 'month' | 'all'
  categoryFilter: string | null
  queryType:
    | 'search'
    | 'summary'
    | 'action'
    | 'question'
    | 'draft'
    | 'compose'
    | 'analyze'
    | 'compare'
  shouldSearchWorkFirst: boolean
  specificKeywords: string[] // e.g., "DOLE" from user query
}> {
  const lowerQuery = query.toLowerCase()

  // Time filter detection
  let timeFilter: 'today' | 'week' | 'month' | 'all' = 'all'
  if (
    lowerQuery.includes('today') ||
    lowerQuery.includes('this morning') ||
    lowerQuery.includes('tonight')
  ) {
    timeFilter = 'today'
  } else if (
    lowerQuery.includes('this week') ||
    lowerQuery.includes('week') ||
    lowerQuery.includes('past few days')
  ) {
    timeFilter = 'week'
  } else if (
    lowerQuery.includes('this month') ||
    lowerQuery.includes('month') ||
    lowerQuery.includes('recently')
  ) {
    timeFilter = 'month'
  }

  // Category filter detection
  // NOTE: "urgent" is handled specially - it's a FLAG, not a category
  // NOTE: "meeting" is handled specially - search for meeting keywords, not just work category
  let categoryFilter: string | null = null
  let shouldSearchWorkFirst = false

  if (
    lowerQuery.includes('urgent') ||
    lowerQuery.includes('important') ||
    lowerQuery.includes('critical')
  ) {
    categoryFilter = 'urgent_flag' // Special flag - will filter by hasUrgentFlag() not category
  } else if (
    lowerQuery.includes('meeting') ||
    lowerQuery.includes('calendar') ||
    lowerQuery.includes('invite') ||
    lowerQuery.includes('schedule')
  ) {
    categoryFilter = 'meeting_search' // Special: search for meeting keywords in content
  } else if (
    lowerQuery.includes('emergency') ||
    lowerQuery.includes('alarm') ||
    lowerQuery.includes('security alert')
  ) {
    categoryFilter = 'emergency' // True emergencies only (security alerts, alarms)
  } else if (
    lowerQuery.includes('work email') ||
    lowerQuery.includes('work emails') ||
    lowerQuery.includes('from work') ||
    lowerQuery.includes('office email')
  ) {
    // User specifically asking for work emails - search work category first
    categoryFilter = 'work'
    shouldSearchWorkFirst = true
  } else if (
    lowerQuery.includes('work') ||
    lowerQuery.includes('project') ||
    lowerQuery.includes('office') ||
    lowerQuery.includes('team')
  ) {
    categoryFilter = 'work'
  } else if (
    lowerQuery.includes('personal') ||
    lowerQuery.includes('family') ||
    lowerQuery.includes('friend')
  ) {
    categoryFilter = 'personal'
  } else if (
    lowerQuery.includes('subscription') ||
    lowerQuery.includes('bill') ||
    lowerQuery.includes('newsletter') ||
    lowerQuery.includes('promo')
  ) {
    categoryFilter = 'subscription'
  }

  // Query type detection - enhanced with analyze, compare, and more actions
  let queryType:
    | 'search'
    | 'summary'
    | 'action'
    | 'question'
    | 'draft'
    | 'compose'
    | 'analyze'
    | 'compare' = 'search'

  // Draft/Reply actions
  if (
    lowerQuery.includes('draft') ||
    lowerQuery.includes('reply') ||
    lowerQuery.includes('respond to') ||
    lowerQuery.includes('respond/reply')
  ) {
    queryType = 'draft'
  }
  // Compose actions
  else if (
    lowerQuery.includes('compose') ||
    lowerQuery.includes('write') ||
    lowerQuery.includes('create email') ||
    lowerQuery.includes('new email') ||
    lowerQuery.includes('create a draft')
  ) {
    queryType = 'compose'
  }
  // Compare actions
  else if (
    lowerQuery.includes('compare') ||
    lowerQuery.includes('which one') ||
    lowerQuery.includes('difference between') ||
    lowerQuery.includes('vs') ||
    lowerQuery.includes('versus')
  ) {
    queryType = 'compare'
  }
  // Analyze actions
  else if (
    lowerQuery.includes('analyze') ||
    lowerQuery.includes('what is it about') ||
    lowerQuery.includes('check sender') ||
    lowerQuery.includes('check raw') ||
    lowerQuery.includes('give comment') ||
    lowerQuery.includes('is it urgent') ||
    lowerQuery.includes('is this') ||
    lowerQuery.includes('tell me about')
  ) {
    queryType = 'analyze'
  }
  // Summary actions
  else if (
    lowerQuery.includes('summary') ||
    lowerQuery.includes('summarize') ||
    lowerQuery.includes('overview') ||
    lowerQuery.includes('what do') ||
    lowerQuery.includes('what are')
  ) {
    queryType = 'summary'
  }
  // Action/To-do items
  else if (
    lowerQuery.includes('action') ||
    lowerQuery.includes('need to') ||
    lowerQuery.includes('should i') ||
    lowerQuery.includes('to-do') ||
    lowerQuery.includes('todo') ||
    lowerQuery.includes('help me')
  ) {
    queryType = 'action'
  }
  // Search actions
  else if (
    lowerQuery.includes('search') ||
    lowerQuery.includes('look for') ||
    lowerQuery.includes('find') ||
    lowerQuery.includes('show me') ||
    lowerQuery.includes('pull')
  ) {
    queryType = 'search'
  }
  // Questions
  else if (
    lowerQuery.startsWith('what') ||
    lowerQuery.startsWith('who') ||
    lowerQuery.startsWith('when') ||
    lowerQuery.startsWith('how') ||
    lowerQuery.startsWith('do i') ||
    lowerQuery.startsWith('did i') ||
    lowerQuery.startsWith('have i') ||
    lowerQuery.includes('?')
  ) {
    queryType = 'question'
  }

  // Extract meaningful search terms
  const stopWords = [
    'the',
    'and',
    'for',
    'are',
    'but',
    'not',
    'you',
    'all',
    'can',
    'had',
    'her',
    'was',
    'one',
    'our',
    'out',
    'has',
    'have',
    'been',
    'from',
    'this',
    'that',
    'what',
    'give',
    'summary',
    'show',
    'find',
    'search',
    'get',
    'any',
    'some',
    'emails',
    'email',
    'inbox',
    'messages',
    'message',
    'please',
    'could',
    'would',
    'about',
    'with',
    'read',
    'tell',
    'summarize',
    'today',
    'week',
    'month',
    'work',
    'personal',
    'urgent',
    'yes',
    'search',
    'other',
    'categories',
    'instead',
  ]

  const searchTerms = query
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word))

  // Extract specific keywords in quotes or CAPS (like "DOLE")
  const quotedMatch = query.match(/"([^"]+)"/g) || []
  const capsMatch = query.match(/\b[A-Z]{2,}\b/g) || []
  const specificKeywords = [...quotedMatch.map(m => m.replace(/"/g, '')), ...capsMatch]

  return {
    searchTerms,
    timeFilter,
    categoryFilter,
    queryType,
    shouldSearchWorkFirst,
    specificKeywords,
  }
}

/**
 * Search emails based on analyzed query
 */
async function searchEmailsForQuery(
  searchTerms: string[],
  timeFilter: 'today' | 'week' | 'month' | 'all',
  categoryFilter: string | null
): Promise<Email[]> {
  let emails: Email[] = []

  // Meeting-related keywords to search for
  const MEETING_KEYWORDS = [
    'meeting',
    'calendar',
    'invite',
    'invitation',
    'schedule',
    'scheduled',
    'zoom',
    'google meet',
    'teams',
    'webex',
    'conference',
    'call',
    'join us',
    'join meeting',
    'rsvp',
    'accept',
    'decline',
    'agenda',
    'appointment',
    'sync',
    'standup',
    'check-in',
  ]

  try {
    // Handle 'urgent_flag' specially - get ALL emails and filter by urgent flag
    if (categoryFilter === 'urgent_flag') {
      const allEmails = await emailDatabase.getAllEmails()
      // Filter by hasUrgentFlag() - this checks trigger words, not category
      emails = allEmails.filter(email => hasUrgentFlag(email))
      logger.info(`Found ${emails.length} emails with urgent flag`)
    } else if (categoryFilter === 'meeting_search') {
      // Search for meeting-related content, not just "work" category
      // IMPORTANT: Only show TODAY and FUTURE meetings (exclude past)
      const allEmails = await emailDatabase.getAllEmails()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0) // Start of today

      emails = allEmails.filter(email => {
        const text = `${email.subject} ${email.body || email.snippet || ''}`.toLowerCase()
        const senderEmail = email.from.email.toLowerCase()

        // Check for meeting keywords in content
        const hasMeetingKeyword = MEETING_KEYWORDS.some(kw => text.includes(kw))
        // Check for calendar/meeting service senders
        const isFromCalendar =
          senderEmail.includes('calendar') ||
          senderEmail.includes('meet') ||
          senderEmail.includes('zoom') ||
          senderEmail.includes('teams')

        // Only include if it has meeting indicators
        if (!hasMeetingKeyword && !isFromCalendar) return false

        // Filter for TODAY and FUTURE only
        // Check email date first
        const emailDate = new Date(email.timestamp)
        if (emailDate >= todayStart) return true

        // Also check if meeting date mentioned in content is today or future
        // Look for date patterns in the email body
        const datePatterns = [
          /\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
          /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i,
          /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
        ]
        const hasFutureDateMention = datePatterns.some(pattern => pattern.test(text))

        // If email is older but mentions future dates, include it
        return hasFutureDateMention
      })
      logger.info(`Found ${emails.length} meeting emails (today + future only)`)
    } else if (categoryFilter) {
      emails = await emailDatabase.getEmailsByCategory(categoryFilter)
    } else {
      emails = await emailDatabase.getAllEmails()
    }

    // Apply time filter
    const now = Date.now()
    if (timeFilter === 'today') {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      emails = emails.filter(e => new Date(e.timestamp).getTime() >= todayStart)
    } else if (timeFilter === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000
      emails = emails.filter(e => new Date(e.timestamp).getTime() >= weekAgo)
    } else if (timeFilter === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000
      emails = emails.filter(e => new Date(e.timestamp).getTime() >= monthAgo)
    }

    // Apply search term filter if any meaningful terms exist
    if (searchTerms.length > 0) {
      const filteredByTerms = emails.filter(email => {
        const searchText =
          `${email.subject} ${email.body || ''} ${email.snippet || ''} ${email.from.name} ${email.from.email}`.toLowerCase()
        return searchTerms.some(term => searchText.includes(term))
      })
      // Only use filtered results if we found matches, otherwise return all (for summary queries)
      if (filteredByTerms.length > 0) {
        emails = filteredByTerms
      }
    }

    // Sort by date (newest first)
    emails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return emails.slice(0, 50)
  } catch (error) {
    logger.error('Failed to search emails:', error)
    return []
  }
}

/**
 * Prepare detailed email content for AI analysis
 * This is the key function that gives AI the actual email content to read
 */
function prepareEmailContentForAI(emails: Email[], maxEmails: number = 15): string {
  if (emails.length === 0) return 'No emails found.'

  return emails
    .slice(0, maxEmails)
    .map((email, i) => {
      const date = new Date(email.timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const category = email.category || 'uncategorized'
      const readStatus = email.read ? '' : '[UNREAD] '

      // Get full email body content - this is what makes the AI actually read emails
      const fullContent = email.body || email.snippet || 'No content available'
      // Limit individual email content but keep enough for meaningful summary
      const content =
        fullContent.length > 1500 ? fullContent.substring(0, 1500) + '...' : fullContent

      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL #${i + 1} ${readStatus}[${category.toUpperCase()}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${date}
From: ${email.from.name || 'Unknown'} <${email.from.email}>
Subject: ${email.subject}

CONTENT:
${content}
`
    })
    .join('\n')
}

/**
 * Generate intelligent AI response using Groq - the brain of the assistant
 */
async function generateAIResponse(
  query: string,
  emails: Email[],
  queryType: 'search' | 'summary' | 'action' | 'question' | 'draft' | 'compose'
): Promise<{ summary: string; draftEmail?: DraftEmail }> {
  if (!isGroqConfigured()) {
    // Use local fallback when API key is not configured
    logger.info('Groq not configured, using local fallback')
    return generateLocalFallbackResponse(query, emails, queryType)
  }

  if (emails.length === 0) {
    return {
      summary:
        "I searched through your inbox but couldn't find any emails matching your request. This could mean:\n\n• No emails exist in that category/timeframe\n• Your email accounts may not be synced yet\n• Try a broader search or different time range\n\nWould you like me to show all your recent emails instead?",
    }
  }

  // Prepare comprehensive email content for AI to actually read
  const emailContent = prepareEmailContentForAI(emails, queryType === 'summary' ? 15 : 10)

  const systemPrompt = `You are FlowSphere's intelligent AI Email Assistant. You are like a human personal assistant who actually reads and understands emails.

YOUR CAPABILITIES:
- Read and comprehend email content thoroughly
- Provide detailed, specific summaries (not just counts)
- Identify action items, deadlines, and important details
- Draft professional email replies
- Help compose new emails
- Prioritize urgent matters

YOUR STYLE:
- Be conversational and helpful, like a human assistant
- Provide SPECIFIC details from emails (names, dates, amounts, topics)
- Use bullet points for clarity
- Highlight urgent items prominently
- Be concise but thorough
- Never just say "I found X emails" - always provide actual content summaries

IMPORTANT: You have access to the FULL email content. Read it carefully and provide meaningful insights.`

  let userPrompt = ''

  switch (queryType) {
    case 'summary':
      userPrompt = `User asked: "${query}"

I need you to READ these emails thoroughly and provide a DETAILED summary. Don't just count them - tell the user WHAT each important email is about.

Here are the emails to read and summarize:
${emailContent}

Please provide:
1. A clear overview of the main topics/themes
2. Specific details from important emails (who sent what, about what)
3. Any urgent items or deadlines mentioned
4. Action items if any

Remember: Be specific! Mention actual names, subjects, and content from the emails.`
      break

    case 'action':
      userPrompt = `User asked: "${query}"

Read these emails and identify ALL action items, tasks, requests, or things requiring the user's attention:
${emailContent}

For each action item found:
- What is the action needed?
- Who requested it?
- When is it due (if mentioned)?
- How urgent is it?

Be specific and thorough. The user is counting on you to not miss anything important.`
      break

    case 'question':
      userPrompt = `User asked: "${query}"

Here are relevant emails to search for the answer:
${emailContent}

Answer the user's question based on the actual email content. Be specific - quote relevant parts if helpful. If the answer isn't in the emails, say so clearly.`
      break

    case 'draft':
      userPrompt = `User asked: "${query}"

Based on these emails, draft a professional reply:
${emailContent}

Create a well-written, professional response that:
- Addresses the key points from the original email
- Is appropriately formal/informal based on the context
- Is clear and concise
- Includes any necessary action items or next steps

Format your response as:
TO: [recipient email]
SUBJECT: [reply subject]
BODY:
[The draft email content]`
      break

    case 'compose':
      userPrompt = `User asked: "${query}"

Help compose a new email based on their request. If they mentioned any context from existing emails:
${emailContent}

Create a professional email that:
- Addresses the user's intent clearly
- Is appropriately formatted
- Includes a clear subject line

Format your response as:
TO: [leave blank if not specified]
SUBJECT: [suggested subject]
BODY:
[The composed email content]`
      break

    default:
      userPrompt = `User searched for: "${query}"

Here are the matching emails I found:
${emailContent}

Provide a helpful overview of what was found. Be specific about the content - mention actual subjects, senders, and key points from the emails. Don't just count them, summarize them meaningfully.`
  }

  try {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await groqChatWithHistory(messages, {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 2048,
    })

    // Parse draft email if applicable
    let draftEmail: DraftEmail | undefined
    if (queryType === 'draft' || queryType === 'compose') {
      const toMatch = response.match(/TO:\s*(.+)/i)
      const subjectMatch = response.match(/SUBJECT:\s*(.+)/i)
      const bodyMatch = response.match(/BODY:\s*([\s\S]+)/i)

      if (subjectMatch && bodyMatch) {
        draftEmail = {
          to: toMatch?.[1]?.trim() || '',
          subject: subjectMatch[1].trim(),
          body: bodyMatch[1].trim(),
        }
      }
    }

    return { summary: response, draftEmail }
  } catch (error) {
    logger.error('AI response generation failed, using local fallback:', error)

    // Use smart local fallback when AI is unavailable
    return generateLocalFallbackResponse(query, emails, queryType)
  }
}

/**
 * Smart local fallback when AI is unavailable
 * Provides useful summaries without external API
 */
function generateLocalFallbackResponse(
  query: string,
  emails: Email[],
  queryType: string
): { summary: string; draftEmail?: DraftEmail } {
  const totalEmails = emails.length
  const unreadEmails = emails.filter(e => !e.read)
  // Use hasUrgentFlag() to detect truly urgent emails (not newsletters/promos)
  const urgentEmails = emails.filter(e => hasUrgentFlag(e))
  const workEmails = emails.filter(e => e.category === 'work')
  const personalEmails = emails.filter(e => e.category === 'personal')
  const subscriptionEmails = emails.filter(e => e.category === 'subscription')

  // Helper to format email preview
  const formatEmail = (email: Email, index: number): string => {
    const date = new Date(email.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    const sender = email.from.name || email.from.email.split('@')[0]
    const unreadMarker = !email.read ? ' [UNREAD]' : ''
    const preview = (email.snippet || email.body || '').substring(0, 100)
    return `${index + 1}. **${email.subject}**${unreadMarker}\n   From: ${sender} (${date})\n   ${preview}${preview.length >= 100 ? '...' : ''}`
  }

  // Helper to extract key words/topics from emails
  const extractTopics = (emailList: Email[]): string[] => {
    const keywords: Record<string, number> = {}
    const importantWords = [
      'meeting',
      'deadline',
      'urgent',
      'important',
      'asap',
      'payment',
      'invoice',
      'project',
      'report',
      'review',
      'approval',
      'confirm',
      'schedule',
      'update',
      'reminder',
      'action',
      'required',
      'please',
      'request',
    ]

    emailList.forEach(email => {
      const text = `${email.subject} ${email.snippet || ''}`.toLowerCase()
      importantWords.forEach(word => {
        if (text.includes(word)) {
          keywords[word] = (keywords[word] || 0) + 1
        }
      })
    })

    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  let summary = ''

  switch (queryType) {
    case 'summary': {
      summary = `📧 **Email Summary** (${totalEmails} emails found)\n\n`

      if (urgentEmails.length > 0) {
        summary += `🚨 **Urgent Items (${urgentEmails.length}):**\n`
        urgentEmails.slice(0, 3).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      }

      if (unreadEmails.length > 0) {
        summary += `📬 **Unread Messages (${unreadEmails.length}):**\n`
        unreadEmails.slice(0, 5).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      }

      const topics = extractTopics(emails)
      if (topics.length > 0) {
        summary += `📌 **Key Topics:** ${topics.join(', ')}\n\n`
      }

      // Category breakdown
      summary += `📊 **Breakdown:**\n`
      summary += `• Work: ${workEmails.length} | Personal: ${personalEmails.length} | Subscriptions: ${subscriptionEmails.length}\n`
      summary += `• Urgent (flagged): ${urgentEmails.length} | Unread: ${unreadEmails.length} of ${totalEmails} total`
      break
    }

    case 'action': {
      summary = `✅ **Action Items Found**\n\n`

      // Look for action-related keywords
      const actionEmails = emails.filter(e => {
        const text = `${e.subject} ${e.snippet || ''}`.toLowerCase()
        return (
          text.includes('action') ||
          text.includes('please') ||
          text.includes('required') ||
          text.includes('deadline') ||
          text.includes('asap') ||
          text.includes('urgent') ||
          text.includes('review') ||
          text.includes('approve') ||
          text.includes('confirm')
        )
      })

      if (actionEmails.length > 0) {
        actionEmails.slice(0, 8).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      } else {
        summary += `No obvious action items detected. Here are your most recent emails:\n\n`
        emails.slice(0, 5).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      }
      break
    }

    case 'question': {
      summary = `🔍 **Search Results for: "${query}"**\n\n`
      summary += `Found ${totalEmails} relevant emails:\n\n`
      emails.slice(0, 8).forEach((e, i) => {
        summary += formatEmail(e, i) + '\n\n'
      })
      break
    }

    case 'draft':
    case 'compose': {
      const targetEmail = emails[0]
      if (targetEmail) {
        const sender = targetEmail.from.name || targetEmail.from.email.split('@')[0]
        summary = `📝 **Draft Reply Suggestion**\n\n`
        summary += `Replying to: "${targetEmail.subject}" from ${sender}\n\n`
        summary += `---\n\n`
        summary += `Hi ${sender},\n\n`
        summary += `Thank you for your email regarding "${targetEmail.subject}".\n\n`
        summary += `[Your response here]\n\n`
        summary += `Best regards`

        return {
          summary,
          draftEmail: {
            to: targetEmail.from.email,
            subject: `Re: ${targetEmail.subject}`,
            body: `Hi ${sender},\n\nThank you for your email regarding "${targetEmail.subject}".\n\n[Your response here]\n\nBest regards`,
          },
        }
      } else {
        summary = `📝 **New Email Draft**\n\n`
        summary += `To: [recipient]\n`
        summary += `Subject: [subject]\n\n`
        summary += `[Your message here]\n\n`
        summary += `Best regards`
      }
      break
    }

    default: {
      summary = `📧 **Found ${totalEmails} emails**\n\n`

      if (unreadEmails.length > 0) {
        summary += `**${unreadEmails.length} unread:**\n`
        unreadEmails.slice(0, 5).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      } else {
        emails.slice(0, 5).forEach((e, i) => {
          summary += formatEmail(e, i) + '\n\n'
        })
      }
    }
  }

  summary += `\n\n---\n_Using local analysis (AI unavailable). Results may be less detailed._`

  return { summary }
}

/**
 * Generate contextual follow-up suggestions
 */
function generateSuggestions(query: string, emails: Email[], queryType: string): string[] {
  const suggestions: string[] = []
  const lowerQuery = query.toLowerCase()

  if (emails.length > 0) {
    const hasUnread = emails.some(e => !e.read)
    const hasWork = emails.some(e => e.category === 'work')
    const hasUrgent = emails.some(e => hasUrgentFlag(e)) // Use trigger words, not category
    const hasPersonal = emails.some(e => e.category === 'personal')

    // Contextual suggestions based on results
    if (hasUnread && !lowerQuery.includes('unread')) {
      suggestions.push('Summarize my unread emails')
    }
    if (hasUrgent && !lowerQuery.includes('urgent')) {
      suggestions.push('What urgent items need attention?')
    }
    if (hasWork && !lowerQuery.includes('work')) {
      suggestions.push('Summarize work emails this week')
    }

    // Reply/compose suggestions
    if (emails.length > 0 && queryType !== 'draft') {
      suggestions.push('Draft a reply to the first email')
    }

    // Sender-based suggestions
    const topSender = emails[0]?.from.name
    if (topSender && suggestions.length < 4) {
      suggestions.push(`Show all emails from ${topSender}`)
    }
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push('What needs my attention today?')
    suggestions.push("Summarize this week's emails")
    suggestions.push('Any upcoming deadlines?')
  }

  return suggestions.slice(0, 4)
}

/**
 * Search work emails in archive (5-year history)
 */
async function searchWorkArchive(
  searchTerms: string[],
  specificKeywords: string[]
): Promise<Email[]> {
  try {
    // Combine search terms and specific keywords
    const allTerms = [...searchTerms, ...specificKeywords]
    if (allTerms.length === 0) {
      return []
    }

    // Search archive with all terms
    const query = allTerms.join(' ')
    const archiveResults = await emailDatabase.searchArchive(query, { yearsBack: 5 })

    logger.info(`📁 Archive search for "${query}": Found ${archiveResults.length} emails`)
    return archiveResults
  } catch (error) {
    logger.error('Archive search failed:', error)
    return []
  }
}

/**
 * Main function: Process user query and return AI-powered response
 * Enhanced with conversational flow and 5-year archive search
 */
export async function askEmailAssistant(input: AssistantQuery): Promise<AssistantResponse> {
  const { query, category, timeRange, emailContext, conversationHistory } = input

  logger.info(`AI Email Assistant query: "${query}"`)

  // Check for non-email queries that should be handed off to general assistant
  const handoffQuery = detectNonEmailQuery(query)
  if (handoffQuery) {
    logger.info(`Non-email query detected, offering handoff: "${query}"`)
    return {
      summary: `This looks like a general question rather than an email-related request. I'm the Email Assistant, so I specialize in managing your inbox.\n\nWould you like me to hand this off to the General AI Assistant? They can help with:\n• General knowledge questions\n• Smart home controls\n• Tasks and reminders\n• And much more!\n\nClick the button below to continue with the General Assistant.`,
      emails: [],
      suggestions: [
        'Show my unread emails',
        'What emails need action?',
        "Summarize today's emails",
      ],
      queryType: 'handoff',
      handoffToGeneral: true,
      handoffQuery: query,
    }
  }

  // Check for user confirmation responses
  const lowerQuery = query.toLowerCase()
  const isYesResponse =
    lowerQuery === 'yes' ||
    lowerQuery === 'yeah' ||
    lowerQuery === 'sure' ||
    lowerQuery === 'ok' ||
    lowerQuery === 'yes please' ||
    lowerQuery.includes('yes')
  const isNoResponse = lowerQuery === 'no' || lowerQuery === 'nope' || lowerQuery === 'no thanks'

  // Check if this is a follow-up to "search other categories?" question
  const lastAssistantMsg = conversationHistory?.filter(m => m.role === 'assistant').slice(-1)[0]
  const wasAskingToSearchOthers = lastAssistantMsg?.content.includes(
    'shall i search on other categories'
  )

  if (wasAskingToSearchOthers && isYesResponse) {
    // User said yes to searching other categories - search ALL emails
    logger.info('User confirmed: Searching all categories')
    const allEmails = await emailDatabase.getAllEmails()
    const lastUserQuery =
      conversationHistory?.filter(m => m.role === 'user').slice(-2)[0]?.content || ''
    const intent = await analyzeQueryIntent(lastUserQuery)

    // Filter by specific keywords
    const filteredEmails = allEmails.filter(email => {
      const text = `${email.subject} ${email.body || ''} ${email.snippet || ''}`.toLowerCase()
      return (
        intent.specificKeywords.some(kw => text.includes(kw.toLowerCase())) ||
        intent.searchTerms.some(term => text.includes(term))
      )
    })

    const { summary } = await generateAIResponse(lastUserQuery, filteredEmails, intent.queryType)

    return {
      summary: `Here are your emails with "${intent.specificKeywords.join(', ')}" from all categories:\n\n${summary}`,
      emails: filteredEmails.slice(0, 10),
      suggestions: ['Summarize these', 'Which one is most relevant?', 'Help me draft a response'],
      queryType: intent.queryType,
      searchedCategory: 'all',
    }
  }

  // Analyze query intent
  const intent = await analyzeQueryIntent(query)

  // Override with explicit filters if provided
  if (category) intent.categoryFilter = category
  if (timeRange) intent.timeFilter = timeRange

  // If we have email context (for replies), prioritize that
  let emails: Email[] = []
  let needsConfirmation = false
  let confirmationType: 'search_other_categories' | 'search_archive' | undefined
  let searchedCategory = intent.categoryFilter || 'all'

  if (emailContext && (intent.queryType === 'draft' || intent.queryType === 'compose')) {
    emails = [emailContext]
  } else if (intent.shouldSearchWorkFirst && intent.specificKeywords.length > 0) {
    // User asking for specific work emails (e.g., "work emails with DOLE")
    // Search work category first
    logger.info(`Searching WORK category first for: ${intent.specificKeywords.join(', ')}`)

    const workEmails = await emailDatabase.getEmailsByCategory('work')
    emails = workEmails.filter(email => {
      const text = `${email.subject} ${email.body || ''} ${email.snippet || ''}`.toLowerCase()
      return (
        intent.specificKeywords.some(kw => text.includes(kw.toLowerCase())) ||
        intent.searchTerms.some(term => text.includes(term))
      )
    })

    searchedCategory = 'work'

    // If not found in work, check archive
    if (emails.length === 0) {
      logger.info('No matches in work category, checking archive...')
      const archiveEmails = await searchWorkArchive(intent.searchTerms, intent.specificKeywords)

      if (archiveEmails.length > 0) {
        emails = archiveEmails
        searchedCategory = 'work (archive)'
      } else {
        // Still not found - offer to search other categories
        needsConfirmation = true
        confirmationType = 'search_other_categories'
      }
    }
  } else {
    emails = await searchEmailsForQuery(
      intent.searchTerms,
      intent.timeFilter,
      intent.categoryFilter
    )
  }

  logger.info(`Found ${emails.length} emails for query`)

  // If no results and we should ask about other categories
  if (needsConfirmation && confirmationType === 'search_other_categories') {
    const keywordStr =
      intent.specificKeywords.length > 0
        ? intent.specificKeywords.join(', ')
        : intent.searchTerms.join(' ')

    return {
      summary: `No such email found in your work category emails for "${keywordStr}".\n\nShall I search on other categories instead?`,
      emails: [],
      suggestions: ['Yes, search all categories', "No, that's fine", 'Search archive (5 years)'],
      queryType: intent.queryType,
      needsConfirmation: true,
      confirmationType: 'search_other_categories',
      searchedCategory: 'work',
    }
  }

  // Generate intelligent AI response
  const { summary, draftEmail } = await generateAIResponse(query, emails, intent.queryType)

  // Generate contextual suggestions based on query type
  let suggestions = generateSuggestions(query, emails, intent.queryType)

  // Add follow-up suggestions based on AI actions user might want
  if (emails.length > 0) {
    const actionSuggestions = [
      'Summarize this',
      'Help me reply to this',
      'What should I do?',
      'Is this urgent?',
      'Compare these emails',
    ]
    suggestions = [...suggestions.slice(0, 2), ...actionSuggestions.slice(0, 2)]
  }

  return {
    summary,
    emails: emails.slice(0, 10),
    suggestions,
    queryType: intent.queryType,
    draftEmail,
    searchedCategory,
  }
}

/**
 * Get email statistics summary - conversational style
 */
export async function getEmailOverview(): Promise<string> {
  try {
    const stats = await emailDatabase.getStats()

    if (stats.total === 0) {
      return "Your inbox is empty! Connect your email accounts to get started. I'll help you manage and summarize your emails."
    }

    // Get all emails and count truly urgent ones using trigger words
    const allEmails = await emailDatabase.getAllEmails()
    const urgent = allEmails.filter(e => hasUrgentFlag(e)).length
    const unread = stats.unread

    let overview = `Hi! I'm your AI Email Assistant. `

    if (unread > 0) {
      overview += `You have ${unread} unread email${unread > 1 ? 's' : ''}. `
    }

    if (urgent > 0) {
      overview += `${urgent} need${urgent === 1 ? 's' : ''} urgent attention! `
    }

    overview += `Ask me to summarize, search, or help draft replies.`

    return overview
  } catch (error) {
    logger.error('Failed to get email overview:', error)
    return "I'm ready to help with your emails! Ask me anything."
  }
}

/**
 * Draft a reply to a specific email
 */
export async function draftReplyToEmail(email: Email, instructions?: string): Promise<DraftEmail> {
  const query = instructions || `Draft a professional reply to this email`

  const response = await askEmailAssistant({
    query,
    emailContext: email,
  })

  if (response.draftEmail) {
    return {
      ...response.draftEmail,
      to: email.from.email,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      replyTo: email,
    }
  }

  // Fallback if parsing failed
  return {
    to: email.from.email,
    subject: `Re: ${email.subject}`,
    body: response.summary,
    replyTo: email,
  }
}

/**
 * Compose a new email based on instructions
 */
export async function composeEmail(instructions: string): Promise<DraftEmail> {
  const response = await askEmailAssistant({
    query: `Compose a new email: ${instructions}`,
  })

  return (
    response.draftEmail || {
      to: '',
      subject: '',
      body: response.summary,
    }
  )
}

export default {
  askEmailAssistant,
  getEmailOverview,
  draftReplyToEmail,
  composeEmail,
  QUICK_ACTIONS,
}
