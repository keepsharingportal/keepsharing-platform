-- Migration 023: Partner Portal auth + lead reminder columns
-- Run in Supabase SQL editor after migration 022.

CREATE TABLE IF NOT EXISTS partner_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_auth_token      ON partner_auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_partner_auth_advertiser ON partner_auth_tokens(advertiser_id);

ALTER TABLE partner_leads
  ADD COLUMN IF NOT EXISTS partner_reminder_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_last_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_next_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS partner_marked_converted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_marked_converted_at TIMESTAMPTZ;
