/**
 * Semantic Email Search - AI-powered search with synonyms and related terms
 */

import { Email } from './email-service'
import { emailDatabase } from './email-database'

export interface SearchOptions {
  query: string
  category?: 'emergency' | 'subscription' | 'important' | 'regular' | 'work' | 'personal'
  unreadOnly?: boolean
  limit?: number
}

export interface SearchResult {
  emails: Email[]
  totalCount: number
  categories: Record<string, number>
}

/**
 * Semantic search with AI synonym expansion
 */
export async function semanticEmailSearch(options: SearchOptions): Promise<SearchResult> {
  const { query, category, unreadOnly, limit = 100 } = options

  // Get base emails
  let emails = category ? await emailDatabase.getEmailsByCategory(category) : await getAllEmails()

  // Filter by unread if needed
  if (unreadOnly) {
    emails = emails.filter(e => !e.read)
  }

  // If no query, return all
  if (!query.trim()) {
    return buildResult(emails, limit)
  }

  // Expand query with synonyms and related terms
  const expandedTerms = await expandSearchTerms(query)
  console.log(`🔍 Searching for: ${query}`)
  console.log(`📝 Expanded to: ${expandedTerms.join(', ')}`)

  // Search with all terms
  const results = emails.filter(email => {
    const searchText = `
      ${email.subject}
      ${email.body}
      ${email.snippet}
      ${email.from.name}
      ${email.from.email}
      ${email.to.map(t => t.email).join(' ')}
    `.toLowerCase()

    return expandedTerms.some(term => searchText.includes(term.toLowerCase()))
  })

  // Sort by relevance (count of matching terms)
  results.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, expandedTerms)
    const scoreB = calculateRelevanceScore(b, expandedTerms)
    return scoreB - scoreA
  })

  return buildResult(results, limit)
}

/**
 * Get all emails from database
 */
async function getAllEmails(): Promise<Email[]> {
  try {
    return await emailDatabase.getAllEmails()
  } catch (error) {
    console.error('Failed to get emails:', error)
    return []
  }
}

/**
 * Expand search terms with synonyms and related words
 */
async function expandSearchTerms(query: string): Promise<string[]> {
  const terms = [query]
  const lowerQuery = query.toLowerCase()

  // Common synonyms and related terms
  const synonyms: Record<string, string[]> = {
    dole: ['department of labor', 'labor department', 'employment'],
    bir: ['bureau of internal revenue', 'tax', 'revenue'],
    sss: ['social security', 'social security system'],
    philhealth: ['phil health', 'health insurance'],
    'pag-ibig': ['pagibig', 'hdmf', 'housing fund'],
    meeting: ['conference', 'call', 'zoom', 'meet', 'discussion'],
    urgent: ['important', 'asap', 'critical', 'emergency', 'priority'],
    bill: ['invoice', 'payment', 'billing', 'charge', 'subscription'],
    deadline: ['due date', 'due', 'expires', 'expiration'],
    work: ['office', 'job', 'project', 'task', 'team'],
    personal: ['private', 'family', 'home'],
    spam: ['junk', 'promotional', 'advertisement'],
  }

  // Add synonyms
  Object.entries(synonyms).forEach(([key, values]) => {
    if (lowerQuery.includes(key)) {
      terms.push(...values)
    }
  })

  // Add related words from query
  const words = query.toLowerCase().split(' ')
  words.forEach(word => {
    if (word.length > 3) {
      terms.push(word)
    }
  })

  return [...new Set(terms)] // Remove duplicates
}

/**
 * Calculate relevance score
 */
function calculateRelevanceScore(email: Email, terms: string[]): number {
  let score = 0
  const searchText = `
    ${email.subject}
    ${email.body}
    ${email.snippet}
    ${email.from.name}
    ${email.from.email}
  `.toLowerCase()

  terms.forEach(term => {
    const termLower = term.toLowerCase()
    // Count occurrences
    const matches = (searchText.match(new RegExp(termLower, 'g')) || []).length
    score += matches

    // Bonus for subject matches
    if (email.subject.toLowerCase().includes(termLower)) {
      score += 5
    }

    // Bonus for exact query match
    if (email.subject.toLowerCase().includes(terms[0].toLowerCase())) {
      score += 10
    }
  })

  // Bonus for recent emails
  const age = Date.now() - new Date(email.timestamp).getTime()
  const daysSinceReceived = age / (1000 * 60 * 60 * 24)
  if (daysSinceReceived < 7) score += 3
  if (daysSinceReceived < 1) score += 5

  // Bonus for unread
  if (!email.read) score += 2

  // Bonus for important categories
  if (email.category === 'emergency') score += 10
  if (email.category === 'important') score += 5

  return score
}

/**
 * Build search result
 */
function buildResult(emails: Email[], limit: number): SearchResult {
  const categories: Record<string, number> = {
    emergency: 0,
    important: 0,
    subscription: 0,
    regular: 0,
    work: 0,
    personal: 0,
  }

  emails.forEach(email => {
    const cat = email.category || 'regular'
    categories[cat] = (categories[cat] || 0) + 1
  })

  return {
    emails: emails.slice(0, limit),
    totalCount: emails.length,
    categories,
  }
}

/**
 * Get email statistics for UI
 */
export async function getEmailStats(): Promise<{
  total: number
  urgent: number
  work: number
  personal: number
  subscription: number
  misc: number
}> {
  const stats = await emailDatabase.getStats()

  // Map database categories to UI categories
  // Database: emergency, important, work, personal, subscription, regular
  // UI: urgent, work, personal, subscription, misc
  return {
    total: stats.total,
    urgent: (stats.byCategory['emergency'] || 0) + (stats.byCategory['important'] || 0),
    work: stats.byCategory['work'] || 0,
    personal: stats.byCategory['personal'] || 0,
    subscription: stats.byCategory['subscription'] || 0,
    misc: stats.byCategory['regular'] || 0,
  }
}

/**
 * Trigger reclassification of all emails (call when rules change)
 */
export async function reclassifyAllEmails(): Promise<number> {
  return emailDatabase.reclassifyAllEmails()
}
