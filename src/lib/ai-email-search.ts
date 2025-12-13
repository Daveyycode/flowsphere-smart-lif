/**
 * AI Email Search with Path-based Queries and Browser Assistance
 */

import { EmailMessage } from './email-scanner'
import { EmailFolder, searchEmailsByPath } from './email-folder-manager'

export interface SearchResult {
  emails: EmailMessage[]
  folder: string
  count: number
  summary: string
}

export interface BrowserSearchRequest {
  query: string
  context: string
  emailContext?: EmailMessage[]
}

/**
 * Search emails by path (e.g., '/work', '/subscriptions')
 */
export async function searchEmailsByPathQuery(
  pathQuery: string,
  emails: EmailMessage[],
  folders: EmailFolder[]
): Promise<SearchResult> {
  // Extract path from query (e.g., "search /work" -> "/work")
  const pathMatch = pathQuery.match(/\/([\w-]+)/)
  if (!pathMatch) {
    return {
      emails: [],
      folder: '',
      count: 0,
      summary: 'Invalid path format. Use paths like /work, /personal, /subscriptions',
    }
  }

  const path = pathMatch[0] // e.g., "/work"
  const folder = folders.find(f => f.path === path)

  if (!folder) {
    return {
      emails: [],
      folder: path,
      count: 0,
      summary: `Folder "${path}" not found. Available folders: ${folders.map(f => f.path).join(', ')}`,
    }
  }

  const foundEmails = searchEmailsByPath(path, emails, folders)

  // Extract additional search terms from query
  const searchTerms = pathQuery
    .replace(/\/([\w-]+)/, '')
    .trim()
    .toLowerCase()

  // Filter by additional search terms if provided
  const filteredEmails = searchTerms
    ? foundEmails.filter(email => {
        const searchableText = `${email.subject} ${email.from} ${email.body}`.toLowerCase()
        return searchableText.includes(searchTerms)
      })
    : foundEmails

  const summary = generateSearchSummary(filteredEmails, folder, searchTerms)

  return {
    emails: filteredEmails,
    folder: path,
    count: filteredEmails.length,
    summary,
  }
}

/**
 * Generate search summary
 */
function generateSearchSummary(
  emails: EmailMessage[],
  folder: EmailFolder,
  searchTerms: string
): string {
  if (emails.length === 0) {
    return searchTerms
      ? `No emails found in ${folder.path} matching "${searchTerms}"`
      : `No emails found in ${folder.path}`
  }

  const unreadCount = emails.filter(e => !e.read).length
  const importantCount = emails.filter(e => e.important).length

  let summary = `Found ${emails.length} email${emails.length !== 1 ? 's' : ''} in ${folder.path}`

  if (searchTerms) {
    summary += ` matching "${searchTerms}"`
  }

  if (unreadCount > 0) {
    summary += `. ${unreadCount} unread`
  }

  if (importantCount > 0) {
    summary += `, ${importantCount} important`
  }

  // Add preview of recent emails
  if (emails.length > 0) {
    const recentEmails = emails.slice(0, 3)
    summary += '\n\nRecent emails:\n'
    recentEmails.forEach(email => {
      const readStatus = email.read ? '✓' : '•'
      summary += `${readStatus} ${email.subject} (from ${email.from})\n`
    })

    if (emails.length > 3) {
      summary += `\n...and ${emails.length - 3} more`
    }
  }

  return summary
}

/**
 * Parse path-based AI query
 */
export function parsePathQuery(query: string): {
  hasPath: boolean
  path: string
  searchTerms: string
} {
  const pathMatch = query.match(/\/([\w-]+)/)

  if (!pathMatch) {
    return {
      hasPath: false,
      path: '',
      searchTerms: query.trim(),
    }
  }

  return {
    hasPath: true,
    path: pathMatch[0],
    searchTerms: query.replace(/\/([\w-]+)/, '').trim(),
  }
}

/**
 * Search web for email-related information (using browser assistance)
 */
