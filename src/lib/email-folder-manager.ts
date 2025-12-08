/**
 * Email Folder Management System
 * Auto-categorizes emails into folders and allows user verification
 */

import { EmailMessage } from './email-scanner'

export interface EmailFolder {
  id: string
  name: string
  path: string // e.g., '/work', '/personal/family'
  icon: string
  color: string
  description: string
  emailIds: string[]
  autoCategory: boolean
  rules: FolderRule[]
  count: number
}

export interface FolderRule {
  type: 'sender' | 'subject' | 'keyword' | 'domain'
  value: string
  match: 'contains' | 'exact' | 'startsWith' | 'endsWith'
}

export interface EmailCategorization {
  emailId: string
  suggestedFolder: string
  confidence: number // 0-100
  reasons: string[]
  verified: boolean
}

export interface FolderSuggestion {
  folder: string
  path: string
  confidence: number
  reason: string
}

/**
 * Default email folders
 */
export const DEFAULT_FOLDERS: EmailFolder[] = [
  {
    id: 'work',
    name: 'Work',
    path: '/work',
    icon: 'briefcase',
    color: '#3b82f6',
    description: 'Work-related emails, meetings, and projects',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'meeting', match: 'contains' },
      { type: 'keyword', value: 'project', match: 'contains' },
      { type: 'keyword', value: 'deadline', match: 'contains' },
      { type: 'keyword', value: 'team', match: 'contains' },
      { type: 'subject', value: 're:', match: 'startsWith' },
      { type: 'subject', value: 'fwd:', match: 'startsWith' }
    ],
    count: 0
  },
  {
    id: 'subscriptions',
    name: 'Subscriptions',
    path: '/subscriptions',
    icon: 'receipt',
    color: '#f59e0b',
    description: 'Subscription services and recurring payments',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'subscription', match: 'contains' },
      { type: 'keyword', value: 'billing', match: 'contains' },
      { type: 'keyword', value: 'invoice', match: 'contains' },
      { type: 'keyword', value: 'payment', match: 'contains' },
      { type: 'keyword', value: 'unsubscribe', match: 'contains' },
      { type: 'keyword', value: 'renewal', match: 'contains' }
    ],
    count: 0
  },
  {
    id: 'financial',
    name: 'Financial',
    path: '/financial',
    icon: 'currency-dollar',
    color: '#10b981',
    description: 'Banking, payments, and financial statements',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'statement', match: 'contains' },
      { type: 'keyword', value: 'balance', match: 'contains' },
      { type: 'keyword', value: 'transaction', match: 'contains' },
      { type: 'domain', value: 'paypal.com', match: 'contains' },
      { type: 'domain', value: 'stripe.com', match: 'contains' },
      { type: 'domain', value: 'bank', match: 'contains' }
    ],
    count: 0
  },
  {
    id: 'personal',
    name: 'Personal',
    path: '/personal',
    icon: 'user',
    color: '#8b5cf6',
    description: 'Personal emails from friends and family',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'personal', match: 'contains' }
    ],
    count: 0
  },
  {
    id: 'social',
    name: 'Social Media',
    path: '/social',
    icon: 'users',
    color: '#ec4899',
    description: 'Social network notifications',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'domain', value: 'facebook.com', match: 'contains' },
      { type: 'domain', value: 'twitter.com', match: 'contains' },
      { type: 'domain', value: 'linkedin.com', match: 'contains' },
      { type: 'domain', value: 'instagram.com', match: 'contains' },
      { type: 'keyword', value: 'notification', match: 'contains' }
    ],
    count: 0
  },
  {
    id: 'promotions',
    name: 'Promotions',
    path: '/promotions',
    icon: 'tag',
    color: '#ef4444',
    description: 'Sales, offers, and marketing emails',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'sale', match: 'contains' },
      { type: 'keyword', value: 'offer', match: 'contains' },
      { type: 'keyword', value: 'discount', match: 'contains' },
      { type: 'keyword', value: '%', match: 'contains' },
      { type: 'keyword', value: 'shop now', match: 'contains' }
    ],
    count: 0
  },
  {
    id: 'important',
    name: 'Important',
    path: '/important',
    icon: 'star',
    color: '#fbbf24',
    description: 'Urgent and important emails',
    emailIds: [],
    autoCategory: true,
    rules: [
      { type: 'keyword', value: 'urgent', match: 'contains' },
      { type: 'keyword', value: 'important', match: 'contains' },
      { type: 'keyword', value: 'action required', match: 'contains' },
      { type: 'keyword', value: 'deadline', match: 'contains' }
    ],
    count: 0
  }
]

