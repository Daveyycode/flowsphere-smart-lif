/**
 * REAL Messaging Service - Connects to Supabase Database
 * No more mock data - everything saves to real database
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