export async function searchWebForEmailContext(request: BrowserSearchRequest): Promise<string> {
  // This would integrate with a web search API or browser search
  // For now, we'll provide a mock implementation that simulates browser search

  const { query, context, emailContext } = request

  // Simulate browser search with relevant suggestions
  let response = `🔍 **Web Search Results for: "${query}"**\n\n`

  // Add context-aware suggestions
  if (context === 'subscription') {
    response += `**Subscription Management Tips:**\n`
    response += `• Check for unused subscriptions in your ${emailContext?.length || 0} subscription emails\n`
    response += `• Look for "unsubscribe" links in promotional emails\n`
    response += `• Consider using subscription tracking services\n\n`
  }

  if (context === 'work') {
    response += `**Work Email Organization:**\n`
    response += `• Set up email filters for different project keywords\n`
    response += `• Use folder rules to auto-categorize team emails\n`
    response += `• Archive completed project emails\n\n`
  }

  if (context === 'financial') {
    response += `**Financial Email Tips:**\n`
    response += `• Save important statements to a secure folder\n`
    response += `• Set up alerts for large transactions\n`
    response += `• Review bank notifications regularly\n\n`
  }

  response += `💡 **Tip:** You can search within specific folders using paths like "/work project" or "/subscriptions unused"\n`

  return response
}

/**
 * Get folder navigation suggestions
 */
export function getFolderSuggestions(folders: EmailFolder[]): string {
  let suggestions = `📁 **Available Email Folders:**\n\n`

  folders.forEach(folder => {
    suggestions += `**${folder.path}** - ${folder.name} (${folder.count} emails)\n`
    suggestions += `   ${folder.description}\n\n`
  })

  suggestions += `\n💡 **Usage Examples:**\n`
  suggestions += `• "search /work meeting" - Find work emails about meetings\n`
  suggestions += `• "show /subscriptions" - View all subscriptions\n`
  suggestions += `• "find /financial from bank" - Find bank-related emails\n`

  return suggestions
}

/**
 * Advanced email search with AI assistance
 */
export async function aiAssistedEmailSearch(
  query: string,
  emails: EmailMessage[],
  folders: EmailFolder[]
): Promise<string> {
  const parsed = parsePathQuery(query)

  // If path-based search
  if (parsed.hasPath) {
    const result = await searchEmailsByPathQuery(query, emails, folders)
    return result.summary
  }

  // General email search across all folders
  const searchTerms = parsed.searchTerms.toLowerCase()

  if (!searchTerms) {
    return getFolderSuggestions(folders)
  }

  // Search across all emails
  const matchingEmails = emails.filter(email => {
    const searchableText = `${email.subject} ${email.from} ${email.body}`.toLowerCase()
    return searchableText.includes(searchTerms)
  })

  if (matchingEmails.length === 0) {
    return `No emails found matching "${searchTerms}". Try searching within specific folders using paths like /work or /personal`
  }

  // Group by folder
  const byFolder: Record<string, EmailMessage[]> = {}

  matchingEmails.forEach(email => {
    folders.forEach(folder => {
      if (folder.emailIds.includes(email.id)) {
        if (!byFolder[folder.path]) {
          byFolder[folder.path] = []
        }
        byFolder[folder.path].push(email)
      }
    })
  })

  let summary = `Found ${matchingEmails.length} email${matchingEmails.length !== 1 ? 's' : ''} matching "${searchTerms}":\n\n`

  Object.entries(byFolder).forEach(([path, folderEmails]) => {
    summary += `**${path}** (${folderEmails.length}):\n`
    folderEmails.slice(0, 2).forEach(email => {
      summary += `  • ${email.subject} (from ${email.from})\n`
    })
    if (folderEmails.length > 2) {
      summary += `  ...and ${folderEmails.length - 2} more\n`
    }
    summary += '\n'
  })

  return summary
}

/**
 * Check if query needs browser assistance
 */
export function needsBrowserAssistance(query: string): boolean {
  const browserKeywords = [
    'search web',
    'google',
    'look up',
    'find online',
    'search for',
    'what is',
    'how to',
    'best way',
    'learn about',
    'research',
  ]

  return browserKeywords.some(keyword => query.toLowerCase().includes(keyword))
}
