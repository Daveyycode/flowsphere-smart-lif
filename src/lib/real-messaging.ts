/**
 * REAL Messaging Service - Connects to Supabase Database
 * No more mock data - everything saves to real database
 *
 * Conversation ID is based on invite code - same code on both devices
 * ensures messages route to the same conversation.
 */

import { supabase } from './supabase'
import { toast } from 'sonner'

export interface Contact {
  id: string
  name: string
  avatar?: string
  publicKey: string
  lastSeen?: string
  status: 'online' | 'offline' | 'away'
  unreadCount?: number
  themeColor?: string
  notificationsEnabled?: boolean
  soundEnabled?: boolean
  user_id: string
  created_at?: string
}

export interface Message {
  id: string
  user_id: string
  contact_id: string
  conversation_id: string
  content: string
  encrypted: boolean
  is_read: boolean
  timestamp: string
  attachments?: any[]
}

/**
 * Get all contacts for current user from Supabase
 */
export async function getContacts(userId: string): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from('messenger_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get contacts:', error)
    return []
  }
}

/**
 * Add new contact to database
 */
export async function addContact(userId: string, contact: Omit<Contact, 'id' | 'user_id' | 'created_at'>): Promise<Contact | null> {
  try {
    const { data, error } = await supabase
      .from('messenger_contacts')
      .insert([{
        user_id: userId,
        name: contact.name,
        public_key: contact.publicKey,
        status: contact.status,
        theme_color: contact.themeColor,
        notifications_enabled: contact.notificationsEnabled,
        sound_enabled: contact.soundEnabled
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding contact:', error)
      toast.error('Failed to add contact to database')
      return null
    }

    toast.success('Contact saved to database!')
    return data
  } catch (error) {
    console.error('Failed to add contact:', error)
    return null
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(userId: string, conversationId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }

    return data?.map(msg => ({
      id: msg.id,
      user_id: msg.user_id,
      contact_id: msg.contact_id,
      conversation_id: msg.conversation_id,
      content: msg.content,
      encrypted: msg.encrypted,
      is_read: msg.is_read,
      timestamp: msg.created_at,
      attachments: msg.attachments
    })) || []
  } catch (error) {
    console.error('Failed to get messages:', error)
    return []
  }
}

/**
 * Send message - saves to Supabase database
 */
export async function sendMessage(
  userId: string,
  contactId: string,
  conversationId: string,
  content: string,
  encrypted: boolean = true
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        user_id: userId,
        contact_id: contactId,
        conversation_id: conversationId,
        content: content,
        encrypted: encrypted,
        is_read: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      return null
    }

    return {
      id: data.id,
      user_id: data.user_id,
      contact_id: data.contact_id,
      conversation_id: data.conversation_id,
      content: data.content,
      encrypted: data.encrypted,
      is_read: data.is_read,
      timestamp: data.created_at,
      attachments: data.attachments
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    return null
  }
}

/**
 * Subscribe to real-time messages using Supabase Realtime
 */
export function subscribeToMessages(
  userId: string,
  conversationId: string,
  onMessage: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        const newMessage = payload.new as any
        onMessage({
          id: newMessage.id,
          user_id: newMessage.user_id,
          contact_id: newMessage.contact_id,
          conversation_id: newMessage.conversation_id,
          content: newMessage.content,
          encrypted: newMessage.encrypted,
          is_read: newMessage.is_read,
          timestamp: newMessage.created_at,
          attachments: newMessage.attachments
        })
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)

    if (error) {
      console.error('Error marking message as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to mark message as read:', error)
    return false
  }
}

/**
 * Delete contact
 */
export async function deleteContact(contactId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messenger_contacts')
      .delete()
      .eq('id', contactId)

    if (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to delete contact')
      return false
    }

    toast.success('Contact deleted from database')
    return true
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return false
  }
}

// ============================================
// QR PAIRING SYSTEM - For Auto-Connect
// ============================================

export interface PairingInvite {
  id: string
  code: string
  creator_id: string
  creator_name: string
  creator_public_key: string
  created_at: string
  expires_at: string
  accepted: boolean
  accepted_by_id?: string
  accepted_by_name?: string
  accepted_by_public_key?: string
}

/**
 * Create a pairing invite and store in Supabase
 * The QR code will contain the invite code, which can be looked up
 */
