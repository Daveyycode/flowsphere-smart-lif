/**
 * Email Service - Multi-provider email integration
 * Supports Gmail, Yahoo Mail, Outlook, and iCloud Mail
 */

import { logger } from '@/lib/security-utils'

export interface EmailAccount {
  id: string
  provider: 'gmail' | 'yahoo' | 'outlook' | 'icloud'
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  isActive: boolean
  connectedAt: string
}

export interface Email {
  id: string
  threadId?: string
  provider: 'gmail' | 'yahoo' | 'outlook' | 'icloud'
  from: {
    email: string
    name: string
  }
  to: Array<{
    email: string
    name?: string
  }>
  subject: string
  body: string
  htmlBody?: string
  snippet: string
  timestamp: string
  read: boolean
  labels?: string[]
  attachments?: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
  }>
  category?: 'emergency' | 'subscription' | 'important' | 'regular' | 'work' | 'personal'
  aiAnalysis?: {
    category: string
    priority: 'high' | 'medium' | 'low'
    summary: string
    tags: string[]
  }
}

export interface SearchOptions {
  query?: string
  from?: string
  to?: string
  subject?: string
  after?: string
  before?: string
  hasAttachment?: boolean
  isUnread?: boolean
  maxResults?: number
  pageToken?: string
}

export interface SearchResult {
  emails: Email[]
  nextPageToken?: string
  totalResults: number
}

/**
 * Base email service class
 */
export abstract class EmailProvider {
  abstract searchEmails(account: EmailAccount, options: SearchOptions): Promise<SearchResult>
  abstract sendEmail(account: EmailAccount, email: {
    to: string[]
    subject: string
    body: string
    html?: string
  }): Promise<void>
  abstract refreshAccessToken(account: EmailAccount): Promise<EmailAccount>
  abstract getNewEmails(account: EmailAccount, since?: string): Promise<Email[]>
}

/**
 * Store email accounts in localStorage
 */
export class EmailAccountStore {
  private static STORAGE_KEY = 'flowsphere-email-accounts'

  static getAccounts(): EmailAccount[] {
    try {
      const accounts = localStorage.getItem(this.STORAGE_KEY)
      return accounts ? JSON.parse(accounts) : []
    } catch (error) {
      logger.error('Failed to get email accounts from storage', error, 'EmailAccountStore')
      return []
    }
  }

  static saveAccount(account: EmailAccount): void {
    const accounts = this.getAccounts()
    const existingIndex = accounts.findIndex(a => a.id === account.id)

    if (existingIndex >= 0) {
      accounts[existingIndex] = account
    } else {
      accounts.push(account)
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
  }

  static removeAccount(accountId: string): void {
    const accounts = this.getAccounts().filter(a => a.id !== accountId)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts))
  }

  static getAccount(accountId: string): EmailAccount | undefined {
    return this.getAccounts().find(a => a.id === accountId)
  }

  static getActiveAccounts(): EmailAccount[] {
    return this.getAccounts().filter(a => a.isActive)
  }
}
