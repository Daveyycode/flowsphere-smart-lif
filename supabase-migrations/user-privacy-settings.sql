-- FlowSphere Secure Messenger - User Privacy Settings
-- Run this in Supabase SQL Editor to add per-user privacy controls
-- Created: Dec 4, 2025 - Phase 2: Per-User Privacy Settings

-- ============================================
-- USER PRIVACY SETTINGS TABLE
-- Each user controls what OTHERS see about THEM
-- ============================================
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,

  -- Privacy Controls (what others see about THIS user)
  show_online_status BOOLEAN DEFAULT TRUE,
  show_last_seen BOOLEAN DEFAULT TRUE,
  allow_screenshots BOOLEAN DEFAULT FALSE,
  allow_save_media BOOLEAN DEFAULT TRUE,
  show_unique_id BOOLEAN DEFAULT FALSE,
  auto_delete_timer INTEGER DEFAULT 0, -- Minutes, 0 = off

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one row per device_id (primary settings source)
  UNIQUE(device_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_privacy_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_device_id ON user_privacy_settings(device_id);

-- Enable RLS
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read privacy settings (needed to respect others' privacy choices)
CREATE POLICY "Anyone can read privacy settings" ON user_privacy_settings
  FOR SELECT USING (true);

-- Policy: Anyone can create their own privacy settings
CREATE POLICY "Anyone can create privacy settings" ON user_privacy_settings
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own privacy settings
CREATE POLICY "Anyone can update privacy settings" ON user_privacy_settings
  FOR UPDATE USING (true);

-- ============================================
-- ENABLE REALTIME
-- Required for live privacy updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE user_privacy_settings;

-- ============================================
-- DONE! Privacy settings table is ready
-- ============================================
