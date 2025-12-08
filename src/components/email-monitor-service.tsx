/**
 * Email Monitor Service Component
 * Runs globally in the background to monitor email accounts
 * SYNC FIX: Now pushes notifications to shared NotificationSyncStore
 */

import { useEffect } from 'react'
import { globalEmailMonitor } from '@/lib/email/email-monitor'
import { EmailAccountStore } from '@/lib/email/email-service'
import { NotificationSyncStore } from '@/lib/shared-data-store'
import { toast } from 'sonner'

export function EmailMonitorService() {
  useEffect(() => {
    const activeAccounts = EmailAccountStore.getActiveAccounts()

    if (activeAccounts.length > 0) {
      console.log('🔍 Starting global email monitor with', activeAccounts.length, 'active account(s)')

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

        // Show toast notification based on priority
        if (alert.classification.category === 'emergency' || alert.classification.isUrgent) {
          toast.error('🚨 Emergency Email', {
            description: `From: ${alert.email.from.name || alert.email.from.email}\n${alert.classification.summary}`,
            duration: 10000,
            dismissible: true,
            closeButton: true
          })
        } else if (alert.classification.category === 'important') {
          toast.warning('📧 Important Email', {
            description: `From: ${alert.email.from.name || alert.email.from.email}\n${alert.classification.summary}`,
            duration: 5000,
            dismissible: true,
            closeButton: true
          })
        } else {
          toast.info('📬 New Email', {
            description: `From: ${alert.email.from.name || alert.email.from.email}`,
            duration: 3000,
            dismissible: true,
            closeButton: true
          })
        }
      })
    } else {
      console.log('📭 No active email accounts found')
    }

    // Cleanup on unmount
    return () => {
      globalEmailMonitor.stop()
    }
  }, [])

  // This component doesn't render anything
  return null
}
