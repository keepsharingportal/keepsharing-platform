-- ── Proposals: advertiser_account_id FK ────────────────────────────────────
--
-- proposals (migration 022) predates the advertiser_accounts table and
-- has no FK linking back to it — every business reference is just a
-- TEXT business_name. That makes the proposals rollup on the business
-- detail page fragile: a casing / punctuation difference in the
-- proposal's name vs the advertiser's name silently breaks the link.
--
-- This migration:
--   1. Adds advertiser_account_id UUID column with FK + ON DELETE SET NULL
--      (we want to keep proposal history even if the advertiser is later
--      merged into another row; the FK target dropping is the only
--      time we want the proposal to go orphan).
--   2. Backfills the FK from proposals.business_name → advertiser_accounts
--      via case-insensitive exact match. Ambiguous matches (multiple
--      advertisers with the same name) are skipped so the editor can
--      resolve them manually via the duplicates tool.
--   3. Adds an index on advertiser_account_id for the rollup query.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + the backfill UPDATE only
-- touches NULL rows.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS advertiser_account_id UUID
    REFERENCES advertiser_accounts(id) ON DELETE SET NULL;

-- Backfill: where exactly one matching advertiser_accounts row exists
-- by case-insensitive business_name, link the proposal to it. The
-- DISTINCT count guard skips rows that match multiple advertisers
-- (ambiguous historical data — editor merges those manually).
UPDATE proposals p
SET advertiser_account_id = a.id
FROM advertiser_accounts a
WHERE p.advertiser_account_id IS NULL
  AND lower(p.business_name) = lower(a.business_name)
  AND (
    SELECT count(*)
    FROM advertiser_accounts a2
    WHERE lower(a2.business_name) = lower(p.business_name)
  ) = 1;

CREATE INDEX IF NOT EXISTS idx_proposals_advertiser
  ON proposals(advertiser_account_id)
  WHERE advertiser_account_id IS NOT NULL;
