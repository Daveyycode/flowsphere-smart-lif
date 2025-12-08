/**
 * Email Database - Local storage using IndexedDB for fast search
 *
 * RETENTION POLICIES:
 * - Non-work emails: 7 days (auto-delete when opened OR after 7 days)
 * - Work emails: 3 months in main database
 * - Work archive: Up to 5 years (searchable on-demand by AI)
 */

import { Email } from './email-service'
import { logger } from '@/lib/security-utils'
import { EmailClassificationRulesStore } from './email-classification-rules'

const DB_NAME = 'flowsphere-emails'
const DB_VERSION = 2 // Bumped for new archive store
const STORE_NAME = 'emails'
const ARCHIVE_STORE_NAME = 'emails-archive' // Long-term work email storage

// Retention periods in days
const RETENTION_NON_WORK = 7 // 7 days for non-work emails
const RETENTION_WORK = 90 // 3 months for work emails
const RETENTION_ARCHIVE = 1825 // 5 years for work archive

export class EmailDatabase {
  private db: IDBDatabase | null = null

  /**
   * Initialize database with main and archive stores
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        logger.info('✅ Email database initialized')
        // Run retention cleanup on init
        this.runRetentionCleanup()
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create main email store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

          // Create indexes for fast searching
          store.createIndex('provider', 'provider', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('category', 'category', { unique: false })
          store.createIndex('from', 'from.email', { unique: false })
          store.createIndex('read', 'read', { unique: false })

          logger.info('📦 Email database store created')
        }

        // Create archive store for long-term work email storage (5 years)
        if (!db.objectStoreNames.contains(ARCHIVE_STORE_NAME)) {
          const archiveStore = db.createObjectStore(ARCHIVE_STORE_NAME, { keyPath: 'id' })

          archiveStore.createIndex('provider', 'provider', { unique: false })
          archiveStore.createIndex('timestamp', 'timestamp', { unique: false })
          archiveStore.createIndex('category', 'category', { unique: false })
          archiveStore.createIndex('from', 'from.email', { unique: false })
          archiveStore.createIndex('subject', 'subject', { unique: false })

          logger.info('📦 Email archive store created (5-year retention)')
        }
      }
    })
  }

  /**
   * Run retention cleanup based on category
   * - Non-work emails: 7 days
   * - Work emails: 3 months (then move to archive)
   */
  private async runRetentionCleanup(): Promise<void> {
    try {
      const allEmails = await this.getAllEmails()
      const now = Date.now()

      const nonWorkCutoff = new Date(now - RETENTION_NON_WORK * 24 * 60 * 60 * 1000)
      const workCutoff = new Date(now - RETENTION_WORK * 24 * 60 * 60 * 1000)

      const toDelete: string[] = []
      const toArchive: Email[] = []

      for (const email of allEmails) {
        const emailDate = new Date(email.timestamp)
        const isWork = email.category === 'work'

        if (isWork) {
          // Work emails: Move to archive after 3 months
          if (emailDate < workCutoff) {
            toArchive.push(email)
            toDelete.push(email.id)
          }
        } else {
          // Non-work emails: Delete after 7 days
          if (emailDate < nonWorkCutoff) {
            toDelete.push(email.id)
          }
        }
      }

      // Archive work emails before deleting
      if (toArchive.length > 0) {
        await this.archiveEmails(toArchive)
      }

      // Delete old emails from main store
      if (toDelete.length > 0) {
        await this.deleteEmailsByIds(toDelete)
        logger.info(`🗑️ Retention cleanup: Deleted ${toDelete.length} old emails, archived ${toArchive.length} work emails`)
      }
    } catch (error) {
      logger.error('Retention cleanup failed:', error)
    }
  }

