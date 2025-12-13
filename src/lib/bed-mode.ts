/**
 * Enhanced Bed Mode (Do Not Disturb)
 * Smart filtering with call frequency detection and morning digest
 */

import { EmailMessage, filterImportantEmails, generateMorningDigest } from './email-scanner'
import { Notification } from '@/components/notifications-view'

export interface BedModeSettings {
  enabled: boolean
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  smartFiltering: boolean // Filter important vs not important
  emergencyCallThreshold: number // Number of calls to trigger alert (default: 3-5)
  emergencyCallWindow: number // Time window in hours (default: 1-2)
  morningDigestEnabled: boolean // Show digest after prayer time
  morningDigestTime: string // HH:MM format (after prayer)
  allowedContacts: string[] // Phone numbers or emails that can always reach you
  notificationMethods: {
    important: boolean // Show important notifications
    calls: boolean // Allow calls through
    sms: boolean // Allow SMS through
  }
  contentPreferences: {
    titleOnly: boolean // Show only title/subject
    bodyPreview: boolean // Show preview (first 200 chars)
    fullBody: boolean // Show full body (requires explicit consent)
    readFullConsent: boolean // User has consented to reading full messages
  }
}

export interface CallRecord {
  id: string
  from: string
  fromName?: string
  timestamp: string
  type: 'incoming' | 'outgoing' | 'missed'
  duration: number
}

export interface EmergencyCallAlert {
  id: string
  from: string
  fromName?: string
  callCount: number
  timeWindow: number // hours
  firstCall: string
  lastCall: string
  shouldAlert: boolean
  message: string
}

/**
 * Check if bed mode is currently active
 */
export function isBedModeActive(settings: BedModeSettings): boolean {
  if (!settings.enabled) return false

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  const [startHour, startMin] = settings.startTime.split(':').map(Number)
  const [endHour, endMin] = settings.endTime.split(':').map(Number)

  const start = startHour * 60 + startMin
  const end = endHour * 60 + endMin
  const current = now.getHours() * 60 + now.getMinutes()

  // Handle overnight (e.g., 22:00 to 06:00)
  if (start > end) {
    return current >= start || current <= end
  }

  return current >= start && current <= end
}

/**
 * Detect emergency call pattern (3-5 calls in 1-2 hours)
 */
export function detectEmergencyCallPattern(
  calls: CallRecord[],
  settings: BedModeSettings
): EmergencyCallAlert[] {
  const alerts: EmergencyCallAlert[] = []
  const now = Date.now()
  const windowMs = settings.emergencyCallWindow * 60 * 60 * 1000

  // Group calls by caller
  const callsByNumber: Record<string, CallRecord[]> = {}

  calls.forEach(call => {
    if (call.type === 'incoming') {
      if (!callsByNumber[call.from]) {
        callsByNumber[call.from] = []
      }
      callsByNumber[call.from].push(call)
    }
  })

  // Check each caller's pattern
  Object.entries(callsByNumber).forEach(([from, callerCalls]) => {
    // Get calls within time window
    const recentCalls = callerCalls.filter(
      call => now - new Date(call.timestamp).getTime() <= windowMs
    )

    if (recentCalls.length >= settings.emergencyCallThreshold) {
      const sortedCalls = recentCalls.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      alerts.push({
        id: `emergency-${from}-${Date.now()}`,
        from,
        fromName: recentCalls[0].fromName,
        callCount: recentCalls.length,
        timeWindow: settings.emergencyCallWindow,
        firstCall: sortedCalls[0].timestamp,
        lastCall: sortedCalls[sortedCalls.length - 1].timestamp,
        shouldAlert: true,
        message: `${recentCalls[0].fromName || from} called ${recentCalls.length} times in ${settings.emergencyCallWindow} hour(s). This may be an emergency!`,
      })
    }
  })

  return alerts
}

/**
 * Filter notifications based on bed mode settings
 */
