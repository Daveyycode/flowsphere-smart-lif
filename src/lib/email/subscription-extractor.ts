/**
 * AI-Powered Subscription Extractor
 * Uses Groq AI to parse subscription emails and extract billing details
 * Core feature for FlowSphere Analysis Board
 */

import { groqChatWithHistory, isGroqConfigured, GroqMessage } from '@/lib/groq-ai'
import { Email } from './email-service'
import { logger } from '@/lib/security-utils'

export interface ExtractedSubscription {
  id: string
  name: string
  serviceName: string
  category:
    | 'streaming'
    | 'software'
    | 'fitness'
    | 'utilities'
    | 'ai-services'
    | 'cloud'
    | 'productivity'
    | 'other'
  amount: number
  currency: string
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly'
  nextBillingDate: string
  lastBillingDate?: string
  detectedFromEmail: string
  confidence: number
  emailCount: number
  senderEmail: string
  status: 'active' | 'cancelled' | 'failed' | 'pending'
  extractedAt: string
}

export interface SubscriptionAnalysis {
  subscriptions: ExtractedSubscription[]
  totalMonthlySpend: number
  totalYearlySpend: number
  upcomingBills: {
    subscription: ExtractedSubscription
    daysUntil: number
    amount: number
  }[]
  insights: string[]
}

// Known subscription services and their typical billing patterns
const KNOWN_SERVICES: Record<
  string,
  {
    category: ExtractedSubscription['category']
    defaultCycle: ExtractedSubscription['billingCycle']
  }
> = {
  anthropic: { category: 'ai-services', defaultCycle: 'monthly' },
  openai: { category: 'ai-services', defaultCycle: 'monthly' },
  claude: { category: 'ai-services', defaultCycle: 'monthly' },
  chatgpt: { category: 'ai-services', defaultCycle: 'monthly' },
  netflix: { category: 'streaming', defaultCycle: 'monthly' },
  spotify: { category: 'streaming', defaultCycle: 'monthly' },
  'apple music': { category: 'streaming', defaultCycle: 'monthly' },
  'youtube premium': { category: 'streaming', defaultCycle: 'monthly' },
  'disney+': { category: 'streaming', defaultCycle: 'monthly' },
  'hbo max': { category: 'streaming', defaultCycle: 'monthly' },
  'amazon prime': { category: 'streaming', defaultCycle: 'yearly' },
  hulu: { category: 'streaming', defaultCycle: 'monthly' },
  adobe: { category: 'software', defaultCycle: 'monthly' },
  'microsoft 365': { category: 'productivity', defaultCycle: 'yearly' },
  'office 365': { category: 'productivity', defaultCycle: 'yearly' },
  'google one': { category: 'cloud', defaultCycle: 'monthly' },
  'icloud+': { category: 'cloud', defaultCycle: 'monthly' },
  dropbox: { category: 'cloud', defaultCycle: 'monthly' },
  notion: { category: 'productivity', defaultCycle: 'monthly' },
  slack: { category: 'productivity', defaultCycle: 'monthly' },
  zoom: { category: 'productivity', defaultCycle: 'monthly' },
  canva: { category: 'software', defaultCycle: 'monthly' },
  figma: { category: 'software', defaultCycle: 'monthly' },
  github: { category: 'software', defaultCycle: 'monthly' },
  aws: { category: 'cloud', defaultCycle: 'monthly' },
  'google cloud': { category: 'cloud', defaultCycle: 'monthly' },
  vercel: { category: 'cloud', defaultCycle: 'monthly' },
  railway: { category: 'cloud', defaultCycle: 'monthly' },
  heroku: { category: 'cloud', defaultCycle: 'monthly' },
  gym: { category: 'fitness', defaultCycle: 'monthly' },
  peloton: { category: 'fitness', defaultCycle: 'monthly' },
}

/**
 * Extract subscription details from emails using Groq AI
 */
