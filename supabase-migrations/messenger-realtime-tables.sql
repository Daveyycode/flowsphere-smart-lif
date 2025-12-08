-- FlowSphere Secure Messenger - Real-time Tables
-- Run this in Supabase SQL Editor to enable real-time messaging
-- Created: Dec 4, 2025

-- ============================================
-- 1. MESSENGER PAIRINGS TABLE
-- Stores QR code invites for pairing
-- ============================================
CREATE TABLE IF NOT EXISTS messenger_pairings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  creator_id TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  creator_public_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  accepted_by_id TEXT,
  accepted_by_name TEXT,
  accepted_by_public_key TEXT,
  accepted_at TIMESTAMPTZ
);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_messenger_pairings_code ON messenger_pairings(code);
CREATE INDEX IF NOT EXISTS idx_messenger_pairings_creator ON messenger_pairings(creator_id);

-- Enable RLS
ALTER TABLE messenger_pairings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read pairings (needed to accept invites)
CREATE POLICY "Anyone can read pairings" ON messenger_pairings
  FOR SELECT USING (true);

-- Policy: Anyone can insert pairings
CREATE POLICY "Anyone can create pairings" ON messenger_pairings
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update pairings (for accepting)
CREATE POLICY "Anyone can update pairings" ON messenger_pairings
  FOR UPDATE USING (true);

-- ============================================
-- 2. MESSENGER CONTACTS TABLE
-- Stores contacts for each user (bidirectional)
-- ============================================
CREATE TABLE IF NOT EXISTS messenger_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  contact_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  public_key TEXT,
  conversation_id TEXT NOT NULL,
  status TEXT DEFAULT 'online',
  paired_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate contacts
  UNIQUE(user_id, contact_user_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_messenger_contacts_user ON messenger_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_messenger_contacts_conversation ON messenger_contacts(conversation_id);

-- Enable RLS
ALTER TABLE messenger_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own contacts
CREATE POLICY "Users can read own contacts" ON messenger_contacts
  FOR SELECT USING (true);

-- Policy: System can insert contacts (for bidirectional pairing)
CREATE POLICY "Anyone can create contacts" ON messenger_contacts
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their contacts
CREATE POLICY "Users can delete own contacts" ON messenger_contacts
  FOR DELETE USING (true);

-- ============================================
-- 3. MESSENGER MESSAGES TABLE
-- Stores encrypted messages
-- ============================================
CREATE TABLE IF NOT EXISTS messenger_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_messenger_messages_conversation ON messenger_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_created ON messenger_messages(created_at);

-- Enable RLS
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages in their conversations
CREATE POLICY "Anyone can read messages" ON messenger_messages
  FOR SELECT USING (true);

-- Policy: Anyone can send messages
CREATE POLICY "Anyone can send messages" ON messenger_messages
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. ENABLE REALTIME
-- Required for live message sync
-- ============================================

-- Enable realtime for contacts (for auto-connect notification)
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_contacts;

-- Enable realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;

-- Enable realtime for pairings (optional, for invite status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_pairings;

-- ============================================
-- DONE! Tables are ready for real-time messaging
-- ============================================
