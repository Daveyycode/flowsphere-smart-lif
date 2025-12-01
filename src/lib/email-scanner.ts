/**
 * AI Email & Subscription Scanner
 * Scans emails, detects subscriptions, identifies wasteful spending
 */

export interface EmailMessage {
  id: string
  from: string
  subject: string
  body: string
  bodyPreview: string // First 200 chars
  timestamp: string
  read: boolean
  important: boolean
  category: 'work' | 'personal' | 'subscription' | 'promotion' | 'spam' | 'financial' | 'social'
  attachments: number
  tags: string[]
}

export interface Subscription {
  id: string
  name: string
  provider: string
  email: string
  cost: number
  currency: string
  frequency: 'monthly' | 'yearly' | 'weekly' | 'one-time'
  nextBilling: string
  lastUsed?: string
  category: 'streaming' | 'software' | 'news' | 'gaming' | 'fitness' | 'education' | 'other'
  status: 'active' | 'trial' | 'cancelled' | 'expired'
  wasteScore: number // 0-100, higher = more wasteful
  recommendation: 'keep' | 'consider-cancel' | 'cancel' | 'downgrade'
  reason: string
}

export interface EmailInsight {
  totalEmails: number
  unreadCount: number
  importantCount: number
  subscriptionCount: number
  promotionalCount: number
  wasteEstimate: {
    totalWasted: number
    currency: string
    breakdown: Array<{
      subscription: string
      amount: number
      reason: string
    }>
  }
  recommendations: string[]
  summary: string
}

/**
 * Scan emails and categorize them
 */
export function scanEmails(emails: Array<{
  id: string
  from: string
  subject: string
  body: string
  timestamp: string
  read: boolean
}>): EmailMessage[] {
  return emails.map(email => {
    const category = categorizeEmail(email)
    const important = detectImportance(email)
    const tags = extractTags(email)

    return {
      ...email,
      bodyPreview: email.body.substring(0, 200),
      important,
      category,
      attachments: detectAttachments(email.body),
      tags
    }
  })
}

/**
 * Categorize email based on content
 */
function categorizeEmail(email: {
  from: string
  subject: string
  body: string
}): EmailMessage['category'] {
  const from = email.from.toLowerCase()
  const subject = email.subject.toLowerCase()
  const body = email.body.toLowerCase()

  // Check for subscriptions
  if (
    subject.includes('subscription') ||
    subject.includes('billing') ||
    subject.includes('invoice') ||
    subject.includes('payment') ||
    body.includes('unsubscribe') ||
    body.includes('manage subscription')
  ) {
    return 'subscription'
  }

  // Check for promotions
  if (
    subject.includes('sale') ||
    subject.includes('offer') ||
    subject.includes('discount') ||
    subject.includes('%') ||
    body.includes('shop now') ||
    body.includes('limited time')
  ) {
    return 'promotion'
  }

  // Check for financial
  if (
    subject.includes('statement') ||
    subject.includes('balance') ||
    subject.includes('payment') ||
    subject.includes('bank') ||
    from.includes('paypal') ||
    from.includes('stripe')
  ) {
    return 'financial'
  }

  // Check for social
  if (
    from.includes('facebook') ||
    from.includes('twitter') ||
    from.includes('linkedin') ||
    from.includes('instagram') ||
    subject.includes('notification')
  ) {
    return 'social'
  }

  // Check for work
  if (
    from.includes('team') ||
    from.includes('company') ||
    subject.includes('meeting') ||
    subject.includes('project') ||
    body.includes('deadline')
  ) {
    return 'work'
  }

  return 'personal'
}

/**
 * Detect if email is important
 */
function detectImportance(email: {
  from: string
  subject: string
  body: string
}): boolean {
  const subject = email.subject.toLowerCase()
  const body = email.body.toLowerCase()

  // High priority keywords
  const urgentWords = [
    'urgent',
    'important',
    'action required',
    'deadline',
    'expires',
    'due date',
    'final notice',
    'immediate',
    'asap',
    'critical'
  ]

  // Check subject for urgency
  if (urgentWords.some(word => subject.includes(word))) {
    return true
  }

  // Check for personal communication from real people (not automated)
  if (
    !body.includes('unsubscribe') &&
    !body.includes('click here') &&
    body.length < 2000
  ) {
    return true
  }

  return false
}

/**
 * Extract tags from email
 */
function extractTags(email: {
  from: string
  subject: string
  body: string
}): string[] {
  const tags: string[] = []
  const content = (email.subject + ' ' + email.body).toLowerCase()

  // Common tags
  if (content.includes('meeting')) tags.push('meeting')
  if (content.includes('invoice') || content.includes('payment')) tags.push('payment')
  if (content.includes('deadline')) tags.push('deadline')
  if (content.includes('urgent') || content.includes('important')) tags.push('urgent')
  if (content.includes('bill') || content.includes('subscription')) tags.push('subscription')
  if (content.includes('security') || content.includes('password')) tags.push('security')
  if (content.includes('sale') || content.includes('discount')) tags.push('promotion')

  return tags
}

