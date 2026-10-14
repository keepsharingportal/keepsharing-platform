-- Migration 235: market scoping for advertise leads
--
-- Migration 232 scoped the content and ad-serving tables. ad_inquiries was
-- missed, and it is the one table where the omission costs money: a Greater
-- Pensacola business fills in "Claim This Spot" and the row lands with no
-- record of which brand it came in on. Two brands' pipelines in one
-- undifferentiated list, and no way to hand a publisher their own leads.
--
-- Additive and reversible, like 232:
--   * nullable column with a DEFAULT, so existing inserts keep working
--     whichever side of the deploy they are on
--   * backfilled to 'rrp' because every row that exists today is River
--     Region's — River Region is the only brand that has been live
--   * no NOT NULL and no constraint, so the code can deploy before or after
--     this runs (PostgREST fails a whole query on an unknown column, which is
--     why the route reads back with select('*') rather than naming it)
--
-- Rollback:  ALTER TABLE ad_inquiries DROP COLUMN IF EXISTS market;

ALTER TABLE ad_inquiries
  ADD COLUMN IF NOT EXISTS market TEXT NULL DEFAULT 'rrp';

-- Existing leads all predate the second brand.
UPDATE ad_inquiries SET market = 'rrp' WHERE market IS NULL;

-- The admin pipeline view filters by brand and sorts newest-first.
CREATE INDEX IF NOT EXISTS idx_ad_inquiries_market_created
  ON ad_inquiries (market, created_at DESC);

COMMENT ON COLUMN ad_inquiries.market IS
  'Brand slug this advertise lead came in on (markets.ts). NULL only on rows '
  'inserted between the code deploy and this migration; treat as rrp.';
