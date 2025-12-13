/**
 * Realtime Connection Manager
 *
 * Provides robust real-time functionality like native apps:
 * - Auto-reconnection when connection drops
 * - Visibility handling (reconnect when tab becomes active)
 * - Native push notifications
 * - Heartbeat to keep connections alive
 * - Global subscription management
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Connection state
let isConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY = 2000 // 2 seconds

// Active subscriptions
const activeChannels: Map<string, RealtimeChannel> = new Map()

// Callbacks for global events
type MessageCallback = (message: any) => void
type ContactCallback = (contact: any) => void
type CallCallback = (invite: any) => void
type ConnectionCallback = (connected: boolean) => void

const messageListeners: Map<string, MessageCallback[]> = new Map()
const contactListeners: Map<string, ContactCallback[]> = new Map()
const callListeners: Map<string, CallCallback[]> = new Map()
const connectionListeners: Set<ConnectionCallback> = new Set()

/**
 * Initialize the realtime manager for a user
 */
export function initRealtimeManager(userId: string): () => void {
  console.log('[REALTIME-MANAGER] Initializing for user:', userId)

  // Subscribe to new contacts
  subscribeToContacts(userId)

  // Subscribe to call invites
  subscribeToCallInvites(userId)

  // Set up visibility change handler
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[REALTIME-MANAGER] Tab became visible, checking connections...')
      checkAndReconnect(userId)
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Set up online/offline handlers
  const handleOnline = () => {
    console.log('[REALTIME-MANAGER] Network online, reconnecting...')
    checkAndReconnect(userId)
  }
  const handleOffline = () => {
    console.log('[REALTIME-MANAGER] Network offline')
    setConnectionStatus(false)
  }
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Start heartbeat
  const heartbeatInterval = startHeartbeat(userId)

  // Request notification permission
  requestNotificationPermission()

  // Return cleanup function
  return () => {
    console.log('[REALTIME-MANAGER] Cleaning up...')
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    clearInterval(heartbeatInterval)
    cleanupAllChannels()
  }
}

/**
 * Subscribe to contacts for a user
 */
function subscribeToContacts(userId: string) {
  const channelKey = `contacts:${userId}`

  if (activeChannels.has(channelKey)) {
    return // Already subscribed
  }

  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messenger_contacts',
        filter: `user_id=eq.${userId}`,
      },
      payload => {
        console.log('[REALTIME-MANAGER] New contact:', payload.new)
        notifyContactListeners(userId, payload.new)
        showNotification('New Contact', `${(payload.new as any).name} connected with you!`)
      }
    )
    .subscribe(status => {
      console.log('[REALTIME-MANAGER] Contacts subscription:', status)
      if (status === 'SUBSCRIBED') {
        setConnectionStatus(true)
        reconnectAttempts = 0
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionStatus(false)
        scheduleReconnect(userId)
      }
    })

  activeChannels.set(channelKey, channel)
}

/**
 * Subscribe to call invites for a user
 */
function subscribeToCallInvites(userId: string) {
  const channelKey = `calls:${userId}`

  if (activeChannels.has(channelKey)) {
    return // Already subscribed
  }

  const channel = supabase
    .channel(channelKey)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_invites',
        filter: `to_user_id=eq.${userId}`,
      },
      payload => {
        const invite = payload.new as any
        console.log('[REALTIME-MANAGER] Incoming call:', invite)
        if (invite.status === 'pending') {
          notifyCallListeners(userId, invite)
          showNotification(
            `Incoming ${invite.call_type === 'video' ? 'Video' : 'Voice'} Call`,
            `${invite.from_name} is calling you`,
            { tag: 'incoming-call', requireInteraction: true }
          )
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_invites',
        filter: `to_user_id=eq.${userId}`,
      },
      payload => {
        const invite = payload.new as any
        if (invite.status === 'ended' || invite.status === 'missed') {
          notifyCallListeners(userId, { ...invite, cancelled: true })
        }
      }
    )
    .subscribe(status => {
      console.log('[REALTIME-MANAGER] Calls subscription:', status)
    })

  activeChannels.set(channelKey, channel)
}

/**
 * Subscribe to messages for a specific conversation
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: MessageCallback
): () => void {
  const channelKey = `messages:${conversationId}`

  // Add listener
  if (!messageListeners.has(conversationId)) {
    messageListeners.set(conversationId, [])
  }
  messageListeners.get(conversationId)!.push(onMessage)

  // Create channel if not exists
  if (!activeChannels.has(channelKey)) {
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messenger_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          console.log('[REALTIME-MANAGER] New message:', payload.new)
          const listeners = messageListeners.get(conversationId) || []
          listeners.forEach(cb => cb(payload.new))

          // Show notification if app is not focused
          if (document.visibilityState === 'hidden') {
            showNotification('New Message', 'You have a new message')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messenger_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          console.log('[REALTIME-MANAGER] Message deleted:', payload.old)
          const listeners = messageListeners.get(conversationId) || []
          listeners.forEach(cb => cb({ ...payload.old, deleted: true }))
        }
      )
      .subscribe(status => {
        console.log('[REALTIME-MANAGER] Messages subscription:', status, conversationId)
      })

    activeChannels.set(channelKey, channel)
  }

  // Return unsubscribe function
  return () => {
    const listeners = messageListeners.get(conversationId)
    if (listeners) {
      const index = listeners.indexOf(onMessage)
      if (index > -1) {
        listeners.splice(index, 1)
      }
      // If no more listeners, remove the channel
      if (listeners.length === 0) {
        messageListeners.delete(conversationId)
        const channel = activeChannels.get(channelKey)
        if (channel) {
          supabase.removeChannel(channel)
          activeChannels.delete(channelKey)
        }
      }
    }
  }
}

/**
 * Add listener for new contacts
 */
