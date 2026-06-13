-- ── Advertiser account soft-archive ────────────────────────────────────────
--
-- Editorial discovered duplicate advertiser_accounts rows (same real
-- business, different name spellings — e.g. "United Gymstars" and
-- "United Gymstars Cheer Camp"). Rather than hard-delete the wrong one,
-- add an archived_at column so the row stays in place (preserves any
-- linked print_ad_placements / circulation_stops history) but is
-- excluded from every active-advertiser query.
--
-- Convention: archived_at IS NULL = active. Set archived_at to a
-- timestamp to soft-delete. Nothing in the platform unsets it
-- automatically — it's a manual editorial decision.

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN advertiser_accounts.archived_at IS
  'When set, this advertiser_account row is treated as soft-deleted: excluded from active-advertiser queries, ad-match diagnostic, and tier-assignment job. Use for duplicates, defunct businesses, or stale onboarding entries.';

CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_active
  ON advertiser_accounts (created_at DESC)
  WHERE archived_at IS NULL;
