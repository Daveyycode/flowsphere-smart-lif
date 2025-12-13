/**
 * Email Monitor - Real-time email monitoring service
 * Checks for new emails periodically and triggers alerts
 */

import { logger } from '@/lib/security-utils'
import { EmailAccountStore, Email } from './email-service'
import { GmailProvider } from './gmail-provider'
import { EmailAIClassifier } from './email-ai-classifier'
import { emailDatabase } from './email-database'
import { toast } from 'sonner'

export interface EmailAlert {
  email: Email
  classification: any
  timestamp: string
}

export class EmailMonitor {
  private checkInterval: number = 30 * 1000 // 30 seconds (faster for testing)
  private intervalId: NodeJS.Timeout | null = null
  private lastCheckTimes: Map<string, string> = new Map()
  private gmailProvider: GmailProvider
  private aiClassifier: EmailAIClassifier
  private onNewEmail?: (alert: EmailAlert) => void

  constructor() {
    this.gmailProvider = new GmailProvider()
    this.aiClassifier = new EmailAIClassifier()
    // Initialize database
    emailDatabase.init().catch(err => logger.error('Failed to init email database:', err))
  }

  /**
   * Start monitoring emails
   */
  start(onNewEmail?: (alert: EmailAlert) => void): void {
    if (this.intervalId) {
      logger.info('⚠️ Email monitor already running')
      return
    }

    this.onNewEmail = onNewEmail

    logger.info('🚀 Starting email monitor...')
    logger.info(`⏱️  Check interval: ${this.checkInterval / 1000} seconds`)

    // Initial check
    this.checkNewEmails()

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkNewEmails()
    }, this.checkInterval)

    logger.info('✅ Email monitor started successfully')
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('Email monitor stopped')
    }
  }

  /**
   * Check for new emails across all accounts
   */
  private async checkNewEmails(): Promise<void> {
    const accounts = EmailAccountStore.getActiveAccounts()

    for (const account of accounts) {
      try {
        if (account.provider === 'gmail') {
          await this.checkGmailAccount(account)
        }
        // Add Yahoo and Outlook later
      } catch (error) {
        logger.error(`Failed to check ${account.provider} account:`, error)
      }
    }
  }

  /**
   * Check Gmail account for new emails
   */
  private async checkGmailAccount(account: any): Promise<void> {
    try {
      logger.info(`📬 Checking Gmail account: ${account.email}`)
      logger.info(`🔑 Token expires at: ${new Date(account.expiresAt).toLocaleString()}`)
      logger.info(`⏰ Current time: ${new Date().toLocaleString()}`)

      // Check if token is expired or about to expire (within 5 minutes)
      const isExpired = Date.now() >= account.expiresAt
      const isExpiringSoon = Date.now() >= account.expiresAt - 5 * 60 * 1000

      if (isExpired || isExpiringSoon) {
        logger.info(`🔄 Access token ${isExpired ? 'expired' : 'expiring soon'}, refreshing...`)

        try {
          // Check if we have a refresh token
          if (!account.refreshToken) {
            logger.error('❌ No refresh token available - need to reconnect')
            toast.error('Gmail session expired - please reconnect your account', {
              description: 'Go to Settings → Email to reconnect',
              duration: 8000,
            })
            return
          }

          const refreshedAccount = await this.gmailProvider.refreshAccessToken(account)
          logger.info(
            `✅ Token refreshed successfully! New expiry: ${new Date(refreshedAccount.expiresAt).toLocaleString()}`
          )

          // Update account in storage
          EmailAccountStore.saveAccount(refreshedAccount)

          // Use refreshed account for this check
          account = refreshedAccount

          toast.success('Gmail access token refreshed automatically')
        } catch (refreshError: unknown) {
          logger.error(`❌ Failed to refresh token:`, refreshError)

          // Provide more specific error message
          const errorMessage =
            refreshError instanceof Error ? refreshError.message : 'Unknown error'

          if (errorMessage.includes('invalid_grant')) {
            // Refresh token has been revoked or expired
            toast.error('Gmail refresh token expired', {
              description: 'Please reconnect your Gmail account in Settings → Email',
              duration: 10000,
            })
          } else if (errorMessage.includes('invalid_client')) {
            // Client credentials issue
            toast.error('Gmail API configuration error', {
              description: 'Please check your Google API credentials',
              duration: 10000,
            })
          } else {
            toast.error('Gmail access expired', {
              description: 'Please reconnect your account in Settings → Email',
              duration: 8000,
            })
          }
          return
        }
      }

      const lastCheck = this.lastCheckTimes.get(account.id)
      // Extended initial check window to 24 hours instead of 5 minutes
      const since = lastCheck || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      logger.info(`📅 Checking emails since: ${since}`)
      logger.info(`📅 Last check was: ${lastCheck || 'NEVER (first check)'}`)

      const newEmails = await this.gmailProvider.getNewEmails(account, since.split('T')[0])

      logger.info(`✅ Gmail API returned ${newEmails.length} emails`)

      if (newEmails.length > 0) {
        logger.info(`📧 Sample email timestamps:`)
        newEmails.slice(0, 3).forEach(email => {
          logger.info(`  - ${email.subject} at ${email.timestamp}`)
        })
      }

      // Filter emails newer than last check
      const sinceTime = new Date(since).getTime()
      const recentEmails = newEmails.filter(
        email => new Date(email.timestamp).getTime() > sinceTime
      )

      if (recentEmails.length > 0) {
        logger.info(`📧 Found ${recentEmails.length} NEW emails to process`)

        // Classify emails with AI FIRST, then store
        const classifiedEmails: Email[] = []
        for (const email of recentEmails) {
          logger.info(`  Classifying: ${email.subject} from ${email.from.email}`)
          try {
            const classification = await this.aiClassifier.classifyEmail(email)
            classifiedEmails.push({
              ...email,
              category: classification.category,
              aiAnalysis: {
                category: classification.category,
                priority: classification.priority,
                summary: classification.summary,
                tags: classification.tags,
              },
            })
          } catch (error) {
            logger.error(`Failed to classify email: ${email.subject}`, error)
            classifiedEmails.push(email) // Store unclassified
          }
        }

        // Store all classified emails in database
        try {
          await emailDatabase.storeEmails(classifiedEmails)
          logger.info(
            `💾 Stored ${classifiedEmails.length} emails in database (with AI classification)`
          )
        } catch (error) {
          logger.error('Failed to store emails in database:', error)
        }

        // Now process for alerts
        for (const email of classifiedEmails) {
          await this.processNewEmail(email)
        }
      } else {
        logger.info(`✓ No new emails since last check`)
        if (newEmails.length > 0) {
          logger.info(`  (All ${newEmails.length} emails were older than ${since})`)
        }
      }

      // Store all emails in database (including old ones for search)
      if (newEmails.length > 0 && !lastCheck) {
        // First check - store all emails for initial database
        logger.info(`📚 Initial sync: storing ${newEmails.length} emails for search`)
        try {
          await emailDatabase.storeEmails(newEmails)
        } catch (error) {
          logger.error('Failed to store emails for search:', error)
        }
      }

      // Update last check time
      this.lastCheckTimes.set(account.id, new Date().toISOString())
      logger.info(`✓ Check complete. Next check in ${this.checkInterval / 1000}s`)
    } catch (error) {
      logger.error(`❌ Error checking Gmail account ${account.email}:`, error)
      if (error instanceof Error) {
        logger.error(`Error message: ${error.message}`)
        logger.error(`Error stack: ${error.stack}`)
      }

      // Check for specific API errors
      if (error instanceof Error && error.message.includes('401')) {
        toast.error('Gmail authentication expired - please reconnect')
      } else if (error instanceof Error && error.message.includes('403')) {
        toast.error('Gmail API access denied - check permissions')
      }
    }
  }

  /**
   * Process new email - create alert and notify (email already classified)
   */
  private async processNewEmail(email: Email): Promise<void> {
    try {
      // Email is already classified, use existing analysis
      const classification = email.aiAnalysis || {
        category: email.category || 'regular',
        priority: 'medium' as const,
        summary: email.subject,
        tags: [],
      }

      // Create alert
      const alert: EmailAlert = {
        email,
        classification,
        timestamp: new Date().toISOString(),
      }

      // Store in localStorage
      this.storeAlert(alert)

      // Trigger callback
      if (this.onNewEmail) {
        this.onNewEmail(alert)
      }

      // Show toast notification based on priority
      if (email.category === 'emergency' || classification.priority === 'high') {
        toast.error('🚨 Emergency Email', {
          description: `From: ${email.from.name}\n${classification.summary}`,
          duration: 10000,
        })
      } else if (email.category === 'important' || email.category === 'work') {
        toast.warning('📧 Important Email', {
          description: `From: ${email.from.name}\n${classification.summary}`,
          duration: 5000,
        })
      }
    } catch (error) {
      logger.error('Failed to process email:', error)
    }
  }

  /**
   * Store alert in localStorage
   */
  private storeAlert(alert: EmailAlert): void {
    try {
      const alerts = this.getStoredAlerts()
      alerts.unshift(alert)

      // Keep only last 100 alerts
      const trimmed = alerts.slice(0, 100)

      localStorage.setItem('flowsphere-email-alerts', JSON.stringify(trimmed))
    } catch (error) {
      logger.error('Failed to store alert:', error)
    }
  }

  /**
   * Get stored alerts
   */
  getStoredAlerts(): EmailAlert[] {
    try {
      const alerts = localStorage.getItem('flowsphere-email-alerts')
      return alerts ? JSON.parse(alerts) : []
    } catch (error) {
      logger.debug('Failed to load email alerts from storage', error)
      return []
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    localStorage.removeItem('flowsphere-email-alerts')
  }

  /**
   * Perform initial email sync (fetch last 7 days)
   */
  async performInitialSync(): Promise<void> {
    logger.info('🔄 Starting initial email sync...')
    const accounts = EmailAccountStore.getActiveAccounts()

    for (const account of accounts) {
      if (account.provider === 'gmail') {
        try {
          logger.info(`📥 Syncing last 7 days of emails for ${account.email}`)

          // Fetch last 7 days
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const dateStr = sevenDaysAgo.toISOString().split('T')[0]

          const emails = await this.gmailProvider.getNewEmails(account, dateStr)
          logger.info(`✅ Fetched ${emails.length} emails from last 7 days`)

          // Classify emails with AI before storing (batch for performance)
          logger.info(`🤖 Classifying ${emails.length} emails with AI...`)
          const classifiedEmails: Email[] = []

          // Process in batches of 10 to avoid overwhelming the API
          const batchSize = 10
          for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize)
            const classifiedBatch = await Promise.all(
              batch.map(async email => {
                try {
                  const classification = await this.aiClassifier.classifyEmail(email)
                  return {
                    ...email,
                    category: classification.category,
                    aiAnalysis: {
                      category: classification.category,
                      priority: classification.priority,
                      summary: classification.summary,
                      tags: classification.tags,
                    },
                  }
                } catch {
                  return email // Return unclassified on error
                }
              })
            )
            classifiedEmails.push(...classifiedBatch)
            logger.info(`  Classified ${classifiedEmails.length}/${emails.length} emails`)
          }

          // Store in database
          await emailDatabase.storeEmails(classifiedEmails)
          logger.info(
            `💾 Stored ${classifiedEmails.length} emails in database (with AI classification)`
          )

          toast.success(`Synced ${emails.length} emails from ${account.email}`)
        } catch (error) {
          logger.error(`Failed to sync ${account.email}:`, error)
          toast.error(`Failed to sync ${account.email}`)
        }
      }
    }

    logger.info('✅ Initial sync complete')
  }

  /**
   * Reclassify all emails in database (useful when classification rules change)
   */
  async reclassifyAllEmails(): Promise<number> {
    logger.info('🔄 Reclassifying all emails...')
    const count = await emailDatabase.reclassifyAllEmails()
    logger.info(`✅ Reclassified ${count} emails`)
    return count
  }
}

// Global email monitor instance
export const globalEmailMonitor = new EmailMonitor()
