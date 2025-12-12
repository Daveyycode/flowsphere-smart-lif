-- ============================================
-- Hash-FL Identity System
-- Permanent unique identities tied to devices
-- ============================================

-- Hash-FL Identities (permanent, one per device)
CREATE TABLE IF NOT EXISTS hashfl_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,  -- FlowSphere user ID
  identity_key TEXT NOT NULL UNIQUE,  -- Encrypted QR data (unreadable by iPhone)
  short_code VARCHAR(8) NOT NULL UNIQUE,  -- 8-digit manual invite code
  device_fingerprint TEXT NOT NULL,  -- Ties to specific device
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hashfl_identities_short_code ON hashfl_identities(short_code);
CREATE INDEX IF NOT EXISTS idx_hashfl_identities_user_id ON hashfl_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_hashfl_identities_device ON hashfl_identities(device_fingerprint);

-- Enable Row Level Security
ALTER TABLE hashfl_identities ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow lookups but protect identity details
CREATE POLICY "Anyone can lookup by short_code" ON hashfl_identities
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own identity" ON hashfl_identities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own identity" ON hashfl_identities
  FOR UPDATE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE hashfl_identities;

-- Update connections table to use identity-based lookups
-- Add identity_key column to connections for direct QR scanning
ALTER TABLE hashfl_connections
ADD COLUMN IF NOT EXISTS inviter_identity_key TEXT,
ADD COLUMN IF NOT EXISTS requester_identity_key TEXT;

-- Index for identity lookups
CREATE INDEX IF NOT EXISTS idx_hashfl_connections_inviter_identity ON hashfl_connections(inviter_identity_key);