export function onNewContact(userId: string, callback: ContactCallback): () => void {
  if (!contactListeners.has(userId)) {
    contactListeners.set(userId, [])
  }
  contactListeners.get(userId)!.push(callback)

  return () => {
    const listeners = contactListeners.get(userId)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

/**
 * Add listener for incoming calls
 */
export function onIncomingCall(userId: string, callback: CallCallback): () => void {
  if (!callListeners.has(userId)) {
    callListeners.set(userId, [])
  }
  callListeners.get(userId)!.push(callback)

  return () => {
    const listeners = callListeners.get(userId)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}

/**
 * Add connection status listener
 */
export function onConnectionChange(callback: ConnectionCallback): () => void {
  connectionListeners.add(callback)
  // Immediately notify of current status
  callback(isConnected)

  return () => {
    connectionListeners.delete(callback)
  }
}

// Helper functions

function notifyContactListeners(userId: string, contact: any) {
  const listeners = contactListeners.get(userId) || []
  listeners.forEach(cb => cb(contact))
}

function notifyCallListeners(userId: string, invite: any) {
  const listeners = callListeners.get(userId) || []
  listeners.forEach(cb => cb(invite))
}

function setConnectionStatus(connected: boolean) {
  if (isConnected !== connected) {
    isConnected = connected
    console.log('[REALTIME-MANAGER] Connection status:', connected ? 'CONNECTED' : 'DISCONNECTED')
    connectionListeners.forEach(cb => cb(connected))
  }
}

function scheduleReconnect(userId: string) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[REALTIME-MANAGER] Max reconnect attempts reached')
    return
  }

  reconnectAttempts++
  const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1) // Exponential backoff
  console.log(
    `[REALTIME-MANAGER] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`
  )

  setTimeout(() => {
    checkAndReconnect(userId)
  }, delay)
}

function checkAndReconnect(userId: string) {
  console.log('[REALTIME-MANAGER] Checking and reconnecting...')

  // Re-subscribe to all channels
  subscribeToContacts(userId)
  subscribeToCallInvites(userId)

  // Re-subscribe to all active conversations
  messageListeners.forEach((_, conversationId) => {
    const channelKey = `messages:${conversationId}`
    if (!activeChannels.has(channelKey)) {
      // Channel was removed, need to recreate
      const listeners = messageListeners.get(conversationId) || []
      if (listeners.length > 0) {
        // Resubscribe using the first listener (will notify all)
        const tempUnsubscribe = subscribeToConversation(conversationId, () => {})
        // Clean up the temp subscription immediately
        tempUnsubscribe()
      }
    }
  })
}

function startHeartbeat(userId: string): ReturnType<typeof setInterval> {
  // Check connection every 30 seconds
  return setInterval(() => {
    if (!navigator.onLine) {
      setConnectionStatus(false)
      return
    }

    // Simple heartbeat - check if we can reach Supabase
    supabase
      .from('messenger_contacts')
      .select('id', { count: 'exact', head: true })
      .limit(0)
      .then(({ error }) => {
        if (error) {
          console.log('[REALTIME-MANAGER] Heartbeat failed:', error)
          setConnectionStatus(false)
          scheduleReconnect(userId)
        } else {
          setConnectionStatus(true)
        }
      })
  }, 30000) // 30 seconds
}

function cleanupAllChannels() {
  activeChannels.forEach((channel, key) => {
    console.log('[REALTIME-MANAGER] Removing channel:', key)
    supabase.removeChannel(channel)
  })
  activeChannels.clear()
  messageListeners.clear()
  contactListeners.clear()
  callListeners.clear()
  connectionListeners.clear()
}

/**
 * Request notification permission and show notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('[REALTIME-MANAGER] Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Show a native notification
 */
export function showNotification(
  title: string,
  body: string,
  options?: { tag?: string; requireInteraction?: boolean }
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  // Don't show notification if app is focused
  if (document.visibilityState === 'visible' && !options?.requireInteraction) {
    return
  }

  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options?.tag || 'flowsphere',
    requireInteraction: options?.requireInteraction || false,
    silent: false,
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  // Auto-close after 5 seconds unless it requires interaction
  if (!options?.requireInteraction) {
    setTimeout(() => notification.close(), 5000)
  }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): boolean {
  return isConnected
}
