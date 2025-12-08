-- FlowSphere OTP Table
-- Secure server-side OTP storage

-- ==========================================
-- OTP Codes Table
-- ==========================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT DEFAULT 'login', -- 'login', 'password_reset', 'email_verify', 'two_factor'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_code ON otp_codes(code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (via service role key)
-- No direct client access for security
CREATE POLICY "Server only - insert OTP" ON otp_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Server only - select OTP" ON otp_codes
  FOR SELECT USING (true);

CREATE POLICY "Server only - update OTP" ON otp_codes
  FOR UPDATE USING (true);

-- ==========================================
-- Cleanup Function (run periodically)
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW()
  OR (used = true AND created_at < NOW() - INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a cron job to run cleanup daily
-- SELECT cron.schedule('cleanup-otps', '0 0 * * *', 'SELECT cleanup_expired_otps()');
