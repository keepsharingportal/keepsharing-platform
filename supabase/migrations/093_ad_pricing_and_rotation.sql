-- Migration 093: Ad pricing + rotation weight on ad_placements
--
-- Two new capabilities:
--
--   1. Per-slot pricing — each ad_placement can carry its own rate card
--      (monthly / quarterly / annual). When staff assigns a sponsor or
--      adds an advertiser to the rotation pool, the price auto-populates
--      from the slot's rate, not from memory. The admin map page
--      surfaces these so the sales team always knows what to quote.
--
--   2. Rotation weight — a numeric multiplier (default 1.0) that the
--      rotation logic in getActiveAds() uses to bias toward higher-tier
--      advertisers. Weight maps directly to the advertiser's package
--      tier when they're added to the pool:
--        Tier 4 (Won / Full page)   → weight 4.0
--        Tier 3 (Chosen / Half)     → weight 3.0
--        Tier 2 (Featured / Third)  → weight 2.0
--        Tier 1 (Found / Quarter)   → weight 1.0
--        Starter (Sixth)            → weight 0.5
--
--      The rotation algorithm sums all weights in the pool and picks a
--      random value — higher weight = proportionally more impressions.
--      Locked sponsors ignore the weight (they're always shown).
--
--   3. rotation_group — optional tag for grouping ads into rotation
--      pools. NULL = locked/static slot. 'run-of-site' = the main
--      rotation pool. Custom values allow per-section pools later.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS price_monthly    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_quarterly  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_annual     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rotation_weight  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS rotation_group   TEXT;          -- NULL = locked, 'run-of-site' = main pool

CREATE INDEX IF NOT EXISTS idx_ad_placements_rotation
  ON ad_placements (rotation_group, is_active)
  WHERE rotation_group IS NOT NULL;

-- Map existing advertiser_packages tiers to a numeric weight so the
-- rotation can read the weight at query time via a join. This avoids
-- hardcoding the tier→weight map in app code.
ALTER TABLE advertiser_packages
  ADD COLUMN IF NOT EXISTS rotation_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0;

UPDATE advertiser_packages SET rotation_weight = 4.0  WHERE tier_name = 'tier-4-won';
UPDATE advertiser_packages SET rotation_weight = 3.0  WHERE tier_name = 'tier-3-chosen';
UPDATE advertiser_packages SET rotation_weight = 2.0  WHERE tier_name = 'tier-2-featured';
UPDATE advertiser_packages SET rotation_weight = 1.0  WHERE tier_name = 'tier-1-found';
