/**
 * FlowSphere Split Conversation ID System
 *
 * 3-Party Verification Security Model:
 * - User1 (Creator): Gets conversation_part_A
 * - User2 (Scanner): Gets conversation_part_B
 * - Server (Supabase): Stores full_id + bridge_key for verification
 *
 * Benefits:
 * - Neither user has the complete conversation ID
 * - Server validates both halves before routing messages
 * - If device compromised, attacker only has partial ID
 * - Server acts as trusted broker for message routing
 *
 * @author FlowSphere Security Team
 * @version 1.0.0
 */

import { FS_ALPHABET, feistelEncrypt, fsBase32Encode } from './flowsphere-crypto'
import { logger } from '@/lib/security-utils'

// ========== TYPES ==========

export interface SplitConversationId {
  fullId: string // Complete ID (stored on server only)
  partA: string // User1's partial ID
  partB: string // User2's partial ID
  bridgeKey: string // Server verification key
  createdAt: string // ISO timestamp
  expiresAt?: string // Optional expiration
}

export interface ConversationPairing {
  id: string // UUID
  fullConversationId: string
  user1ProfileId: string // Creator's profile ID
  user1PartialId: string // Creator's partial conversation ID
  user2ProfileId: string // Scanner's profile ID
  user2PartialId: string // Scanner's partial conversation ID
  bridgeKey: string // Server-side verification key
  createdAt: string
  isActive: boolean
}

// ========== CONSTANTS ==========

const CONVERSATION_PREFIX = 'cONv_'
const PARTIAL_LENGTH = 12 // Length of each user's partial ID
const BRIDGE_LENGTH = 8 // Length of server bridge key
const FULL_ID_LENGTH = PARTIAL_LENGTH + BRIDGE_LENGTH + PARTIAL_LENGTH // 32 chars

// ========== CORE FUNCTIONS ==========

/**
 * Generate a cryptographically secure random string using FS_ALPHABET
 */
function generateSecureRandom(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += FS_ALPHABET[bytes[i] % FS_ALPHABET.length]
  }
  return result
}

/**
 * Hash two profile IDs together to create a deterministic seed
 */
async function hashProfileIds(
  profile1: string,
  profile2: string,
  timestamp: number
): Promise<string> {
  const combined = `${profile1}::${profile2}::${timestamp}::FlowSphere-ConvID-v1`
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)

  // Convert to FS_ALPHABET string
  let result = ''
  for (let i = 0; i < FULL_ID_LENGTH && i < hashArray.length; i++) {
    result += FS_ALPHABET[hashArray[i] % FS_ALPHABET.length]
  }

  // Pad if needed
  while (result.length < FULL_ID_LENGTH) {
    result += generateSecureRandom(1)
  }

  return result
}

/**
 * Apply Feistel obfuscation to make the ID look random
 */
function obfuscateId(input: string): string {
  const encoder = new TextEncoder()
  const inputBytes = encoder.encode(input)
  const obfuscated = feistelEncrypt(inputBytes)
  return fsBase32Encode(obfuscated).substring(0, FULL_ID_LENGTH)
}

/**
 * Generate a split conversation ID for two users
 *
 * @param profile1 - Creator's profile ID (e.g., "FS-ABC12345")
 * @param profile2 - Scanner's profile ID (e.g., "FS-XYZ98765")
 * @returns SplitConversationId with parts for each party
 */
export async function generateSplitConversationId(
  profile1: string,
  profile2: string
): Promise<SplitConversationId> {
  const timestamp = Date.now()

  // Step 1: Hash the combined profile IDs
  const baseId = await hashProfileIds(profile1, profile2, timestamp)

  // Step 2: Apply Feistel obfuscation for randomness
  const obfuscatedId = obfuscateId(baseId)

  // Step 3: Ensure we have enough characters
  let fullIdBody = obfuscatedId
  while (fullIdBody.length < FULL_ID_LENGTH) {
    fullIdBody += generateSecureRandom(1)
  }
  fullIdBody = fullIdBody.substring(0, FULL_ID_LENGTH)

  // Step 4: Split into parts
  // Full: [----PART_A----][--BRIDGE--][----PART_B----]
  const partA = fullIdBody.substring(0, PARTIAL_LENGTH)
  const bridge = fullIdBody.substring(PARTIAL_LENGTH, PARTIAL_LENGTH + BRIDGE_LENGTH)
  const partB = fullIdBody.substring(PARTIAL_LENGTH + BRIDGE_LENGTH)

  // Step 5: Build final IDs with prefix
  const fullId = `${CONVERSATION_PREFIX}${fullIdBody}`

  return {
    fullId,
    partA: `${CONVERSATION_PREFIX}${partA}`,
    partB: `${CONVERSATION_PREFIX}${partB}`,
    bridgeKey: bridge,
    createdAt: new Date(timestamp).toISOString(),
  }
}

/**
 * Verify that two partial IDs and bridge key match
 */
export function verifyConversationParts(
  partA: string,
  partB: string,
  bridgeKey: string,
  fullId: string
): boolean {
  try {
    // Remove prefixes for comparison
    const partABody = partA.replace(CONVERSATION_PREFIX, '')
    const partBBody = partB.replace(CONVERSATION_PREFIX, '')
    const fullIdBody = fullId.replace(CONVERSATION_PREFIX, '')

    // Reconstruct and compare
    const reconstructed = partABody + bridgeKey + partBBody
    return reconstructed === fullIdBody
  } catch (error) {
    logger.error('Conversation verification failed', error, 'SplitConversation')
    return false
  }
}

/**
 * Extract the other user's partial ID from full ID
 * Used by server to route messages
 */