/**
 * Detect number of attachments
 */
function detectAttachments(body: string): number {
  const attachmentIndicators = [
    'attachment',
    'attached',
    'file',
    'document',
    'pdf',
    'image'
  ]

  let count = 0
  attachmentIndicators.forEach(indicator => {
    if (body.toLowerCase().includes(indicator)) {
      count++
    }
  })

  return Math.min(count, 5) // Cap at 5
}

/**
 * Detect subscriptions from emails
 */
export function detectSubscriptions(emails: EmailMessage[]): Subscription[] {
  const subscriptions: Subscription[] = []
  const seen = new Set<string>()

  emails
    .filter(email => email.category === 'subscription' || email.category === 'financial')
    .forEach(email => {
      const subscription = extractSubscriptionInfo(email)
      if (subscription && !seen.has(subscription.name)) {
        seen.add(subscription.name)
        subscriptions.push(subscription)
      }
    })

  return subscriptions
}

/**
 * Extract subscription information from email
 */
function extractSubscriptionInfo(email: EmailMessage): Subscription | null {
  const body = email.body.toLowerCase()
  const subject = email.subject.toLowerCase()

  // Extract cost
  const costMatch = body.match(/\$(\d+\.?\d*)/)||
subject.match(/\$(\d+\.?\d*)/)
  const cost = costMatch ? parseFloat(costMatch[1]) : 0

  // Detect frequency
  let frequency: Subscription['frequency'] = 'monthly'
  if (body.includes('yearly') || body.includes('annual')) frequency = 'yearly'
  if (body.includes('weekly')) frequency = 'weekly'
  if (body.includes('one-time') || body.includes('once')) frequency = 'one-time'

  // Extract provider name
  const fromName = email.from.split('@')[1]?.split('.')[0] || 'Unknown'
  const name = fromName.charAt(0).toUpperCase() + fromName.slice(1)

  // Categorize subscription
  const category = categorizeSubscription(name, body)

  // Calculate waste score
  const wasteScore = calculateWasteScore(cost, frequency, category, email.timestamp)

  // Get recommendation
  const { recommendation, reason } = getSubscriptionRecommendation(wasteScore, cost, frequency)

  if (cost === 0) return null // No cost detected, likely not a subscription

  return {
    id: `sub-${email.id}`,
    name,
    provider: email.from,
    email: email.from,
    cost,
    currency: 'USD',
    frequency,
    nextBilling: calculateNextBilling(email.timestamp, frequency),
    category,
    status: detectSubscriptionStatus(body),
    wasteScore,
    recommendation,
    reason
  }
}

/**
 * Categorize subscription type
 */
function categorizeSubscription(name: string, body: string): Subscription['category'] {
  const lowerName = name.toLowerCase()
  const lowerBody = body.toLowerCase()

  if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('hulu')) {
    return 'streaming'
  }
  if (lowerName.includes('adobe') || lowerName.includes('microsoft') || lowerBody.includes('software')) {
    return 'software'
  }
  if (lowerName.includes('news') || lowerName.includes('times') || lowerBody.includes('newspaper')) {
    return 'news'
  }
  if (lowerName.includes('game') || lowerName.includes('xbox') || lowerName.includes('playstation')) {
    return 'gaming'
  }
  if (lowerName.includes('gym') || lowerName.includes('fitness') || lowerBody.includes('workout')) {
    return 'fitness'
  }
  if (lowerName.includes('course') || lowerName.includes('udemy') || lowerBody.includes('learn')) {
    return 'education'
  }

  return 'other'
}

/**
 * Detect subscription status
 */
function detectSubscriptionStatus(body: string): Subscription['status'] {
  if (body.includes('trial') || body.includes('free trial')) return 'trial'
  if (body.includes('cancelled') || body.includes('canceled')) return 'cancelled'
  if (body.includes('expired')) return 'expired'
  return 'active'
}

/**
 * Calculate waste score (0-100, higher = more wasteful)
 */
function calculateWasteScore(
  cost: number,
  frequency: Subscription['frequency'],
  category: Subscription['category'],
  lastEmail: string
): number {
  let score = 0

  // High cost increases waste score
  const monthlyCost = frequency === 'yearly' ? cost / 12 : cost
  if (monthlyCost > 50) score += 30
  else if (monthlyCost > 20) score += 20
  else if (monthlyCost > 10) score += 10

  // Infrequent emails suggest low usage
  const daysSinceLastEmail = (Date.now() - new Date(lastEmail).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceLastEmail > 60) score += 30
  else if (daysSinceLastEmail > 30) score += 20
  else if (daysSinceLastEmail > 14) score += 10

  // Some categories are often underused
  if (category === 'fitness' || category === 'education') score += 20
  if (category === 'news') score += 10

  return Math.min(score, 100)
}