export function filterNotifications(
  notifications: Notification[],
  settings: BedModeSettings
): {
  allowed: Notification[]
  blocked: Notification[]
  emergencies: Notification[]
} {
  if (!settings.enabled || !settings.smartFiltering) {
    return {
      allowed: notifications,
      blocked: [],
      emergencies: [],
    }
  }

  const allowed: Notification[] = []
  const blocked: Notification[] = []
  const emergencies: Notification[] = []

  notifications.forEach(notification => {
    // Check if from allowed contact
    const isAllowedContact = settings.allowedContacts.some(
      contact => notification.title.includes(contact) || notification.message.includes(contact)
    )

    if (isAllowedContact) {
      allowed.push(notification)
      return
    }

    // Check if emergency priority
    if (notification.priority === 'high' || notification.category === 'urgent') {
      emergencies.push(notification)
      return
    }

    // Check if important
    if (notification.priority === 'medium' || notification.category === 'important') {
      if (settings.notificationMethods.important) {
        allowed.push(notification)
      } else {
        blocked.push(notification)
      }
      return
    }

    // Everything else is blocked during bed mode
    blocked.push(notification)
  })

  return { allowed, blocked, emergencies }
}

/**
 * Generate morning digest after prayer time
 */
export function generateMorningBedModeDigest(
  emails: EmailMessage[],
  notifications: Notification[],
  calls: CallRecord[],
  settings: BedModeSettings
): {
  title: string
  sections: Array<{
    title: string
    items: Array<{
      type: 'email' | 'notification' | 'call'
      from: string
      subject?: string
      preview?: string
      timestamp: string
      important: boolean
    }>
  }>
  summary: string
  readFullConsent: boolean
} {
  // Check if it's time for morning digest
  const now = new Date()
  const [digestHour, digestMin] = settings.morningDigestTime.split(':').map(Number)
  const digestTime = digestHour * 60 + digestMin
  const currentTime = now.getHours() * 60 + now.getMinutes()

  // Only generate if after digest time
  if (currentTime < digestTime) {
    return {
      title: '☀️ Good Morning!',
      sections: [],
      summary: 'Morning digest will be available after prayer time.',
      readFullConsent: settings.contentPreferences.readFullConsent,
    }
  }

  // Filter important emails
  const { important: importantEmails } = filterImportantEmails(emails.filter(e => !e.read))

  // Get notifications from overnight
  const overnightNotifications = notifications.filter(n => !n.read && n.priority !== 'low')

  // Get missed calls
  const missedCalls = calls.filter(c => c.type === 'missed')

  // Build sections
  const sections: Array<{
    title: string
    items: Array<{
      type: 'email' | 'notification' | 'call'
      from: string
      subject?: string
      preview?: string
      timestamp: string
      important: boolean
    }>
  }> = []

  // Important emails section
  if (importantEmails.length > 0) {
    sections.push({
      title: `📧 Important Emails (${importantEmails.length})`,
      items: importantEmails.slice(0, 5).map(email => ({
        type: 'email' as const,
        from: email.from,
        subject: email.subject,
        preview: settings.contentPreferences.titleOnly
          ? undefined
          : settings.contentPreferences.bodyPreview
            ? email.bodyPreview
            : undefined,
        timestamp: email.timestamp,
        important: true,
      })),
    })
  }

  // Notifications section
  if (overnightNotifications.length > 0) {
    sections.push({
      title: `🔔 Notifications (${overnightNotifications.length})`,
      items: overnightNotifications.slice(0, 5).map(notif => ({
        type: 'notification' as const,
        from: notif.title,
        subject: notif.message,
        timestamp: notif.timestamp || notif.time || new Date().toISOString(),
        important: notif.priority === 'high',
      })),
    })
  }

  // Missed calls section
  if (missedCalls.length > 0) {
    sections.push({
      title: `📞 Missed Calls (${missedCalls.length})`,
      items: missedCalls.map(call => ({
        type: 'call' as const,
        from: call.fromName || call.from,
        timestamp: call.timestamp,
        important: true,
      })),
    })
  }

  // Generate summary
  const totalItems = importantEmails.length + overnightNotifications.length + missedCalls.length
  let summary = ''

  if (totalItems === 0) {
    summary = '✨ Nothing urgent overnight. Have a great day!'
  } else {
    summary = `You have ${totalItems} item${totalItems > 1 ? 's' : ''} that need attention. `
    if (importantEmails.length > 0)
      summary += `${importantEmails.length} important email${importantEmails.length > 1 ? 's' : ''}. `
    if (missedCalls.length > 0)
      summary += `${missedCalls.length} missed call${missedCalls.length > 1 ? 's' : ''}. `
  }

  return {
    title: `☀️ Good Morning! Here's your overnight summary`,
    sections,
    summary,
    readFullConsent: settings.contentPreferences.readFullConsent,
  }
}