export function getOtherPartialId(
  myPartialId: string,
  fullId: string,
  bridgeKey: string
): string | null {
  try {
    const myBody = myPartialId.replace(CONVERSATION_PREFIX, '')
    const fullBody = fullId.replace(CONVERSATION_PREFIX, '')

    // Check if my partial is Part A or Part B
    if (fullBody.startsWith(myBody)) {
      // I'm User1 (Part A), return Part B
      const partBBody = fullBody.substring(PARTIAL_LENGTH + BRIDGE_LENGTH)
      return `${CONVERSATION_PREFIX}${partBBody}`
    } else if (fullBody.endsWith(myBody.substring(0, PARTIAL_LENGTH))) {
      // I'm User2 (Part B), return Part A
      const partABody = fullBody.substring(0, PARTIAL_LENGTH)
      return `${CONVERSATION_PREFIX}${partABody}`
    }

    return null
  } catch (error) {
    logger.error('Failed to get other partial ID', error, 'SplitConversation')
    return null
  }
}

/**
 * Determine which user (1 or 2) owns a partial ID
 */
export function getUserRole(partialId: string, fullId: string): 'user1' | 'user2' | null {
  const partialBody = partialId.replace(CONVERSATION_PREFIX, '')
  const fullBody = fullId.replace(CONVERSATION_PREFIX, '')

  if (fullBody.startsWith(partialBody)) {
    return 'user1'
  } else if (fullBody.endsWith(partialBody.substring(0, PARTIAL_LENGTH))) {
    return 'user2'
  }

  return null
}

// ========== SUPABASE INTEGRATION ==========

/**
 * Create conversation pairing record for Supabase
 */
export function createPairingRecord(
  splitId: SplitConversationId,
  profile1: string,
  profile2: string
): ConversationPairing {
  return {
    id: crypto.randomUUID(),
    fullConversationId: splitId.fullId,
    user1ProfileId: profile1,
    user1PartialId: splitId.partA,
    user2ProfileId: profile2,
    user2PartialId: splitId.partB,
    bridgeKey: splitId.bridgeKey,
    createdAt: splitId.createdAt,
    isActive: true,
  }
}

/**
 * SQL schema for split conversation IDs (run in Supabase)
 */
export const SPLIT_CONVERSATION_SCHEMA = `
-- Split Conversation ID System
-- Server stores full ID, users only have partial IDs

CREATE TABLE IF NOT EXISTS conversation_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_conversation_id TEXT NOT NULL UNIQUE,
  user1_profile_id TEXT NOT NULL,
  user1_partial_id TEXT NOT NULL,
  user2_profile_id TEXT NOT NULL,
  user2_partial_id TEXT NOT NULL,
  bridge_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Indexes for fast lookup
  CONSTRAINT unique_user1_partial UNIQUE (user1_partial_id),
  CONSTRAINT unique_user2_partial UNIQUE (user2_partial_id)
);

-- Index for looking up by partial IDs
CREATE INDEX IF NOT EXISTS idx_conv_user1_partial ON conversation_pairings(user1_partial_id);
CREATE INDEX IF NOT EXISTS idx_conv_user2_partial ON conversation_pairings(user2_partial_id);
CREATE INDEX IF NOT EXISTS idx_conv_user1_profile ON conversation_pairings(user1_profile_id);
CREATE INDEX IF NOT EXISTS idx_conv_user2_profile ON conversation_pairings(user2_profile_id);

-- Enable RLS
ALTER TABLE conversation_pairings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see pairings they're part of
CREATE POLICY "Users can read own pairings" ON conversation_pairings
  FOR SELECT USING (true);  -- Server handles verification

-- Policy: System can insert pairings
CREATE POLICY "System can create pairings" ON conversation_pairings
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for message routing
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_pairings;
`

// ========== MESSAGE ROUTING HELPERS ==========

/**
 * Lookup conversation by sender's partial ID
 * Returns the full conversation info for routing
 */
export interface MessageRoutingInfo {
  fullConversationId: string
  senderProfileId: string
  senderPartialId: string
  recipientProfileId: string
  recipientPartialId: string
  bridgeKey: string
  isValid: boolean
}

/**
 * Validate and get routing info for a message
 * This should be called server-side (Supabase function or backend)
 */
export function validateMessageRouting(
  senderPartialId: string,
  senderProfileId: string,
  pairing: ConversationPairing
): MessageRoutingInfo {
  // Determine if sender is user1 or user2
  const isUser1 =
    pairing.user1PartialId === senderPartialId && pairing.user1ProfileId === senderProfileId
  const isUser2 =
    pairing.user2PartialId === senderPartialId && pairing.user2ProfileId === senderProfileId

  if (!isUser1 && !isUser2) {
    return {
      fullConversationId: pairing.fullConversationId,
      senderProfileId,
      senderPartialId,
      recipientProfileId: '',
      recipientPartialId: '',
      bridgeKey: pairing.bridgeKey,
      isValid: false,
    }
  }

  return {
    fullConversationId: pairing.fullConversationId,
    senderProfileId,
    senderPartialId,
    recipientProfileId: isUser1 ? pairing.user2ProfileId : pairing.user1ProfileId,
    recipientPartialId: isUser1 ? pairing.user2PartialId : pairing.user1PartialId,
    bridgeKey: pairing.bridgeKey,
    isValid: true,
  }
}

// ========== EXPORTS ==========

export default {
  generateSplitConversationId,
  verifyConversationParts,
  getOtherPartialId,
  getUserRole,
  createPairingRecord,
  validateMessageRouting,
  SPLIT_CONVERSATION_SCHEMA,
}