/**
 * Get subscription recommendation
 */
function getSubscriptionRecommendation(
  wasteScore: number,
  cost: number,
  frequency: Subscription['frequency']
): { recommendation: Subscription['recommendation']; reason: string } {
  if (wasteScore >= 70) {
    return {
      recommendation: 'cancel',
      reason: 'High cost with low apparent usage. Consider cancelling to save money.'
    }
  }

  if (wasteScore >= 50) {
    return {
      recommendation: 'consider-cancel',
      reason: 'Moderate waste detected. Review if you actually use this service regularly.'
    }
  }

  if (wasteScore >= 30 && cost > 20) {
    return {
      recommendation: 'downgrade',
      reason: 'Consider downgrading to a cheaper plan if available.'
    }
  }

  return {
    recommendation: 'keep',
    reason: 'Appears to be actively used and good value.'
  }
}

/**
 * Calculate next billing date
 */
function calculateNextBilling(lastBilling: string, frequency: Subscription['frequency']): string {
  const date = new Date(lastBilling)

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      return 'N/A'
  }

  return date.toISOString()
}

/**
 * Generate email insights
 */
export function generateEmailInsights(
  emails: EmailMessage[],
  subscriptions: Subscription[]
): EmailInsight {
  const unreadCount = emails.filter(e => !e.read).length
  const importantCount = emails.filter(e => e.important).length
  const subscriptionCount = emails.filter(e => e.category === 'subscription').length
  const promotionalCount = emails.filter(e => e.category === 'promotion').length

  // Calculate waste
  const wasteBreakdown = subscriptions
    .filter(sub => sub.wasteScore >= 50)
    .map(sub => ({
      subscription: sub.name,
      amount: sub.frequency === 'yearly' ? sub.cost : sub.cost * 12,
      reason: sub.reason
    }))

  const totalWasted = wasteBreakdown.reduce((sum, item) => sum + item.amount, 0)

  // Generate recommendations
  const recommendations: string[] = []

  if (totalWasted > 100) {
    recommendations.push(`💰 Cancel unused subscriptions to save $${totalWasted.toFixed(2)}/year`)
  }

  if (unreadCount > 50) {
    recommendations.push(`📧 ${unreadCount} unread emails - consider unsubscribing from newsletters`)
  }

  if (promotionalCount > 20) {
    recommendations.push(`🛍️ Too many promotional emails - mark as spam or unsubscribe`)
  }

  const subscriptionCancellations = subscriptions.filter(s => s.recommendation === 'cancel').length
  if (subscriptionCancellations > 0) {
    recommendations.push(`❌ ${subscriptionCancellations} subscriptions recommended for cancellation`)
  }

  // Generate summary
  let summary = `Analyzed ${emails.length} emails. `
  summary += `${importantCount} important, ${unreadCount} unread. `

  if (subscriptions.length > 0) {
    summary += `Found ${subscriptions.length} subscriptions. `
  }

  if (totalWasted > 0) {
    summary += `Potential savings: $${totalWasted.toFixed(2)}/year.`
  }

  return {
    totalEmails: emails.length,
    unreadCount,
    importantCount,
    subscriptionCount,
    promotionalCount,
    wasteEstimate: {
      totalWasted,
      currency: 'USD',
      breakdown: wasteBreakdown
    },
    recommendations,
    summary
  }
}

/**
 * Filter emails by importance (for bed mode)
 */
export function filterImportantEmails(emails: EmailMessage[]): {
  important: EmailMessage[]
  notImportant: EmailMessage[]
} {
  const important = emails.filter(email =>
    email.important ||
    email.category === 'work' ||
    email.category === 'financial' ||
    email.tags.includes('urgent') ||
    email.tags.includes('deadline')
  )

  const notImportant = emails.filter(email => !important.includes(email))

  return { important, notImportant }
}

/**
 * Generate morning email digest (title and preview only, no full body)
 */
export function generateMorningDigest(emails: EmailMessage[]): {
  title: string
  important: Array<{ from: string; subject: string; preview: string }>
  count: number
  needsAttention: boolean
} {
  const { important } = filterImportantEmails(emails.filter(e => !e.read))

  const digest = {
    title: important.length > 0
      ? `☀️ Good Morning! ${important.length} important email${important.length > 1 ? 's' : ''}`
      : '☀️ Good Morning! No urgent emails',
    important: important.slice(0, 5).map(email => ({
      from: email.from,
      subject: email.subject,
      preview: email.bodyPreview
    })),
    count: important.length,
    needsAttention: important.length > 0
  }

  return digest
}