export async function extractSubscriptionsFromEmails(
  emails: Email[]
): Promise<ExtractedSubscription[]> {
  if (!emails || emails.length === 0) {
    return []
  }

  // Group emails by sender to identify recurring subscriptions
  const emailsBySender = groupEmailsBySender(emails)
  const extractedSubs: ExtractedSubscription[] = []

  // Process each sender group
  for (const [senderEmail, senderEmails] of emailsBySender.entries()) {
    try {
      const extracted = await extractSubscriptionFromSenderEmails(senderEmail, senderEmails)
      if (extracted) {
        extractedSubs.push(extracted)
      }
    } catch (error) {
      logger.error(`Failed to extract subscription from ${senderEmail}:`, error)
    }
  }

  return extractedSubs
}

/**
 * Group emails by sender email
 */
function groupEmailsBySender(emails: Email[]): Map<string, Email[]> {
  const groups = new Map<string, Email[]>()

  for (const email of emails) {
    const senderKey = email.from.email.toLowerCase()
    if (!groups.has(senderKey)) {
      groups.set(senderKey, [])
    }
    groups.get(senderKey)!.push(email)
  }

  // Sort each group by date (newest first)
  for (const [key, emailList] of groups.entries()) {
    groups.set(
      key,
      emailList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    )
  }

  return groups
}

/**
 * Extract subscription details from a single sender's emails using AI
 */
async function extractSubscriptionFromSenderEmails(
  senderEmail: string,
  emails: Email[]
): Promise<ExtractedSubscription | null> {
  if (emails.length === 0) return null

  const latestEmail = emails[0]
  const emailContent = prepareEmailContentForExtraction(emails.slice(0, 5))

  // First try to detect known service
  const knownService = detectKnownService(
    senderEmail,
    latestEmail.subject,
    latestEmail.body || latestEmail.snippet || ''
  )

  if (isGroqConfigured()) {
    // Use Groq AI for detailed extraction
    return await extractWithGroqAI(senderEmail, emails, emailContent, knownService)
  } else {
    // Fallback to pattern-based extraction
    return extractWithPatterns(senderEmail, emails, knownService)
  }
}

/**
 * Detect if this is a known subscription service
 */
function detectKnownService(
  senderEmail: string,
  subject: string,
  body: string
): { name: string; info: (typeof KNOWN_SERVICES)[string] } | null {
  const searchText = `${senderEmail} ${subject} ${body}`.toLowerCase()

  for (const [serviceName, info] of Object.entries(KNOWN_SERVICES)) {
    if (searchText.includes(serviceName.toLowerCase())) {
      return { name: serviceName, info }
    }
  }

  return null
}

/**
 * Prepare email content for AI extraction
 */
function prepareEmailContentForExtraction(emails: Email[]): string {
  return emails
    .map((email, i) => {
      const content = (email.body || email.snippet || '').substring(0, 1000)
      return `
--- EMAIL ${i + 1} ---
From: ${email.from.name || 'Unknown'} <${email.from.email}>
Subject: ${email.subject}
Date: ${new Date(email.timestamp).toLocaleDateString()}
Content:
${content}
`
    })
    .join('\n')
}

/**
 * Extract subscription using Groq AI
 */
