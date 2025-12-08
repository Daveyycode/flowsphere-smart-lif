-- FlowSphere Vault Storage Subscription Schema
-- Hidden Vault Storage with subscription management
-- Receipt privacy: Labels never show "vault" or "secret"

-- =====================================================
-- VAULT SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Subscription tier
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'gold')),
  storage_limit_gb INTEGER NOT NULL,  -- 5, 12, or 30
  storage_used_bytes BIGINT DEFAULT 0,

  -- Receipt privacy (NEVER shows "vault" or "secret" on bank statement)
  receipt_mode TEXT NOT NULL CHECK (receipt_mode IN ('bundled', 'separate')),
  receipt_label TEXT,  -- User's custom label: "FS Cloud Services", etc.

  -- Stripe integration
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'grace_period', 'expired', 'cancelled')),

  -- Important dates
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  grace_period_ends_at TIMESTAMPTZ,  -- 14 days after expires_at
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One subscription per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE vault_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own subscription
CREATE POLICY "Users can view own vault subscription"
  ON vault_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vault subscription"
  ON vault_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert only through server-side (Stripe webhook)
-- No direct insert policy for security

-- =====================================================
-- VAULT FILE METADATA TABLE
-- Tracks hidden files (actual files are on device, not cloud)
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES vault_subscriptions(id) ON DELETE CASCADE NOT NULL,

  -- File identification (encrypted, server can't read)
  file_id TEXT NOT NULL,  -- UUID on device
  encrypted_name TEXT NOT NULL,  -- Encrypted real name
  disguised_name TEXT NOT NULL,  -- "com.apple.security.xxx.cert"
  disguise_type TEXT NOT NULL CHECK (disguise_type IN ('apple', 'android')),

  -- Size tracking
  file_size_bytes BIGINT NOT NULL,

  -- Device binding
  device_fingerprint TEXT NOT NULL,  -- Must match to access

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique file per user
  UNIQUE(user_id, file_id)
);

-- Enable RLS
ALTER TABLE vault_file_metadata ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own vault file metadata"
  ON vault_file_metadata FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault file metadata"
  ON vault_file_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vault file metadata"
  ON vault_file_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault file metadata"
  ON vault_file_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_vault_subscriptions_user ON vault_subscriptions(user_id);
CREATE INDEX idx_vault_subscriptions_status ON vault_subscriptions(status);
CREATE INDEX idx_vault_subscriptions_expires ON vault_subscriptions(expires_at);
CREATE INDEX idx_vault_file_metadata_user ON vault_file_metadata(user_id);
CREATE INDEX idx_vault_file_metadata_subscription ON vault_file_metadata(subscription_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update storage used when file metadata changes
CREATE OR REPLACE FUNCTION update_vault_storage_used()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE vault_subscriptions
    SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes,
        updated_at = NOW()
    WHERE id = NEW.subscription_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE vault_subscriptions
    SET storage_used_bytes = storage_used_bytes - OLD.file_size_bytes,
        updated_at = NOW()
    WHERE id = OLD.subscription_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update storage
CREATE TRIGGER trigger_update_vault_storage
AFTER INSERT OR DELETE ON vault_file_metadata
FOR EACH ROW EXECUTE FUNCTION update_vault_storage_used();

-- Function to check and update subscription status
CREATE OR REPLACE FUNCTION check_vault_subscription_status()
RETURNS TRIGGER AS $$
DECLARE
  grace_end TIMESTAMPTZ;
BEGIN
  -- Calculate grace period end (14 days after expiry)
  grace_end := NEW.expires_at + INTERVAL '14 days';

  -- Update status based on current time
  IF NEW.status = 'cancelled' THEN
    -- Keep as cancelled
    RETURN NEW;
  ELSIF NOW() < NEW.expires_at THEN
    NEW.status := 'active';
    NEW.grace_period_ends_at := NULL;
  ELSIF NOW() < grace_end THEN
    NEW.status := 'grace_period';
    NEW.grace_period_ends_at := grace_end;
  ELSE
    NEW.status := 'expired';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-check status on update
CREATE TRIGGER trigger_check_vault_status
BEFORE UPDATE ON vault_subscriptions
FOR EACH ROW EXECUTE FUNCTION check_vault_subscription_status();

-- =====================================================
-- PRICING REFERENCE (for documentation)
-- =====================================================
-- Basic (5GB):  $3/month, $30/year
-- Pro (12GB):   $5/month, $50/year
-- Gold (30GB):  $8/month, $80/year
--
-- Grace Period: 14 days
-- After grace: Read-only (can view/download, can't upload)
--
-- Receipt Labels (user chooses):
-- - FS Cloud Services
-- - FS Premium Features
-- - FS Storage Plan
-- - FS Cloud Backup
-- - FS Data Services
-- - FlowSphere Add-on
-- =====================================================
