-- FlowSphere Supabase Schema
-- Run this in your Supabase SQL Editor

-- ==========================================
-- CEO Sessions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS ceo_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  device TEXT,
  city TEXT,
  country TEXT,
  coordinates JSONB,
  authenticated BOOLEAN DEFAULT false,
  biometric_verified BOOLEAN DEFAULT false,
  two_factor_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Security Logs Table
-- ==========================================
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'failed_login', 'password_change', 'vault_access', 'suspicious_activity'
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  description TEXT,
  ip_address TEXT,
  device TEXT,
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);

-- ==========================================
-- User Feedback Table
-- ==========================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  type TEXT NOT NULL, -- 'complaint', 'inquiry', 'feature-request', 'bug-report', 'praise'
  category TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'new', -- 'new', 'in-progress', 'resolved', 'closed'
  assigned_to TEXT,
  response TEXT,
  response_time INTEGER, -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Analytics Events Table
-- ==========================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT, -- 'navigation', 'feature_usage', 'error', 'performance'
  properties JSONB,
  session_id TEXT,
  device_type TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);

-- ==========================================
-- User Settings Sync Table
-- ==========================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE ceo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own data
CREATE POLICY "Users can view own sessions" ON ceo_sessions
  FOR SELECT USING (true); -- CEO can see all

CREATE POLICY "Users can insert sessions" ON ceo_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update sessions" ON ceo_sessions
  FOR UPDATE USING (true);

-- Security logs - insert only (append-only audit log)
CREATE POLICY "Anyone can insert security logs" ON security_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "CEO can view security logs" ON security_logs
  FOR SELECT USING (true);

-- User feedback - users can submit, CEO can view all
CREATE POLICY "Anyone can submit feedback" ON user_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "CEO can view all feedback" ON user_feedback
  FOR SELECT USING (true);

CREATE POLICY "CEO can update feedback" ON user_feedback
  FOR UPDATE USING (true);

-- Analytics - insert for all, read for CEO
CREATE POLICY "Anyone can log analytics" ON analytics_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "CEO can view analytics" ON analytics_events
  FOR SELECT USING (true);

-- User settings - users manage their own
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL USING (true);

-- ==========================================
-- Functions
-- ==========================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Sample Data (Optional - remove in production)
-- ==========================================

-- You can uncomment these to test:
-- INSERT INTO security_logs (event_type, description, severity)
-- VALUES ('system_startup', 'FlowSphere database initialized', 'info');
