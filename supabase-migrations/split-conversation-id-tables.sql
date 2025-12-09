-- FlowSphere Split Conversation ID System
-- 3-Party Verification Security Model
-- Run this in Supabase SQL Editor
-- Created: Dec 8, 2025

-- ============================================
-- 1. CONVERSATION PAIRINGS TABLE
-- Server stores full ID + bridge key for verification
-- Users only have their partial IDs
-- ============================================
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

  -- Ensure partial IDs are unique
  CONSTRAINT unique_user1_partial UNIQUE (user1_partial_id),
  CONSTRAINT unique_user2_partial UNIQUE (user2_partial_id)
);

-- Indexes for fast lookup by partial IDs
CREATE INDEX IF NOT EXISTS idx_conv_user1_partial ON conversation_pairings(user1_partial_id);
CREATE INDEX IF NOT EXISTS idx_conv_user2_partial ON conversation_pairings(user2_partial_id);
CREATE INDEX IF NOT EXISTS idx_conv_user1_profile ON conversation_pairings(user1_profile_id);
CREATE INDEX IF NOT EXISTS idx_conv_user2_profile ON conversation_pairings(user2_profile_id);
CREATE INDEX IF NOT EXISTS idx_conv_full_id ON conversation_pairings(full_conversation_id);

-- Enable RLS
ALTER TABLE conversation_pairings ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations (verification done in app logic)
CREATE POLICY "Allow read conversation_pairings" ON conversation_pairings
  FOR SELECT USING (true);

CREATE POLICY "Allow insert conversation_pairings" ON conversation_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update conversation_pairings" ON conversation_pairings
  FOR UPDATE USING (true);

-- ============================================
-- 2. ADD PARTIAL_CONVERSATION_ID TO MESSENGER_CONTACTS
-- Each user stores their partial ID for display/verification
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messenger_contacts'
    AND column_name = 'partial_conversation_id'
  ) THEN
    ALTER TABLE messenger_contacts
    ADD COLUMN partial_conversation_id TEXT;
  END IF;
END
$$;

-- Index for partial ID lookups
CREATE INDEX IF NOT EXISTS idx_contacts_partial_conv ON messenger_contacts(partial_conversation_id);

-- ============================================
-- 3. ENABLE REALTIME FOR NEW TABLE
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_pairings;

-- ============================================
-- DONE! Split Conversation ID system is ready
-- ============================================

-- VERIFICATION QUERY (run to test):
-- SELECT 'conversation_pairings' as table_name, COUNT(*) as row_count FROM conversation_pairings
-- UNION ALL
-- SELECT 'partial_conversation_id column', COUNT(*) FROM information_schema.columns
-- WHERE table_name = 'messenger_contacts' AND column_name = 'partial_conversation_id';
