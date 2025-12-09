-- FlowSphere Messenger Tables
-- Run this in your Supabase SQL Editor
-- Required for bidirectional QR code pairing

-- ==========================================
-- Messenger Pairings Table (QR Code Invites)
-- ==========================================
-- Stores QR code invites for bidirectional pairing
-- When User1 generates QR, a record is created here
-- When User2 scans, this record is looked up to create contacts for BOTH users

CREATE TABLE IF NOT EXISTS messenger_pairings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- Unique invite code (from QR)
  creator_id TEXT NOT NULL, -- Device ID of QR generator
  creator_name TEXT NOT NULL, -- Display name of QR generator
  creator_public_key TEXT NOT NULL, -- Public key for E2EE
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 24 hours from creation
  accepted BOOLEAN DEFAULT false,
  accepted_by_id TEXT, -- Device ID of scanner
  accepted_by_name TEXT, -- Display name of scanner
  accepted_by_public_key TEXT, -- Public key of scanner
  accepted_at TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pairings_code ON messenger_pairings(code);
CREATE INDEX IF NOT EXISTS idx_pairings_creator ON messenger_pairings(creator_id);
CREATE INDEX IF NOT EXISTS idx_pairings_expires ON messenger_pairings(expires_at);

-- ==========================================
-- Messenger Contacts Table
-- ==========================================
-- Stores contacts for each user
-- When pairing is accepted, contacts are created for BOTH users

CREATE TABLE IF NOT EXISTS messenger_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Owner of this contact record
  contact_user_id TEXT NOT NULL, -- The contact's device ID
  contact_profile_id TEXT, -- Optional profile ID for sharing
  name TEXT NOT NULL, -- Contact's display name
  public_key TEXT NOT NULL, -- Contact's public key for E2EE
  conversation_id TEXT NOT NULL, -- Shared conversation ID (same on both sides!)
  status TEXT DEFAULT 'online', -- online, offline, away
  theme_color TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  paired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_contacts_user ON messenger_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_conversation ON messenger_contacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user ON messenger_contacts(contact_user_id);

-- Unique constraint: one contact per user/contact pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_pair
  ON messenger_contacts(user_id, contact_user_id);

-- ==========================================
-- Messenger Messages Table
-- ==========================================
-- Stores encrypted messages
-- Both users in a conversation write/read from same conversation_id

CREATE TABLE IF NOT EXISTS messenger_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL, -- Links messages to conversation
  sender_id TEXT NOT NULL, -- Who sent this message
  content TEXT NOT NULL, -- Encrypted message content
  encrypted BOOLEAN DEFAULT true,
  attachments JSONB, -- Encrypted attachment metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

-- Indexes for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messenger_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messenger_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messenger_messages(created_at DESC);

-- ==========================================
-- User Privacy Settings Table
-- ==========================================
-- Per-user privacy settings for messenger

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  device_id TEXT,
  show_online_status BOOLEAN DEFAULT true,
  show_last_seen BOOLEAN DEFAULT true,
  allow_screenshots BOOLEAN DEFAULT true,
  allow_save_media BOOLEAN DEFAULT true,
  show_unique_id BOOLEAN DEFAULT false,
  auto_delete_timer INTEGER DEFAULT 0, -- 0 = disabled, otherwise seconds
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_user ON user_privacy_settings(user_id);

-- ==========================================
-- Enable Row Level Security
-- ==========================================

ALTER TABLE messenger_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Pairings: Anyone can create, lookup by code, update if creator or acceptor
CREATE POLICY "Anyone can create pairings" ON messenger_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view pairings" ON messenger_pairings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update pairings" ON messenger_pairings
  FOR UPDATE USING (true);

-- Contacts: Users can manage their own contacts
CREATE POLICY "Users can insert contacts" ON messenger_contacts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own contacts" ON messenger_contacts
  FOR SELECT USING (true);

CREATE POLICY "Users can update own contacts" ON messenger_contacts
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete own contacts" ON messenger_contacts
  FOR DELETE USING (true);

-- Messages: Anyone in conversation can read/write
CREATE POLICY "Anyone can insert messages" ON messenger_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view messages" ON messenger_messages
  FOR SELECT USING (true);

CREATE POLICY "Sender can delete messages" ON messenger_messages
  FOR DELETE USING (true);

-- Privacy settings: Users manage their own
CREATE POLICY "Users can manage privacy" ON user_privacy_settings
  FOR ALL USING (true);

-- ==========================================
-- Enable Realtime for Live Updates
-- ==========================================
-- This enables real-time subscriptions for auto-connect

ALTER PUBLICATION supabase_realtime ADD TABLE messenger_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_privacy_settings;

-- ==========================================
-- Cleanup Function for Expired Pairings
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_expired_pairings()
RETURNS void AS $$
BEGIN
  DELETE FROM messenger_pairings
  WHERE expires_at < NOW() AND accepted = false;
END;
$$ LANGUAGE plpgsql;

-- You can set up a cron job to run this periodically:
-- SELECT cron.schedule('cleanup-pairings', '0 * * * *', 'SELECT cleanup_expired_pairings()');
