/**
 * Custom QR Code Connection System for FlowSphere
 *
 * Features:
 * - Steganographic QR codes (faint, hidden, only scannable in-app)
 * - One-time use codes that expire after scanning
 * - Real-time connection establishment
 * - Manual code entry as fallback
 */

import { supabase } from './supabase'

export interface ConnectionCode {
  id: string
  code: string // 12-character alphanumeric code
  userId: string
  userName: string
  userEmail: string
  createdAt: string
  expiresAt: string
  scannedBy: string | null
  scannedAt: string | null
  isExpired: boolean
  isActive: boolean
}

export interface ConnectionRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromUserName: string
  fromUserEmail: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
  expiresAt: string
}

/**
 * Generate a unique one-time connection code
 */
export function generateConnectionCode(): string {
  // Generate 12-character alphanumeric code (avoiding ambiguous characters)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No O, 0, 1, I for clarity
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // Format: XXXX-XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`
}

/**
 * Validate and format manually entered connection code
 * Handles various input formats: with/without dashes, lowercase, spaces
 */
export function validateAndFormatCode(input: string): {
  valid: boolean
  formatted: string
  error?: string
} {
  // Remove spaces, dashes, and convert to uppercase
  const cleaned = input.replace(/[\s-]/g, '').toUpperCase()

  // Check length (should be 12 characters without dashes)
  if (cleaned.length !== 12) {
    return {
      valid: false,
      formatted: '',
      error: 'Code must be 12 characters (e.g., XXXX-XXXX-XXXX)',
    }
  }

  // Check for valid characters only
  const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/
  if (!validChars.test(cleaned)) {
    return {
      valid: false,
      formatted: '',
      error: 'Code contains invalid characters',
    }
  }

  // Format with dashes: XXXX-XXXX-XXXX
  const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`

  return { valid: true, formatted }
}

/**
 * Create a new connection code (expires in 5 minutes)
 */
export async function createConnectionCode(
  userId: string,
  userName: string,
  userEmail: string
): Promise<ConnectionCode | null> {
  try {
    const code = generateConnectionCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes

    const { data, error } = await supabase
      .from('connection_codes')
      .insert({
        code,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        is_expired: false,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      code: data.code,
      userId: data.user_id,
      userName: data.user_name,
      userEmail: data.user_email,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      scannedBy: data.scanned_by,
      scannedAt: data.scanned_at,
      isExpired: data.is_expired,
      isActive: data.is_active,
    }
  } catch (error) {
    console.error('Failed to create connection code:', error)
    return null
  }
}

/**
 * Verify and scan a connection code
 */
export async function scanConnectionCode(
  code: string,
  scannerId: string,
  scannerName: string,
  scannerEmail: string
): Promise<{
  success: boolean
  ownerId?: string
  ownerName?: string
  ownerEmail?: string
  error?: string
}> {
  try {
    // Remove dashes from code for comparison
    const cleanCode = code.replace(/-/g, '')

    // Find the code
    const { data: codeData, error: findError } = await supabase
      .from('connection_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (findError || !codeData) {
      return { success: false, error: 'Invalid or expired code' }
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(codeData.expires_at)
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('connection_codes')
        .update({ is_expired: true, is_active: false })
        .eq('id', codeData.id)

      return { success: false, error: 'Code has expired' }
    }

    // Check if already scanned
    if (codeData.scanned_by) {
      return { success: false, error: 'Code already used' }
    }

    // Check if scanning own code
    if (codeData.user_id === scannerId) {
      return { success: false, error: 'Cannot scan your own code' }
    }

    // Mark code as scanned
    await supabase
      .from('connection_codes')
      .update({
        scanned_by: scannerId,
        scanned_at: now.toISOString(),
        is_active: false,
      })
      .eq('id', codeData.id)

    // Create connection request
    await createConnectionRequest(
      scannerId,
      scannerName,
      scannerEmail,
      codeData.user_id,
      codeData.user_name,
      codeData.user_email
    )

    return {
      success: true,
      ownerId: codeData.user_id,
      ownerName: codeData.user_name,
      ownerEmail: codeData.user_email,
    }
  } catch (error) {
    console.error('Failed to scan connection code:', error)
    return { success: false, error: 'Scan failed' }
  }
}

/**
 * Create a connection request between two users
 */
async function createConnectionRequest(
  fromUserId: string,
  fromUserName: string,
  fromUserEmail: string,
  toUserId: string,
  toUserName: string,
  toUserEmail: string
): Promise<void> {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    await supabase.from('connection_requests').insert({
      from_user_id: fromUserId,
      from_user_name: fromUserName,
      from_user_email: fromUserEmail,
      to_user_id: toUserId,
      to_user_name: toUserName,
      to_user_email: toUserEmail,
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to create connection request:', error)
  }
}

/**
 * Get pending connection requests for a user
 */
export async function getPendingConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
  try {
    const { data, error } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((req: any) => ({
      id: req.id,
      fromUserId: req.from_user_id,
      toUserId: req.to_user_id,
      fromUserName: req.from_user_name,
      fromUserEmail: req.from_user_email,
      status: req.status,
      createdAt: req.created_at,
      expiresAt: req.expires_at,
    }))
  } catch (error) {
    console.error('Failed to get connection requests:', error)
    return []
  }
}

/**
 * Accept a connection request
 */
export async function acceptConnectionRequest(requestId: string): Promise<boolean> {
  try {
    // First, get the request details to know who to connect
    const { data: requestData, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !requestData) {
      console.error('Failed to fetch connection request:', fetchError)
      return false
    }

    // Update request status to accepted
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)

    if (updateError) throw updateError

    // Create bidirectional connection in user_connections table
    const now = new Date().toISOString()

    // Connection from requester to accepter
    const { error: conn1Error } = await supabase.from('user_connections').insert({
      user_id: requestData.from_user_id,
      connected_user_id: requestData.to_user_id,
      connected_user_name: requestData.to_user_name || 'User',
      connected_user_email: requestData.to_user_email || '',
      connection_type: 'family',
      status: 'active',
      created_at: now,
    })

    // Connection from accepter to requester (bidirectional)
    const { error: conn2Error } = await supabase.from('user_connections').insert({
      user_id: requestData.to_user_id,
      connected_user_id: requestData.from_user_id,
      connected_user_name: requestData.from_user_name || 'User',
      connected_user_email: requestData.from_user_email || '',
      connection_type: 'family',
      status: 'active',
      created_at: now,
    })

    if (conn1Error) console.error('Failed to create connection 1:', conn1Error)
    if (conn2Error) console.error('Failed to create connection 2:', conn2Error)

    console.log(
      `[CONNECTION] Created bidirectional connection between ${requestData.from_user_id} and ${requestData.to_user_id}`
    )

    return true
  } catch (error) {
    console.error('Failed to accept connection request:', error)
    return false
  }
}

/**
 * Reject a connection request
 */
export async function rejectConnectionRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('connection_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to reject connection request:', error)
    return false
  }
}

/**
 * Clean up expired codes (run periodically)
 */
export async function cleanupExpiredCodes(): Promise<void> {
  try {
    const now = new Date().toISOString()

    await supabase
      .from('connection_codes')
      .update({ is_expired: true, is_active: false })
      .lt('expires_at', now)
      .eq('is_active', true)
  } catch (error) {
    console.error('Failed to cleanup expired codes:', error)
  }
}