  /**
   * Archive work emails to long-term storage
   */
  private async archiveEmails(emails: Email[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ARCHIVE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(ARCHIVE_STORE_NAME)

      emails.forEach(email => {
        store.put({
          ...email,
          archivedAt: new Date().toISOString()
        })
      })

      transaction.oncomplete = () => {
        logger.info(`📁 Archived ${emails.length} work emails to long-term storage`)
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Delete emails by IDs
   */
  private async deleteEmailsByIds(ids: string[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      ids.forEach(id => store.delete(id))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Mark email as read AND auto-delete non-work emails when opened
   * This implements the user's request: "when user opens email (except work) it auto-deletes from FlowSphere"
   */
  async markEmailAsRead(emailId: string): Promise<{ deleted: boolean; email: Email | null }> {
    if (!this.db) await this.init()

    return new Promise(async (resolve, reject) => {
      try {
        // First get the email to check its category
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const getRequest = store.get(emailId)

        getRequest.onsuccess = () => {
          const email = getRequest.result as Email | undefined
          if (!email) {
            resolve({ deleted: false, email: null })
            return
          }

          // Mark as read
          email.read = true

          // Check if should auto-delete (non-work emails)
          const isWork = email.category === 'work'

          if (isWork) {
            // Work email: Keep it, just mark as read
            store.put(email)
            transaction.oncomplete = () => {
              logger.info(`📧 Marked work email as read: "${email.subject}"`)
              resolve({ deleted: false, email })
            }
          } else {
            // Non-work email: Auto-delete from FlowSphere after viewing
            store.delete(emailId)
            transaction.oncomplete = () => {
              logger.info(`🗑️ Auto-deleted non-work email after viewing: "${email.subject}"`)
              resolve({ deleted: true, email })
            }
          }
        }

        getRequest.onerror = () => reject(getRequest.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Search archived work emails (5-year history)
   * Called by AI when user asks for old work emails
   */
  async searchArchive(query: string, options?: {
    maxResults?: number
    yearsBack?: number
  }): Promise<Email[]> {
    if (!this.db) await this.init()

    const maxResults = options?.maxResults || 50
    const yearsBack = options?.yearsBack || 5

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ARCHIVE_STORE_NAME], 'readonly')
      const store = transaction.objectStore(ARCHIVE_STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const allArchived = request.result as Email[]
        const lowerQuery = query.toLowerCase()

        // Filter by date range
        const cutoffDate = new Date()
        cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack)

        // Search archive
        const results = allArchived
          .filter(email => {
            const emailDate = new Date(email.timestamp)
            if (emailDate < cutoffDate) return false

            const searchText = `
              ${email.subject}
              ${email.body || ''}
              ${email.snippet || ''}
              ${email.from.name}
              ${email.from.email}
            `.toLowerCase()

            return searchText.includes(lowerQuery)
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, maxResults)

        logger.info(`📁 Archive search for "${query}": Found ${results.length} emails`)
        resolve(results)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all archived emails count
   */
  async getArchiveCount(): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ARCHIVE_STORE_NAME], 'readonly')
      const store = transaction.objectStore(ARCHIVE_STORE_NAME)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store emails in database with automatic classification
   */
  async storeEmails(emails: Email[]): Promise<void> {
    if (!this.db) await this.init()

    // Classify each email using rules before storing
    const classifiedEmails = emails.map(email => {
      // Skip if already classified
      if (email.category && email.category !== 'regular') {
        return email
      }

      // Use rules-based classification
      const classification = EmailClassificationRulesStore.classifyByRules({
        subject: email.subject,
        body: email.body || email.snippet || '',
        from: email.from
      })

      // Map classification category to email category
      const categoryMap: Record<string, Email['category']> = {
        'urgent': 'emergency',
        'work': 'work',
        'personal': 'personal',
        'subs': 'subscription',
        'bills': 'regular',
        'all': 'regular'
      }

      return {
        ...email,
        category: categoryMap[classification.category] || 'regular'
      }
    })

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      let stored = 0
      classifiedEmails.forEach((email) => {
        const request = store.put(email)
        request.onsuccess = () => stored++
      })

      transaction.oncomplete = () => {
        logger.info(`💾 Stored ${stored} emails in database (with classification)`)
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get all emails
   */
  async getAllEmails(): Promise<Email[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get emails by category
   */
  async getEmailsByCategory(category: string): Promise<Email[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('category')
      const request = index.getAll(category)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get emails in date range
   */
  async getEmailsInRange(startDate: Date, endDate: Date): Promise<Email[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')

      const range = IDBKeyRange.bound(
        startDate.toISOString(),
        endDate.toISOString()
      )

      const request = index.getAll(range)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Search emails by text (subject, body, from)
   */
  async searchEmails(query: string): Promise<Email[]> {
    const allEmails = await this.getAllEmails()
    const lowerQuery = query.toLowerCase()

    return allEmails.filter((email) => {
      const searchText = `
        ${email.subject}
        ${email.body}
        ${email.snippet}
        ${email.from.name}
        ${email.from.email}
      `.toLowerCase()

      return searchText.includes(lowerQuery)
    })
  }

  /**
   * Get email count
   */
  async getCount(): Promise<number> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Reclassify all emails in database using current rules
   * Also triggers a re-classification event for UI updates
   */
  async reclassifyAllEmails(): Promise<number> {
    const emails = await this.getAllEmails()

    if (emails.length === 0) return 0

    const categoryMap: Record<string, Email['category']> = {
      'urgent': 'emergency',
      'work': 'work',
      'personal': 'personal',
      'subs': 'subscription',
      'bills': 'regular',
      'all': 'regular'
    }

    const reclassified = emails.map(email => {
      const classification = EmailClassificationRulesStore.classifyByRules({
        subject: email.subject,
        body: email.body || email.snippet || '',
        from: email.from
      })

      const newCategory = categoryMap[classification.category] || 'regular'
      const wasChanged = email.category !== newCategory

      return {
        ...email,
        category: newCategory,
        _wasChanged: wasChanged
      }
    })

    // Log changes for debugging
    const changedEmails = reclassified.filter((e: any) => e._wasChanged)
    if (changedEmails.length > 0) {
      logger.info(`📊 Category changes: ${changedEmails.length} emails will be reclassified`)
      changedEmails.slice(0, 5).forEach((e: any) => {
        logger.debug(`  - "${e.subject}" → ${e.category}`)
      })
    }

    // Remove internal tracking property before storing
    const cleanEmails = reclassified.map(({ _wasChanged, ...email }: any) => email)

    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      let updated = 0
      cleanEmails.forEach((email) => {
        const request = store.put(email)
        request.onsuccess = () => updated++
      })

      transaction.oncomplete = () => {
        logger.info(`🔄 Reclassified ${updated} emails`)
        // Dispatch event to notify UI components
        window.dispatchEvent(new CustomEvent('flowsphere-emails-reclassified', {
          detail: { count: updated, changed: changedEmails.length }
        }))
        resolve(updated)
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get all emails that need potential reclassification
   * (emails with 'regular' category that might belong to another category)
   */
  async getEmailsNeedingReclassification(): Promise<Email[]> {
    const regularEmails = await this.getEmailsByCategory('regular')

    // Check each regular email to see if it should be reclassified
    const needsReclassification: Email[] = []

    for (const email of regularEmails) {
      const classification = EmailClassificationRulesStore.classifyByRules({
        subject: email.subject,
        body: email.body || email.snippet || '',
        from: email.from
      })

      // If rules suggest a non-regular category, this email needs reclassification
      if (classification.category !== 'bills' && classification.category !== 'all') {
        needsReclassification.push(email)
      }
    }

    return needsReclassification
  }

  /**
   * Clear all emails
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        logger.info('🗑️ Email database cleared')
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete old emails (older than X days)
   */
  async deleteOldEmails(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const allEmails = await this.getAllEmails()
    const oldEmails = allEmails.filter(
      (email) => new Date(email.timestamp) < cutoffDate
    )

    if (oldEmails.length === 0) return 0

    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      let deleted = 0
      oldEmails.forEach((email) => {
        const request = store.delete(email.id)
        request.onsuccess = () => deleted++
      })

      transaction.oncomplete = () => {
        logger.info(`🗑️ Deleted ${deleted} old emails`)
        resolve(deleted)
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number
    byCategory: Record<string, number>
    byProvider: Record<string, number>
    unread: number
  }> {
    const emails = await this.getAllEmails()

    const stats = {
      total: emails.length,
      byCategory: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      unread: emails.filter((e) => !e.read).length
    }

    emails.forEach((email) => {
      // Count by category
      const category = email.category || 'regular'
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1

      // Count by provider
      stats.byProvider[email.provider] = (stats.byProvider[email.provider] || 0) + 1
    })

    return stats
  }
}

// Global instance
export const emailDatabase = new EmailDatabase()
