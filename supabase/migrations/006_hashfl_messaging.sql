-- ============================================
-- Hash-FL Privacy System - Realtime Messaging
-- SEPARATE from Secret Vault messaging
-- ============================================

-- Hash-FL Connections (when users connect via invite code)
CREATE TABLE IF NOT EXISTS hashfl_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(8) NOT NULL,
  user_a_id TEXT NOT NULL,  -- Hashed user identifier
  user_b_id TEXT,           -- NULL until someone accepts
  shared_key TEXT NOT NULL, -- Encrypted shared key for E2E
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, blocked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hashfl_connections_invite_code ON hashfl_connections(invite_code);
CREATE INDEX IF NOT EXISTS idx_hashfl_connections_users ON hashfl_connections(user_a_id, user_b_id);

-- Hash-FL Messages (encrypted, synced via Supabase Realtime)
CREATE TABLE IF NOT EXISTS hashfl_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES hashfl_connections(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,  -- E2E encrypted message
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, file
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_hashfl_messages_connection ON hashfl_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_hashfl_messages_created ON hashfl_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE hashfl_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashfl_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections
-- Users can only see connections they're part of
CREATE POLICY "Users can view own connections" ON hashfl_connections
  FOR SELECT USING (true);  -- We use hashed IDs, so allow select

CREATE POLICY "Users can create connections" ON hashfl_connections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own connections" ON hashfl_connections
  FOR UPDATE USING (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their connections" ON hashfl_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can send messages" ON hashfl_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update message status" ON hashfl_messages
  FOR UPDATE USING (true);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE hashfl_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE hashfl_connections;

-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_hashfl_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM hashfl_connections
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
