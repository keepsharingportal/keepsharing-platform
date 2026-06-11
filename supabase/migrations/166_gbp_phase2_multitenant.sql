-- ── GBP Phase 2 — per-advertiser multi-tenant ──────────────────────────────
--
-- Phase 1 (migration 150): RRP's own GBP. One row per connected location
-- owned by the publisher.
--
-- Phase 2 (this migration): each advertiser can ALSO connect their own GBP
-- and let RRP editorial post on their behalf. Same table, same sync logic,
-- same posts + insights infrastructure — just a nullable
-- advertiser_account_id column that distinguishes:
--   NULL  → publisher-owned (Phase 1)
--   SET   → advertiser-owned (Phase 2)
--
-- Why one table: the API surface is identical (same Google APIs, same
-- post composer, same daily metric pull, same OAuth refresh dance). One
-- table means one query path for "all GBPs we manage", one nightly cron
-- syncs everything, and the existing audit/insights/posts tables work
-- for both without a fork.

ALTER TABLE google_business_integrations
  ADD COLUMN IF NOT EXISTS advertiser_account_id UUID NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gbp_integrations_advertiser
  ON google_business_integrations (advertiser_account_id)
  WHERE advertiser_account_id IS NOT NULL;

COMMENT ON COLUMN google_business_integrations.advertiser_account_id IS
  'When NULL, this is the publisher''s own GBP (Phase 1). When set, the advertiser owns the GBP and the publisher posts on their behalf (Phase 2).';

-- Helpful index for the "all GBPs across all advertisers" admin view.
CREATE INDEX IF NOT EXISTS idx_gbp_integrations_active
  ON google_business_integrations (is_active, last_sync_at DESC);