/**
 * Auto-categorize emails into folders
 */
export function autoCategorizEmails(
  emails: EmailMessage[],
  folders: EmailFolder[] = DEFAULT_FOLDERS
): EmailCategorization[] {
  const categorizations: EmailCategorization[] = []

  emails.forEach(email => {
    const suggestions = suggestFoldersForEmail(email, folders)

    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0]

      categorizations.push({
        emailId: email.id,
        suggestedFolder: topSuggestion.path,
        confidence: topSuggestion.confidence,
        reasons: [topSuggestion.reason],
        verified: false
      })
    } else {
      // Default to personal if no matches
      categorizations.push({
        emailId: email.id,
        suggestedFolder: '/personal',
        confidence: 50,
        reasons: ['No specific category matched - defaulting to personal'],
        verified: false
      })
    }
  })

  return categorizations
}

/**
 * Suggest folders for a single email
 */
export function suggestFoldersForEmail(
  email: EmailMessage,
  folders: EmailFolder[]
): FolderSuggestion[] {
  const suggestions: FolderSuggestion[] = []

  folders.forEach(folder => {
    const matchScore = calculateFolderMatch(email, folder)

    if (matchScore > 0) {
      suggestions.push({
        folder: folder.name,
        path: folder.path,
        confidence: matchScore,
        reason: generateMatchReason(email, folder)
      })
    }
  })

  // Sort by confidence (highest first)
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Calculate how well an email matches a folder's rules
 */
function calculateFolderMatch(email: EmailMessage, folder: EmailFolder): number {
  let score = 0
  let matchedRules = 0

  const emailLower = {
    from: email.from.toLowerCase(),
    subject: email.subject.toLowerCase(),
    body: email.body.toLowerCase()
  }

  const domain = email.from.split('@')[1]?.toLowerCase() || ''

  folder.rules.forEach(rule => {
    const value = rule.value.toLowerCase()
    let matched = false

    switch (rule.type) {
      case 'sender':
        matched = matchText(emailLower.from, value, rule.match)
        break
      case 'subject':
        matched = matchText(emailLower.subject, value, rule.match)
        break
      case 'keyword':
        matched =
          matchText(emailLower.subject, value, rule.match) ||
          matchText(emailLower.body, value, rule.match)
        break
      case 'domain':
        matched = matchText(domain, value, rule.match)
        break
    }

    if (matched) {
      matchedRules++
      score += 20 // Each rule match adds 20 points
    }
  })

  // Also consider the email's existing category
  if (email.category) {
    const categoryBonus = getCategoryBonus(email.category, folder.id)
    score += categoryBonus
  }

  // Cap at 100
  return Math.min(score, 100)
}

/**
 * Match text based on rule
 */
function matchText(text: string, value: string, match: FolderRule['match']): boolean {
  switch (match) {
    case 'contains':
      return text.includes(value)
    case 'exact':
      return text === value
    case 'startsWith':
      return text.startsWith(value)
    case 'endsWith':
      return text.endsWith(value)
    default:
      return false
  }
}

/**
 * Get bonus points if email category matches folder
 */
function getCategoryBonus(
  category: EmailMessage['category'],
  folderId: string
): number {
  const mapping: Record<string, string[]> = {
    work: ['work'],
    subscription: ['subscriptions'],
    financial: ['financial'],
    personal: ['personal'],
    social: ['social'],
    promotion: ['promotions']
  }

  const matchingFolders = mapping[category] || []
  return matchingFolders.includes(folderId) ? 30 : 0
}

/**
 * Generate reason for folder match
 */
function generateMatchReason(email: EmailMessage, folder: EmailFolder): string {
  const reasons: string[] = []

  folder.rules.forEach(rule => {
    const value = rule.value.toLowerCase()

    switch (rule.type) {
      case 'sender':
        if (email.from.toLowerCase().includes(value)) {
          reasons.push(`Sender matches "${value}"`)
        }
        break
      case 'subject':
        if (email.subject.toLowerCase().includes(value)) {
          reasons.push(`Subject contains "${value}"`)
        }
        break
      case 'keyword':
        if (
          email.subject.toLowerCase().includes(value) ||
          email.body.toLowerCase().includes(value)
        ) {
          reasons.push(`Contains keyword "${value}"`)
        }
        break
      case 'domain': {
        const domain = email.from.split('@')[1]?.toLowerCase() || ''
        if (domain.includes(value)) {
          reasons.push(`From ${value} domain`)
        }
        break
      }
    }
  })

  return reasons.length > 0 ? reasons[0] : 'Pattern match'
}

/**
 * Apply categorizations to folders
 */
export function applyCategorizationsToFolders(
  categorizations: EmailCategorization[],
  folders: EmailFolder[]
): EmailFolder[] {
  const updatedFolders = folders.map(folder => ({ ...folder, emailIds: [] as string[], count: 0 }))

  categorizations.forEach(cat => {
    if (cat.verified || cat.confidence >= 70) {
      const folder = updatedFolders.find(f => f.path === cat.suggestedFolder)
      if (folder) {
        folder.emailIds.push(cat.emailId)
        folder.count++
      }
    }
  })

  return updatedFolders
}

/**
 * Search emails in specific folder path
 */
export function searchEmailsByPath(
  path: string,
  emails: EmailMessage[],
  folders: EmailFolder[]
): EmailMessage[] {
  const folder = folders.find(f => f.path === path)
  if (!folder) return []

  return emails.filter(email => folder.emailIds.includes(email.id))
}

/**
 * Get folder statistics
 */
export function getFolderStats(folders: EmailFolder[]): {
  totalFolders: number
  totalCategorized: number
  mostPopularFolder: string
  uncategorized: number
} {
  const totalCategorized = folders.reduce((sum, f) => sum + f.count, 0)
  const mostPopular = folders.reduce((max, f) =>
    f.count > max.count ? f : max
  , folders[0])

  return {
    totalFolders: folders.length,
    totalCategorized,
    mostPopularFolder: mostPopular?.name || 'None',
    uncategorized: 0 // Will be calculated when comparing with total emails
  }
}

/**
 * Create custom folder
 */
export function createCustomFolder(
  name: string,
  icon: string,
  color: string,
  rules: FolderRule[]
): EmailFolder {
  const path = '/' + name.toLowerCase().replace(/\s+/g, '-')

  return {
    id: `custom-${Date.now()}`,
    name,
    path,
    icon,
    color,
    description: `Custom folder: ${name}`,
    emailIds: [],
    autoCategory: true,
    rules,
    count: 0
  }
}

/**
 * Move email to different folder
 */
export function moveEmailToFolder(
  emailId: string,
  fromFolder: string,
  toFolder: string,
  folders: EmailFolder[]
): EmailFolder[] {
  return folders.map(folder => {
    if (folder.path === fromFolder) {
      return {
        ...folder,
        emailIds: folder.emailIds.filter(id => id !== emailId),
        count: folder.count - 1
      }
    }
    if (folder.path === toFolder) {
      return {
        ...folder,
        emailIds: [...folder.emailIds, emailId],
        count: folder.count + 1
      }
    }
    return folder
  })
}
