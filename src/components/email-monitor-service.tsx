/**
 * Email Monitor Service Component
 * Runs globally in the background to monitor email accounts
 * SYNC FIX: Now pushes notifications to shared NotificationSyncStore
 * SECURITY FIX: Only monitors accounts with valid OAuth tokens
 * UI FIX: Consolidated notifications - batches multiple emails into single toast
 */

import { useEffect, useRef } from 'react'
import { globalEmailMonitor } from '@/lib/email/email-monitor'
import { EmailAccountStore } from '@/lib/email/email-service'
import { NotificationSyncStore } from '@/lib/shared-data-store'
import { toast } from 'sonner'

// Batch notification state
interface PendingNotification {
  count: number
  emails: Array<{ from: string; subject: string; category: string }>
  lastUpdate: number
}

export function EmailMonitorService() {
  const pendingNotificationsRef = useRef<PendingNotification>({ count: 0, emails: [], lastUpdate: 0 })
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const activeAccounts = EmailAccountStore.getActiveAccounts()

    // SECURITY FIX: Only monitor accounts with valid OAuth tokens
    const validAccounts = activeAccounts.filter(account => {
      // Check if account has required OAuth fields
      if (!account.accessToken || !account.refreshToken) {
        console.warn(`⚠️ Skipping ${account.email} - missing OAuth tokens`)
        return false
      }
      // Check if token is not expired (with 1 minute buffer)
      if (account.expiresAt && Date.now() > account.expiresAt - 60000) {
        console.warn(`⚠️ Skipping ${account.email} - token expired`)
        return false
      }
      return true
    })

    if (validAccounts.length > 0) {
      console.log('🔍 Starting email monitor with', validAccounts.length, 'valid OAuth account(s)')

      globalEmailMonitor.start((alert) => {
        console.log('📧 New email alert:', alert)

        // Determine category and priority
        const category = alert.classification.category === 'emergency' ? 'emergency' :
                        alert.classification.category === 'important' ? 'important' :
                        alert.classification.category === 'work' ? 'work' :
                        alert.classification.category === 'personal' ? 'personal' : 'regular'

        const priority = alert.classification.isUrgent ? 'high' :
                        alert.classification.category === 'important' ? 'medium' : 'low'

        // SYNC FIX: Push to shared notification store for App.tsx and morning-brief
        NotificationSyncStore.queueNotification({
          type: 'email',
          title: category === 'emergency' ? '🚨 Emergency Email' :
                 category === 'important' ? '📧 Important Email' : '📬 New Email',
          message: alert.classification.summary || alert.email.subject,
          from: alert.email.from.name || alert.email.from.email,
          category: category as 'emergency' | 'important' | 'regular' | 'work' | 'personal',
          priority: priority as 'high' | 'medium' | 'low',
          emailId: alert.email.id,
          provider: alert.email.provider
        })

        // UI FIX: Batch notifications - collect emails and show single consolidated toast
        // Only show immediate toast for emergency/urgent emails
        if (alert.classification.category === 'emergency' || alert.classification.isUrgent) {
          toast.error('🚨 Emergency Email', {
            description: `From: ${alert.email.from.name || alert.email.from.email}\n${alert.classification.summary}`,
            duration: 10000,
            dismissible: true,
            closeButton: true
          })
        } else {
          // Batch regular notifications
          pendingNotificationsRef.current.count++
          pendingNotificationsRef.current.emails.push({
            from: alert.email.from.name || alert.email.from.email,
            subject: alert.email.subject,
            category
          })
          pendingNotificationsRef.current.lastUpdate = Date.now()

          // Clear existing timeout and set new one
          if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current)
          }

          // Show consolidated notification after 2 second delay (batches rapid emails)
          batchTimeoutRef.current = setTimeout(() => {
            const pending = pendingNotificationsRef.current
            if (pending.count > 0) {
              const importantCount = pending.emails.filter(e => e.category === 'important').length
              const regularCount = pending.count - importantCount

              if (pending.count === 1) {
                // Single email - show detailed notification
                const email = pending.emails[0]
                toast.info('📬 New Email', {
                  description: `From: ${email.from}`,
                  duration: 4000,
                  dismissible: true,
                  closeButton: true
                })
              } else {
                // Multiple emails - show consolidated notification
                toast.info(`📬 ${pending.count} New Emails`, {
                  description: importantCount > 0
                    ? `${importantCount} important, ${regularCount} regular`
                    : `From: ${pending.emails.slice(0, 3).map(e => e.from).join(', ')}${pending.count > 3 ? '...' : ''}`,
                  duration: 5000,
                  dismissible: true,
                  closeButton: true
                })
              }

              // Reset pending notifications
              pendingNotificationsRef.current = { count: 0, emails: [], lastUpdate: 0 }
            }
          }, 2000)
        }
      })
    } else {
      console.log('📭 No valid OAuth email accounts found - email monitoring disabled')
      // Don't show fake/mock notifications if no valid accounts
    }

    // Cleanup on unmount
    return () => {
      globalEmailMonitor.stop()
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}
