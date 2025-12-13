/**
 * useRealtime Hook
 *
 * React hook for real-time functionality in FlowSphere
 * Provides native-app-like real-time updates for messages, contacts, and calls
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  initRealtimeManager,
  subscribeToConversation,
  onNewContact,
  onIncomingCall,
  onConnectionChange,
  requestNotificationPermission,
  showNotification,
} from '@/lib/realtime-manager'

/**
 * Initialize realtime manager for a user
 * Call this once at the app level
 */
export function useRealtimeManager(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) return

    // Initialize the realtime manager
    cleanupRef.current = initRealtimeManager(userId)

    // Listen for connection status changes
    const unsubConnection = onConnectionChange(setIsConnected)

    return () => {
      unsubConnection()
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [userId])

  return { isConnected }
}

/**
 * Subscribe to messages in a conversation
 */
export function useConversationMessages(
  conversationId: string | null,
  onNewMessage: (message: any) => void
) {
  const callbackRef = useRef(onNewMessage)
  callbackRef.current = onNewMessage

  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = subscribeToConversation(conversationId, message => {
      callbackRef.current(message)
    })

    return unsubscribe
  }, [conversationId])
}

/**
 * Listen for new contacts
 */
export function useNewContacts(userId: string | null, onContact: (contact: any) => void) {
  const callbackRef = useRef(onContact)
  callbackRef.current = onContact

  useEffect(() => {
    if (!userId) return

    const unsubscribe = onNewContact(userId, contact => {
      callbackRef.current(contact)
    })

    return unsubscribe
  }, [userId])
}

/**
 * Listen for incoming calls
 */
export function useIncomingCalls(userId: string | null, onCall: (invite: any) => void) {
  const callbackRef = useRef(onCall)
  callbackRef.current = onCall

  useEffect(() => {
    if (!userId) return

    const unsubscribe = onIncomingCall(userId, invite => {
      callbackRef.current(invite)
    })

    return unsubscribe
  }, [userId])
}

/**
 * Request notification permission
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission()
    setPermission(granted ? 'granted' : 'denied')
    return granted
  }, [])

  return { permission, requestPermission }
}

/**
 * Connection status indicator component helper
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const unsubscribe = onConnectionChange(setIsConnected)
    return unsubscribe
  }, [])

  return isConnected
}

// Re-export showNotification for convenience
export { showNotification }
