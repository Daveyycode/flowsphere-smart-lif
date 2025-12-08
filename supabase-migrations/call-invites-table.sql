-- FlowSphere Call Invites Table
-- Used for signaling incoming calls between users

-- Create call_invites table
CREATE TABLE IF NOT EXISTS call_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  room_url TEXT NOT NULL,
  room_name TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('video', 'audio')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'missed', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 seconds')
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_invites_to_user ON call_invites(to_user_id);
CREATE INDEX IF NOT EXISTS idx_call_invites_status ON call_invites(status);
CREATE INDEX IF NOT EXISTS idx_call_invites_created ON call_invites(created_at);

-- Enable Row Level Security
ALTER TABLE call_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to see invites sent to them
CREATE POLICY "Users can view their incoming calls"
  ON call_invites FOR SELECT
  USING (true);

-- Allow users to create call invites
CREATE POLICY "Users can create call invites"
  ON call_invites FOR INSERT
  WITH CHECK (true);

-- Allow users to update call status (accept/reject)
CREATE POLICY "Users can update call status"
  ON call_invites FOR UPDATE
  USING (true);

-- Allow deletion of old invites
CREATE POLICY "Users can delete invites"
  ON call_invites FOR DELETE
  USING (true);

-- Enable realtime for call_invites
ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;

-- Auto-cleanup expired invites (run periodically)
-- Note: You may need to set up a cron job or use Supabase Edge Functions for this
-- DELETE FROM call_invites WHERE expires_at < NOW() AND status = 'pending';

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_invite_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS call_invite_timestamp ON call_invites;
CREATE TRIGGER call_invite_timestamp
  BEFORE UPDATE ON call_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_call_invite_timestamp();
