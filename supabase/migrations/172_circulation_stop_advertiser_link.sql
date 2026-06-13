-- ── Link circulation_stops to advertiser_accounts ─────────────────────────
--
-- Before this migration `circulation_stops` had `is_advertiser` (boolean)
-- and `ad_level` (text: 'gold' / 'platinum') — both manually set by the
-- editor. There was no FK back to `advertiser_accounts`, so we couldn't
-- programmatically derive an ad tier from the advertiser's actual active
-- ad placements.
--
-- This adds the bridge column. Optional (NULL allowed) so:
--   1. Existing stops aren't broken until backfilled.
--   2. Resources (libraries, parks, community partners) stay NULL.
--   3. Standard listings (no ad activity) stay NULL.
--
-- Downstream: the monthly tier-assignment job (to be added in 173) walks
-- circulation_stops → joins advertiser_accounts → joins print_ad_placements
-- + ad_placements (digital) → computes the advertiser's largest active ad
-- size for the current month → writes the resulting tier to ad_level.

ALTER TABLE circulation_stops
  ADD COLUMN IF NOT EXISTS advertiser_account_id UUID
  REFERENCES advertiser_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN circulation_stops.advertiser_account_id IS
  'Optional FK to advertiser_accounts. When set, the monthly tier-assignment job derives ad_level from this advertiser''s active ad placements (print + online + website) for the current month.';

CREATE INDEX IF NOT EXISTS idx_circulation_stops_advertiser
  ON circulation_stops (advertiser_account_id)
  WHERE advertiser_account_id IS NOT NULL;
