-- Call Invites Table for Video/Voice Calling
-- Used for signaling between users when initiating calls

CREATE TABLE IF NOT EXISTS call_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  room_url TEXT NOT NULL,
  room_name TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'video', -- 'video' or 'audio'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'missed', 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 seconds') -- Calls expire after 60s
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_call_invites_to_user ON call_invites(to_user_id);
CREATE INDEX IF NOT EXISTS idx_call_invites_from_user ON call_invites(from_user_id);
CREATE INDEX IF NOT EXISTS idx_call_invites_status ON call_invites(status);

-- Enable RLS
ALTER TABLE call_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create call invites" ON call_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their call invites" ON call_invites
  FOR SELECT USING (true);

CREATE POLICY "Users can update call invites" ON call_invites
  FOR UPDATE USING (true);

-- Enable Realtime for call signaling
ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_call_invite_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER call_invite_updated
  BEFORE UPDATE ON call_invites
  FOR EACH ROW EXECUTE FUNCTION update_call_invite_timestamp();