async function extractWithGroqAI(
  senderEmail: string,
  emails: Email[],
  emailContent: string,
  knownService: { name: string; info: (typeof KNOWN_SERVICES)[string] } | null
): Promise<ExtractedSubscription | null> {
  const systemPrompt = `You are FlowSphere's Subscription Extraction AI. Your job is to parse subscription-related emails and extract billing information.

IMPORTANT: Only extract if this is a REAL subscription/billing email (receipts, invoices, payment confirmations, renewal notices).
DO NOT extract from: newsletters, marketing emails, promotional emails, welcome emails without billing info.

Extract the following information in JSON format:
{
  "isSubscription": true/false,
  "serviceName": "Name of the service",
  "amount": 0.00,
  "currency": "USD",
  "billingCycle": "monthly|yearly|weekly|quarterly",
  "status": "active|cancelled|failed|pending",
  "nextBillingDate": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0
}

Rules:
- Amount should be a number (no $ sign)
- If you can't determine something, use null
- Confidence should reflect how certain you are this is a real subscription
- For Anthropic/Claude receipts, these are AI service subscriptions`

  const userPrompt = `Analyze these emails from ${senderEmail} and extract subscription details:

${emailContent}

${knownService ? `NOTE: This appears to be ${knownService.name}, a known ${knownService.info.category} service.` : ''}

Return ONLY valid JSON with the subscription details. If this is NOT a subscription email, return {"isSubscription": false}`

  try {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await groqChatWithHistory(messages, {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 500,
    })

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn('No JSON found in AI response for subscription extraction')
      return extractWithPatterns(senderEmail, emails, knownService)
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.isSubscription || parsed.confidence < 0.5) {
      return null
    }

    // Calculate next billing date if not provided
    let nextBillingDate = parsed.nextBillingDate
    if (!nextBillingDate && emails.length > 0) {
      nextBillingDate = calculateNextBillingDate(
        new Date(emails[0].timestamp),
        parsed.billingCycle || knownService?.info.defaultCycle || 'monthly'
      )
    }

    return {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: parsed.serviceName || knownService?.name || extractServiceNameFromEmail(senderEmail),
      serviceName:
        parsed.serviceName || knownService?.name || extractServiceNameFromEmail(senderEmail),
      category: knownService?.info.category || detectCategory(parsed.serviceName || senderEmail),
      amount: parsed.amount || 0,
      currency: parsed.currency || 'USD',
      billingCycle: parsed.billingCycle || knownService?.info.defaultCycle || 'monthly',
      nextBillingDate: nextBillingDate || '',
      lastBillingDate: emails[0]
        ? new Date(emails[0].timestamp).toISOString().split('T')[0]
        : undefined,
      detectedFromEmail: emails[0].subject,
      confidence: parsed.confidence || 0.7,
      emailCount: emails.length,
      senderEmail: senderEmail,
      status: parsed.status || 'active',
      extractedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.error('Groq AI extraction failed:', error)
    return extractWithPatterns(senderEmail, emails, knownService)
  }
}

/**
 * Fallback pattern-based extraction
 */
function extractWithPatterns(
  senderEmail: string,
  emails: Email[],
  knownService: { name: string; info: (typeof KNOWN_SERVICES)[string] } | null
): ExtractedSubscription | null {
  const latestEmail = emails[0]
  const content =
    `${latestEmail.subject} ${latestEmail.body || latestEmail.snippet || ''}`.toLowerCase()

  // Must have billing-related keywords
  const billingKeywords = [
    'receipt',
    'invoice',
    'payment',
    'charged',
    'billing',
    'subscription',
    'renewal',
    'amount',
  ]
  const hasBillingKeyword = billingKeywords.some(kw => content.includes(kw))

  if (!hasBillingKeyword && !knownService) {
    return null
  }

  // Extract amount using regex patterns
  const amountPatterns = [
    /\$(\d+(?:\.\d{2})?)/,
    /(\d+(?:\.\d{2})?)\s*(?:USD|usd)/,
    /amount[:\s]*\$?(\d+(?:\.\d{2})?)/i,
    /total[:\s]*\$?(\d+(?:\.\d{2})?)/i,
    /charged[:\s]*\$?(\d+(?:\.\d{2})?)/i,
  ]

  let amount = 0
  for (const pattern of amountPatterns) {
    const match = content.match(pattern)
    if (match) {
      amount = parseFloat(match[1])
      break
    }
  }

  // Detect billing cycle
  let billingCycle: ExtractedSubscription['billingCycle'] = 'monthly'
  if (content.includes('annual') || content.includes('yearly') || content.includes('/year')) {
    billingCycle = 'yearly'
  } else if (content.includes('weekly') || content.includes('/week')) {
    billingCycle = 'weekly'
  } else if (content.includes('quarterly') || content.includes('quarter')) {
    billingCycle = 'quarterly'
  }

  const serviceName = knownService?.name || extractServiceNameFromEmail(senderEmail)

  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: serviceName,
    serviceName: serviceName,
    category: knownService?.info.category || detectCategory(serviceName),
    amount: amount,
    currency: 'USD',
    billingCycle: knownService?.info.defaultCycle || billingCycle,
    nextBillingDate: calculateNextBillingDate(new Date(latestEmail.timestamp), billingCycle),
    lastBillingDate: new Date(latestEmail.timestamp).toISOString().split('T')[0],
    detectedFromEmail: latestEmail.subject,
    confidence: knownService ? 0.8 : 0.6,
    emailCount: emails.length,
    senderEmail: senderEmail,
    status: 'active',
    extractedAt: new Date().toISOString(),
  }
}

