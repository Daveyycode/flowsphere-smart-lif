/**
 * Hash-FL Privacy System - Supabase Realtime Messaging
 * COMPLETELY SEPARATE from Secret Vault (which uses Daily.co)
 *
 * Features:
 * - End-to-end encrypted messages
 * - Real-time message sync via Supabase
 * - Invite code based connections
 * - Offline support with local cache
 */

import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// ==========================================
// Types
// ==========================================

export interface HashFLConnection {
  id: string
  invite_code: string
  user_a_id: string
  user_b_id: string | null
  shared_key: string
  status: 'pending' | 'active' | 'blocked'
  created_at: string
  accepted_at: string | null
  expires_at: string
}

export interface HashFLMessage {
  id: string
  connection_id: string
  sender_id: string
  encrypted_content: string
  message_type: 'text' | 'image' | 'file'
  created_at: string
  delivered_at: string | null
  read_at: string | null
}

// ==========================================
// User ID Generation (hashed for privacy)
// ==========================================

export async function generateUserId(pin: string): Promise<string> {
  // Create a unique but anonymous user ID from PIN + device info
  const data = `hashfl-${pin}-${navigator.userAgent.slice(0, 20)}-${Date.now()}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

// Get or create persistent user ID
export function getStoredUserId(): string | null {
  return localStorage.getItem('hashfl-user-id')
}

export function setStoredUserId(userId: string): void {
  localStorage.setItem('hashfl-user-id', userId)
}

// ==========================================
// Connection Management
// ==========================================

/**
 * Create a new invite/connection
 */
export async function createConnection(
  userId: string,
  inviteCode: string,
  sharedKey: string
): Promise<HashFLConnection | null> {
  try {
    const { data, error } = await supabase
      .from('hashfl_connections')
      .insert({
        invite_code: inviteCode,
        user_a_id: userId,
        shared_key: sharedKey,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[HashFL] Error creating connection:', error)
      return null
    }

    return data as HashFLConnection
  } catch (err) {
    console.error('[HashFL] Exception creating connection:', err)
    return null
  }
}

/**
 * Accept an invite by code
 */
export async function acceptInvite(
  userId: string,
  inviteCode: string
): Promise<HashFLConnection | null> {
  try {
    // Find the pending connection
    const { data: connection, error: findError } = await supabase
      .from('hashfl_connections')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (findError || !connection) {
      console.error('[HashFL] Invite not found or expired:', findError)
      return null
    }

    // Update with user B
    const { data: updated, error: updateError } = await supabase
      .from('hashfl_connections')
      .update({
        user_b_id: userId,
        status: 'active',
        accepted_at: new Date().toISOString()
      })
      .eq('id', connection.id)
      .select()
      .single()

    if (updateError) {
      console.error('[HashFL] Error accepting invite:', updateError)
      return null
    }

    return updated as HashFLConnection
  } catch (err) {
    console.error('[HashFL] Exception accepting invite:', err)
    return null
  }
}

/**
 * Get all active connections for a user
 */
export async function getConnections(userId: string): Promise<HashFLConnection[]> {
  try {
    const { data, error } = await supabase
      .from('hashfl_connections')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'active')

    if (error) {
      console.error('[HashFL] Error fetching connections:', error)
      return []
    }

    return (data || []) as HashFLConnection[]
  } catch (err) {
    console.error('[HashFL] Exception fetching connections:', err)
    return []
  }
}

/**
 * Get connection by invite code
 */
export async function getConnectionByCode(inviteCode: string): Promise<HashFLConnection | null> {
  try {
    const { data, error } = await supabase
      .from('hashfl_connections')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (error) {
      return null
    }

    return data as HashFLConnection
  } catch {
    return null
  }
}

// ==========================================
// Message Management
// ==========================================

/**
 * Send a message
 */
export async function sendMessage(
  connectionId: string,
  senderId: string,
  encryptedContent: string,
  messageType: 'text' | 'image' | 'file' = 'text'
): Promise<HashFLMessage | null> {
  try {
    const { data, error } = await supabase
      .from('hashfl_messages')
      .insert({
        connection_id: connectionId,
        sender_id: senderId,
        encrypted_content: encryptedContent,
        message_type: messageType
      })
      .select()
      .single()

    if (error) {
      console.error('[HashFL] Error sending message:', error)
      return null
    }

    return data as HashFLMessage
  } catch (err) {
    console.error('[HashFL] Exception sending message:', err)
    return null
  }
}

/**
 * Get messages for a connection
 */
export async function getMessages(
  connectionId: string,
  limit: number = 100
): Promise<HashFLMessage[]> {
  try {
    const { data, error } = await supabase
      .from('hashfl_messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[HashFL] Error fetching messages:', error)
      return []
    }

    return (data || []) as HashFLMessage[]
  } catch (err) {
    console.error('[HashFL] Exception fetching messages:', err)
    return []
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(
  connectionId: string,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from('hashfl_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('connection_id', connectionId)
      .neq('sender_id', userId)
      .is('read_at', null)
  } catch (err) {
    console.error('[HashFL] Error marking messages read:', err)
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

let messageChannel: RealtimeChannel | null = null

/**
 * Subscribe to messages for a connection
 */
export function subscribeToMessages(
  connectionId: string,
  onMessage: (message: HashFLMessage) => void
): () => void {
  // Unsubscribe from previous channel if exists
  if (messageChannel) {
    supabase.removeChannel(messageChannel)
  }

  messageChannel = supabase
    .channel(`hashfl-messages-${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hashfl_messages',
        filter: `connection_id=eq.${connectionId}`
      },
      (payload) => {
        console.log('[HashFL] New message received:', payload)
        onMessage(payload.new as HashFLMessage)
      }
    )
    .subscribe((status) => {
      console.log('[HashFL] Realtime subscription status:', status)
    })

  // Return unsubscribe function
  return () => {
    if (messageChannel) {
      supabase.removeChannel(messageChannel)
      messageChannel = null
    }
  }
}

/**
 * Subscribe to connection status changes
 */
export function subscribeToConnection(
  connectionId: string,
  onUpdate: (connection: HashFLConnection) => void
): () => void {
  const channel = supabase
    .channel(`hashfl-connection-${connectionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hashfl_connections',
        filter: `id=eq.${connectionId}`
      },
      (payload) => {
        console.log('[HashFL] Connection updated:', payload)
        onUpdate(payload.new as HashFLConnection)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ==========================================
// Encryption Helpers (uses existing crypto)
// ==========================================

export async function encryptMessage(content: string, sharedKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = Uint8Array.from(atob(sharedKey), c => c.charCodeAt(0))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(content)
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

export async function decryptMessage(encryptedContent: string, sharedKey: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)

    const keyData = Uint8Array.from(atob(sharedKey), c => c.charCodeAt(0))
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return '[Unable to decrypt]'
  }
}
