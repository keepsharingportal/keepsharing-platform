-- Migration 120: ad_inquiries
--
-- Phase-1 advertise lead capture. Public "Claim This Spot" placeholders
-- (homepage, articles, etc.) open a small inquiry form; submissions land
-- here and fire an email to the editor at the same time. Phase 2 will
-- wire Stripe checkout so the form becomes self-serve.
--
-- status:
--   'new'         — just landed, hasn't been touched
--   'contacted'   — editor reached out
--   'converted'   — became a booking
--   'closed-lost' — declined or went silent

CREATE TABLE IF NOT EXISTS ad_inquiries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type TEXT NULL,
  business_name  TEXT NOT NULL,
  contact_name   TEXT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NULL,
  message        TEXT NULL,
  source_url     TEXT NULL,
  status         TEXT NOT NULL DEFAULT 'new',
  notes          TEXT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_inquiries_status
  ON ad_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_inquiries_placement
  ON ad_inquiries (placement_type) WHERE placement_type IS NOT NULL;

ALTER TABLE ad_inquiries ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; admin reads + the public POST go through
-- the service-role API so no public policy is needed.
