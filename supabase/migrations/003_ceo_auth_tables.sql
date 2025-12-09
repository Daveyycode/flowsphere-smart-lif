-- CEO Authentication Tables
-- Created: December 9, 2025
-- Purpose: Server-side CEO authentication with secure session management

-- CEO Login Attempts (for security monitoring and rate limiting)
CREATE TABLE IF NOT EXISTS ceo_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CEO Sessions (for session management)
CREATE TABLE IF NOT EXISTS ceo_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ceo_login_attempts_ip ON ceo_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_ceo_login_attempts_created ON ceo_login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ceo_sessions_token ON ceo_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ceo_sessions_expires ON ceo_sessions(expires_at);

-- RLS Policies (restrict to service role only - no public access)
ALTER TABLE ceo_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (Edge Functions use service role)
-- No policies for anon/authenticated users = no access
CREATE POLICY "Service role only - login attempts"
  ON ceo_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only - sessions"
  ON ceo_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Clean up expired sessions (run periodically via cron or Edge Function)
-- DELETE FROM ceo_sessions WHERE expires_at < NOW();

-- Clean up old login attempts (keep last 30 days)
-- DELETE FROM ceo_login_attempts WHERE created_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE ceo_login_attempts IS 'Tracks all CEO login attempts for security monitoring';
COMMENT ON TABLE ceo_sessions IS 'Active CEO sessions with secure tokens';