/**
 * Ask user for consent to read full message bodies
 */
export function requestFullBodyConsent(): {
  message: string
  options: Array<{ label: string; value: boolean; description: string }>
  importance: 'high'
} {
  return {
    message:
      'FlowSphere AI can read your full email messages to provide better insights. However, we respect your privacy.',
    options: [
      {
        label: 'Yes, read full messages',
        value: true,
        description: 'AI will analyze full email content for better categorization and insights',
      },
      {
        label: 'No, titles/previews only',
        value: false,
        description: 'AI will only see email subjects and first 200 characters (more private)',
      },
    ],
    importance: 'high' as const,
  }
}

/**
 * Check if contact is in allowed list
 */
export function isAllowedContact(contact: string, settings: BedModeSettings): boolean {
  return settings.allowedContacts.some(
    allowed => contact.includes(allowed) || allowed.includes(contact)
  )
}

/**
 * Add contact to allowed list
 */
export function addAllowedContact(contact: string, settings: BedModeSettings): BedModeSettings {
  if (!settings.allowedContacts.includes(contact)) {
    return {
      ...settings,
      allowedContacts: [...settings.allowedContacts, contact],
    }
  }
  return settings
}

/**
 * Remove contact from allowed list
 */
export function removeAllowedContact(contact: string, settings: BedModeSettings): BedModeSettings {
  return {
    ...settings,
    allowedContacts: settings.allowedContacts.filter(c => c !== contact),
  }
}

/**
 * Get default bed mode settings
 */
export function getDefaultBedModeSettings(): BedModeSettings {
  return {
    enabled: false,
    startTime: '22:00',
    endTime: '06:00',
    smartFiltering: true,
    emergencyCallThreshold: 3,
    emergencyCallWindow: 1.5, // 1.5 hours
    morningDigestEnabled: true,
    morningDigestTime: '06:30', // After typical morning prayer
    allowedContacts: [],
    notificationMethods: {
      important: true,
      calls: true,
      sms: true,
    },
    contentPreferences: {
      titleOnly: false,
      bodyPreview: true,
      fullBody: false,
      readFullConsent: false, // Must be explicitly enabled
    },
  }
}

/**
 * Simulate call records for testing
 */
export function generateMockCallRecords(): CallRecord[] {
  const now = Date.now()
  const hour = 60 * 60 * 1000

  return [
    {
      id: 'call-1',
      from: '+1234567890',
      fromName: 'Mom',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(), // 30 min ago
      type: 'incoming',
      duration: 120,
    },
    {
      id: 'call-2',
      from: '+1234567890',
      fromName: 'Mom',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(), // 15 min ago
      type: 'incoming',
      duration: 0, // Missed
    },
    {
      id: 'call-3',
      from: '+1234567890',
      fromName: 'Mom',
      timestamp: new Date(now - 5 * 60 * 1000).toISOString(), // 5 min ago
      type: 'incoming',
      duration: 0, // Missed
    },
    {
      id: 'call-4',
      from: '+9876543210',
      fromName: 'Work',
      timestamp: new Date(now - 2 * hour).toISOString(),
      type: 'incoming',
      duration: 300,
    },
  ]
}
