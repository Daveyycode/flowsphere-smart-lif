/**
 * Call Signaling Service
 *
 * Handles call invite signaling via Supabase Realtime
 * - Send call invites
 * - Receive incoming calls
 * - Accept/Reject calls
 * - Track call status
 */

import { supabase } from './supabase'
import { logger } from '@/lib/security-utils'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
export interface CallInvite {
  id: string
  from_user_id: string
  from_name: string
  to_user_id: string
  room_url: string
  room_name: string
  call_type: 'video' | 'audio'
  status: 'pending' | 'accepted' | 'rejected' | 'missed' | 'ended'
  created_at: string
  updated_at: string
  expires_at: string
}

/**
 * Send a call invite to another user
 */
export async function sendCallInvite(
  fromUserId: string,
  fromName: string,
  toUserId: string,
  roomUrl: string,
  roomName: string,
  callType: 'video' | 'audio'
): Promise<{ success: boolean; invite?: CallInvite; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('call_invites')
      .insert({
        from_user_id: fromUserId,
        from_name: fromName,
        to_user_id: toUserId,
        room_url: roomUrl,
        room_name: roomName,
        call_type: callType,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logger.error('[CALL SIGNALING] Failed to send invite:', error)
      return { success: false, error: error.message }
    }

    logger.info('[CALL SIGNALING] Invite sent:', data)
    return { success: true, invite: data as CallInvite }
  } catch (err: any) {
    logger.error('[CALL SIGNALING] Error sending invite:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Update call invite status
 */
export async function updateCallStatus(
  inviteId: string,
  status: 'accepted' | 'rejected' | 'missed' | 'ended'
): Promise<boolean> {
  try {
    const { error } = await supabase.from('call_invites').update({ status }).eq('id', inviteId)

    if (error) {
      logger.error('[CALL SIGNALING] Failed to update status:', error)
      return false
    }

    logger.info('[CALL SIGNALING] Status updated:', inviteId, status)
    return true
  } catch (err) {
    logger.error('[CALL SIGNALING] Error updating status:', err)
    return false
  }
}

/**
 * Cancel an outgoing call
 */
export async function cancelCall(inviteId: string): Promise<boolean> {
  return updateCallStatus(inviteId, 'ended')
}

/**
 * Get pending call invite for a user
 */
export async function getPendingCallInvite(userId: string): Promise<CallInvite | null> {
  try {
    const { data, error } = await supabase
      .from('call_invites')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data as CallInvite
  } catch (err) {
    return null
  }
}

/**
 * Subscribe to incoming call invites for a user
 */
export function subscribeToCallInvites(
  userId: string,
  onIncomingCall: (invite: CallInvite) => void,
  onCallCancelled: (inviteId: string) => void
): () => void {
  logger.info('[CALL SIGNALING] Subscribing to calls for:', userId)

  const channel: RealtimeChannel = supabase
    .channel(`call_invites_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'call_invites',
        filter: `to_user_id=eq.${userId}`,
      },
      payload => {
        const invite = payload.new as CallInvite
        logger.info('[CALL SIGNALING] Incoming call:', invite)
        if (invite.status === 'pending') {
          onIncomingCall(invite)
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
        const invite = payload.new as CallInvite
        logger.info('[CALL SIGNALING] Call status updated:', invite)
        if (invite.status === 'ended' || invite.status === 'missed') {
          onCallCancelled(invite.id)
        }
      }
    )
    .subscribe(status => {
      logger.info('[CALL SIGNALING] Subscription status:', status)
    })

  // Return unsubscribe function
  return () => {
    logger.info('[CALL SIGNALING] Unsubscribing from calls')
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to call status updates (for the caller)
 */
export function subscribeToCallStatus(
  inviteId: string,
  onStatusChange: (status: CallInvite['status']) => void
): () => void {
  logger.info('[CALL SIGNALING] Subscribing to call status:', inviteId)

  const channel: RealtimeChannel = supabase
    .channel(`call_status_${inviteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_invites',
        filter: `id=eq.${inviteId}`,
      },
      payload => {
        const invite = payload.new as CallInvite
        logger.info('[CALL SIGNALING] Call status changed:', invite.status)
        onStatusChange(invite.status)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Clean up expired invites for a user
 */
export async function cleanupExpiredInvites(userId: string): Promise<void> {
  try {
    await supabase
      .from('call_invites')
      .update({ status: 'missed' })
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    logger.info('[CALL SIGNALING] Cleaned up expired invites')
  } catch (err) {
    logger.error('[CALL SIGNALING] Error cleaning up invites:', err)
  }
}