export async function createPairingInvite(
  creatorId: string,
  creatorName: string,
  creatorPublicKey: string
): Promise<PairingInvite | null> {
  try {
    // Generate unique code
    const code = `${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const { data, error } = await supabase
      .from('messenger_pairings')
      .insert({
        code,
        creator_id: creatorId,
        creator_name: creatorName,
        creator_public_key: creatorPublicKey,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        accepted: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating pairing invite:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to create pairing invite:', error)
    return null
  }
}

/**
 * Accept a pairing invite - creates contacts for BOTH users
 * Uses the invite code as conversation ID - SAME on both devices!
 * For GROUP chats, pass customConversationId to use a group-specific ID
 */
export async function acceptPairingInvite(
  inviteCode: string,
  acceptorId: string,
  acceptorName: string,
  acceptorPublicKey: string,
  customConversationId?: string // For group chats, pass `group_${groupId}`
): Promise<{
  success: boolean
  contact?: any
  error?: string
}> {
  try {
    // Find the invite
    const { data: invite, error: findError } = await supabase
      .from('messenger_pairings')
      .select('*')
      .eq('code', inviteCode)
      .single()

    if (findError || !invite) {
      console.error('[PAIRING] Invite lookup error:', findError)
      return { success: false, error: 'Invalid invite code' }
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Invite has expired' }
    }

    // For GROUP invites: don't check if already accepted (multiple people can join)
    const isGroupInvite = customConversationId?.startsWith('group_')

    // Check if already accepted (only for personal 1:1 invites)
    if (invite.accepted && !isGroupInvite) {
      return { success: false, error: 'Invite already used' }
    }

    // Check if trying to accept own invite
    if (invite.creator_id === acceptorId) {
      return { success: false, error: 'Cannot accept your own invite' }
    }

    // ============================================
    // CONVERSATION ID
    // ============================================
    // For groups: use custom ID (group_${groupId})
    // For personal: use invite code (conv_${inviteCode})
    const conversationId = customConversationId || `conv_${inviteCode}`
    console.log('[PAIRING] Using conversationId:', conversationId, isGroupInvite ? '(GROUP)' : '')

    // Update invite as accepted
    // For GROUP invites: don't mark as fully accepted so others can still join
    if (!isGroupInvite) {
      const { error: updateError } = await supabase
        .from('messenger_pairings')
        .update({
          accepted: true,
          accepted_by_id: acceptorId,
          accepted_by_name: acceptorName,
          accepted_by_public_key: acceptorPublicKey,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id)

      if (updateError) {
        console.error('[PAIRING] Update error:', updateError)
      }
    } else {
      console.log('[PAIRING] Group invite - not marking as fully accepted')
    }

    // ============================================
    // CREATE CONTACTS FOR BOTH USERS
    // ============================================

    // Create contact for ACCEPTOR (scanner) - they see the creator
    const { error: acceptorContactError } = await supabase.from('messenger_contacts').insert({
      user_id: acceptorId,
      contact_user_id: invite.creator_id,
      name: invite.creator_name,
      public_key: invite.creator_public_key,
      conversation_id: conversationId,  // SAME conversation ID!
      status: 'online',
      paired_at: new Date().toISOString()
    })

    if (acceptorContactError) {
      console.error('[PAIRING] Failed to create acceptor contact:', acceptorContactError)
    }

    // Create contact for CREATOR (QR generator) - they see the acceptor - AUTO-CONNECT!
    const { error: creatorContactError } = await supabase.from('messenger_contacts').insert({
      user_id: invite.creator_id,
      contact_user_id: acceptorId,
      name: acceptorName,
      public_key: acceptorPublicKey,
      conversation_id: conversationId,  // SAME conversation ID!
      status: 'online',
      paired_at: new Date().toISOString()
    })

    if (creatorContactError) {
      console.error('[PAIRING] Failed to create creator contact:', creatorContactError)
    }

    console.log(`[PAIRING] Created bidirectional pairing:`)
    console.log(`  Creator: ${invite.creator_id} -> ${invite.creator_name}`)
    console.log(`  Acceptor: ${acceptorId} -> ${acceptorName}`)
    console.log(`  Conversation ID: ${conversationId}`)

    return {
      success: true,
      contact: {
        id: invite.creator_id,
        name: invite.creator_name,
        publicKey: invite.creator_public_key,
        conversationId: conversationId
      }
    }
  } catch (error) {
    console.error('Failed to accept pairing invite:', error)
    return { success: false, error: 'Failed to accept invite' }
  }
}

/**
 * Get contacts from Supabase for a user
 */
export async function getMessengerContacts(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('messenger_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('paired_at', { ascending: false })

    if (error) {
      console.error('Error fetching messenger contacts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get messenger contacts:', error)
    return []
  }
}

/**
 * Subscribe to new contacts (for auto-connect notification)
 */
export function subscribeToNewContacts(
  userId: string,
  onNewContact: (contact: any) => void
) {
  const channel = supabase
    .channel(`contacts:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messenger_contacts',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[REALTIME] New contact added:', payload.new)
        onNewContact(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Send a message and store in Supabase
 */
export async function sendMessengerMessage(
  senderId: string,
  conversationId: string,
  content: string,
  encrypted: boolean = true
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('messenger_messages')
      .insert({
        sender_id: senderId,
        conversation_id: conversationId,
        content,
        encrypted,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to send message:', error)
    return null
  }
}

/**
 * Get messages for a conversation with pagination
 * @param conversationId - The conversation ID
 * @param options - Pagination options (limit, offset, before timestamp)
 */
export async function getMessengerMessages(
  conversationId: string,
  options: {
    limit?: number
    offset?: number
    before?: string // ISO timestamp - get messages before this time
  } = {}
): Promise<{ messages: any[]; hasMore: boolean; total: number }> {
  try {
    const limit = options.limit || 50 // Default 50 messages per page
    const offset = options.offset || 0

    // Build query
    let query = supabase
      .from('messenger_messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)

    // If "before" timestamp provided, get older messages
    if (options.before) {
      query = query.lt('created_at', options.before)
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false }) // Newest first for pagination
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching messages:', error)
      return { messages: [], hasMore: false, total: 0 }
    }

    // Reverse to show oldest first in UI
    const messages = (data || []).reverse()
    const total = count || 0
    const hasMore = offset + messages.length < total

    return { messages, hasMore, total }
  } catch (error) {
    console.error('Failed to get messages:', error)
    return { messages: [], hasMore: false, total: 0 }
  }
}

/**
 * Get latest messages for a conversation (simple version for backward compatibility)
 */
export async function getLatestMessages(conversationId: string, limit: number = 50): Promise<any[]> {
  const result = await getMessengerMessages(conversationId, { limit })
  return result.messages
}

/**
 * Subscribe to messages in a conversation (real-time)
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: any) => void
) {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messenger_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        console.log('[REALTIME] New message:', payload.new)
        onMessage(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Delete message for everyone (from Supabase)
 */
export async function deleteMessageForEveryone(
  messageId: string,
  senderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify the message belongs to the sender
    const { data: message, error: fetchError } = await supabase
      .from('messenger_messages')
      .select('sender_id')
      .eq('id', messageId)
      .single()

    if (fetchError || !message) {
      return { success: false, error: 'Message not found' }
    }

    if (message.sender_id !== senderId) {
      return { success: false, error: 'You can only delete your own messages' }
    }

    // Delete the message from Supabase
    const { error: deleteError } = await supabase
      .from('messenger_messages')
      .delete()
      .eq('id', messageId)

    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      return { success: false, error: 'Failed to delete message' }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete message for everyone:', error)
    return { success: false, error: 'Failed to delete message' }
  }
}

/**
 * Subscribe to message deletions (real-time)
 */
export function subscribeToMessageDeletions(
  conversationId: string,
  onMessageDeleted: (messageId: string) => void
) {
  const channel = supabase
    .channel(`deletions:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messenger_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        console.log('[REALTIME] Message deleted:', payload.old)
        if (payload.old && payload.old.id) {
          onMessageDeleted(payload.old.id)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Save user's privacy settings to Supabase
 */
export async function savePrivacySettings(
  userId: string,
  settings: {
    showOnlineStatus: boolean
    showLastSeen: boolean
    allowScreenshots: boolean
    allowSaveMedia: boolean
    showUniqueId: boolean
    autoDeleteTimer: number
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: userId,
        device_id: userId, // Using userId as device_id for simplicity
        show_online_status: settings.showOnlineStatus,
        show_last_seen: settings.showLastSeen,
        allow_screenshots: settings.allowScreenshots,
        allow_save_media: settings.allowSaveMedia,
        show_unique_id: settings.showUniqueId,
        auto_delete_timer: settings.autoDeleteTimer,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving privacy settings:', error)
      return false
    }

    console.log('[PRIVACY] Settings saved to Supabase')
    return true
  } catch (error) {
    console.error('Failed to save privacy settings:', error)
    return false
  }
}

/**
 * Get user's privacy settings from Supabase
 */
export async function getPrivacySettings(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no settings found, that's okay - will use defaults
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching privacy settings:', error)
      return null
    }

    return {
      showOnlineStatus: data.show_online_status,
      showLastSeen: data.show_last_seen,
      allowScreenshots: data.allow_screenshots,
      allowSaveMedia: data.allow_save_media,
      showUniqueId: data.show_unique_id,
      autoDeleteTimer: data.auto_delete_timer
    }
  } catch (error) {
    console.error('Failed to get privacy settings:', error)
    return null
  }
}

/**
 * Subscribe to privacy settings changes (real-time)
 */
export function subscribeToPrivacySettings(
  userId: string,
  onSettingsChanged: (settings: any) => void
) {
  const channel = supabase
    .channel(`privacy:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'user_privacy_settings',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('[REALTIME] Privacy settings changed:', payload.new)
        if (payload.new) {
          const data = payload.new as any
          onSettingsChanged({
            showOnlineStatus: data.show_online_status,
            showLastSeen: data.show_last_seen,
            allowScreenshots: data.allow_screenshots,
            allowSaveMedia: data.allow_save_media,
            showUniqueId: data.show_unique_id,
            autoDeleteTimer: data.auto_delete_timer
          })
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
