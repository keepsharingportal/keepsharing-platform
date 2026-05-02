-- Migration 022: Proposals table
-- Run in Supabase SQL editor after migration 021.

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_slug TEXT UNIQUE NOT NULL,
  publication_slug TEXT DEFAULT 'rrp',
  business_name TEXT NOT NULL,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_category TEXT,
  estimated_ltv TEXT,
  recommended_tier TEXT,
  recommended_addons TEXT[] DEFAULT '{}',
  custom_monthly_price NUMERIC,
  contract_length_months INT DEFAULT 12,
  intro_paragraph TEXT,
  value_props JSONB DEFAULT '[]',
  roi_math TEXT,
  onboarding_timeline TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  viewed_count INT DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_token  ON proposals(token_slug);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at DESC);