/**
 * Extract service name from sender email
 */
function extractServiceNameFromEmail(email: string): string {
  // Extract domain without TLD
  const domain = email.split('@')[1] || email
  const parts = domain.split('.')
  const name = parts[0] || domain

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Detect category from service name
 */
function detectCategory(serviceName: string): ExtractedSubscription['category'] {
  const name = serviceName.toLowerCase()

  if (
    ['anthropic', 'openai', 'claude', 'chatgpt', 'gemini', 'mistral'].some(s => name.includes(s))
  ) {
    return 'ai-services'
  }
  if (
    ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'youtube', 'apple music'].some(s =>
      name.includes(s)
    )
  ) {
    return 'streaming'
  }
  if (
    ['aws', 'google cloud', 'azure', 'vercel', 'railway', 'heroku', 'dropbox', 'icloud'].some(s =>
      name.includes(s)
    )
  ) {
    return 'cloud'
  }
  if (['notion', 'slack', 'zoom', 'microsoft', 'office'].some(s => name.includes(s))) {
    return 'productivity'
  }
  if (['adobe', 'figma', 'canva', 'github', 'jetbrains'].some(s => name.includes(s))) {
    return 'software'
  }
  if (['gym', 'fitness', 'peloton', 'workout'].some(s => name.includes(s))) {
    return 'fitness'
  }

  return 'other'
}

/**
 * Calculate next billing date based on last billing and cycle
 */
function calculateNextBillingDate(
  lastBilling: Date,
  cycle: ExtractedSubscription['billingCycle']
): string {
  const next = new Date(lastBilling)

  switch (cycle) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
  }

  // If next billing is in the past, calculate from today
  const today = new Date()
  while (next < today) {
    switch (cycle) {
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + 3)
        break
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1)
        break
    }
  }

  return next.toISOString().split('T')[0]
}

/**
 * Generate subscription analysis with AI insights
 */
export async function analyzeSubscriptions(
  subscriptions: ExtractedSubscription[]
): Promise<SubscriptionAnalysis> {
  // Calculate totals
  let totalMonthly = 0
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue

    switch (sub.billingCycle) {
      case 'weekly':
        totalMonthly += sub.amount * 4
        break
      case 'monthly':
        totalMonthly += sub.amount
        break
      case 'quarterly':
        totalMonthly += sub.amount / 3
        break
      case 'yearly':
        totalMonthly += sub.amount / 12
        break
    }
  }

  // Calculate upcoming bills
  const today = new Date()
  const upcomingBills = subscriptions
    .filter(sub => sub.status === 'active' && sub.nextBillingDate)
    .map(sub => ({
      subscription: sub,
      daysUntil: Math.ceil(
        (new Date(sub.nextBillingDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
      amount: sub.amount,
    }))
    .filter(bill => bill.daysUntil >= 0 && bill.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // Generate insights
  const insights: string[] = []

  if (totalMonthly > 100) {
    insights.push(
      `You're spending $${totalMonthly.toFixed(2)}/month on subscriptions. Consider reviewing for unused services.`
    )
  }

  const aiServices = subscriptions.filter(s => s.category === 'ai-services')
  if (aiServices.length > 1) {
    insights.push(
      `You have ${aiServices.length} AI service subscriptions. Consider consolidating to save money.`
    )
  }

  const dueSoon = upcomingBills.filter(b => b.daysUntil <= 7)
  if (dueSoon.length > 0) {
    const totalDue = dueSoon.reduce((sum, b) => sum + b.amount, 0)
    insights.push(
      `${dueSoon.length} subscription${dueSoon.length > 1 ? 's' : ''} due this week totaling $${totalDue.toFixed(2)}`
    )
  }

  return {
    subscriptions,
    totalMonthlySpend: totalMonthly,
    totalYearlySpend: totalMonthly * 12,
    upcomingBills,
    insights,
  }
}

export default {
  extractSubscriptionsFromEmails,
  analyzeSubscriptions,
}
