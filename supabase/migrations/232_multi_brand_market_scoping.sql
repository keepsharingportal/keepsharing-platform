-- Migration 232: market scoping for the tables that still lack it
--
-- Goal: bring Greater Pensacola Parents (and Eastern Shore, Mobile Bay,
-- Auburn Opelika) online as full brands — an admin switches the dropdown and
-- adds articles, events, guides, listings and ads to THAT brand, a publisher
-- scoped to a market sees only their own, and ads serve only to the market
-- that bought them.
--
-- ── Why this is generic rather than a GPP build ─────────────────────────────
-- Nothing below names a brand. The admin already has the scoping machinery:
-- admin_users.allowed_markets, the activeMarket cookie, marketsToQuery().
-- What was missing is that half the content tables had nowhere to record WHICH
-- brand a row belongs to, so everything was implicitly River Region. Once every
-- table carries a market, every brand works — GPP today, the rest the moment
-- someone flips them on.
--
-- Already scoped (no change here):
--   guide_articles    brand_slug + syndicated_to_brands
--   calendar_events   market
--   school_bits       market
--   magazine_issues   market
--   business_spotlights publication
--
-- Unscoped on purpose (shared across brands, not per-brand):
--   guide_types       the CATALOG of guide kinds (childcare, summer camp…).
--                     The taxonomy is the same for every parenting brand;
--                     only which ones a brand runs, and with what copy, is
--                     per-brand — and that is guide_configs, below.
--   monthly_columns   Mom to Mom / Teacher of the Month are the same editorial
--                     columns across the parenting family.
--   verticals, site_settings, nav_visibility — platform-level.

-- ── 1. Ads ──────────────────────────────────────────────────────────────────
-- The core of the request: "the ad system should feed only that area's ad".
--
-- NULL is meaningful here and is NOT the same as unscoped. A NULL market is a
-- HOUSE ad — our own "advertise with us" filler, which should appear on every
-- brand. A booked placement always carries the market that bought it. The
-- serving query is therefore `market = <brand> OR market IS NULL`, so house
-- ads keep working on brands with no inventory sold yet, which is exactly the
-- state every new brand launches in.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS market TEXT;

COMMENT ON COLUMN ad_placements.market IS
  'Brand slug this placement serves (rrp, gpp, esp, mbp, aop, rr50plus). NULL = house ad, served on every brand.';

-- Backfill: every existing placement was sold against River Region, EXCEPT the
-- self-promo filler, which should stay house-wide. Identified by pointing at
-- /advertise with no advertiser revenue attached.
UPDATE ad_placements
   SET market = 'rrp'
 WHERE market IS NULL
   AND NOT (ad_link = '/advertise' AND price_monthly IS NULL);

CREATE INDEX IF NOT EXISTS idx_ad_placements_market_serving
  ON ad_placements (market, placement_type, is_active)
  WHERE archived_at IS NULL;

-- ── 2. Advertisers ──────────────────────────────────────────────────────────
-- A business belongs to the market whose publisher owns the relationship.
--
-- Deliberately a single market, not an array: a business that advertises in
-- both Mobile Bay and Eastern Shore is ONE business record with a placement in
-- each market. ad_placements.market already carries that, so an array here
-- would be a second, redundant and divergeable source of truth for the same
-- fact. The home market answers "whose account is this?", which is the
-- question a publisher list view asks.

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'rrp';

COMMENT ON COLUMN advertiser_accounts.market IS
  'Home market — the brand whose publisher owns this relationship. Cross-market buys are expressed as ad_placements rows per market, not here.';

CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_market
  ON advertiser_accounts (market);

-- ── 3. Guides ───────────────────────────────────────────────────────────────
-- guide_types stays the shared catalog. guide_configs becomes per-brand: which
-- guides this brand runs, its own title/subtitle/hero/active flag/featured
-- month. GPP can run a Childcare Guide with Pensacola copy without touching
-- River Region's.
--
-- The existing unique constraint on guide_type_slug has to widen to
-- (market, guide_type_slug) or the second brand can't configure the same guide.

ALTER TABLE guide_configs
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'rrp';

COMMENT ON COLUMN guide_configs.market IS
  'Which brand this guide configuration belongs to. One row per (market, guide_type_slug).';

DO $$
DECLARE
  con RECORD;
BEGIN
  -- Drop whatever single-column unique currently sits on guide_type_slug,
  -- whichever name it was created with.
  FOR con IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE t.relname = 'guide_configs'
       AND c.contype = 'u'
       AND (SELECT array_agg(a.attname ORDER BY a.attname)
              FROM unnest(c.conkey) k
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k)
           = ARRAY['guide_type_slug']
  LOOP
    EXECUTE format('ALTER TABLE guide_configs DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- Also drop a bare unique INDEX (as opposed to constraint) if one exists.
DROP INDEX IF EXISTS guide_configs_guide_type_slug_key;
DROP INDEX IF EXISTS idx_guide_configs_guide_type_slug;

ALTER TABLE guide_configs
  DROP CONSTRAINT IF EXISTS guide_configs_market_guide_type_slug_key;
ALTER TABLE guide_configs
  ADD CONSTRAINT guide_configs_market_guide_type_slug_key
  UNIQUE (market, guide_type_slug);

-- ── 4. Guide listings ───────────────────────────────────────────────────────
-- publication_id exists but is NULL on all 923 rows, so it has never actually
-- scoped anything. Add market alongside it and backfill, rather than trying to
-- resurrect a column nothing writes.

ALTER TABLE guide_listings
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'rrp';

COMMENT ON COLUMN guide_listings.market IS
  'Brand whose guide directory this listing appears in.';

CREATE INDEX IF NOT EXISTS idx_guide_listings_market_guide
  ON guide_listings (market, guide_type_slug, is_published);

-- ── 4b. Trending bar ────────────────────────────────────────────────────────
-- Editor-curated links in the homepage trending strip. NULL is house-wide
-- like ad_placements — "Community Calendar" is a fine link on every brand,
-- while a specific article belongs to the brand that published it.

ALTER TABLE trending_items
  ADD COLUMN IF NOT EXISTS market TEXT;

COMMENT ON COLUMN trending_items.market IS
  'Brand this trending link belongs to. NULL = shown on every brand.';

-- Existing pinned items point at River Region articles, except generic
-- destinations that are right on any brand.
UPDATE trending_items
   SET market = 'rrp'
 WHERE market IS NULL
   AND link NOT IN ('/calendar', '/local-guides', '/articles', '/nominate');

-- ── 5. Turn the parenting brands on ─────────────────────────────────────────
-- publications.is_active gates nothing in code today, but it is the row an
-- operator reads to answer "is this brand live?". Make it tell the truth.
--
-- Note the slug drift to clean up separately: MARKETS in code calls the
-- fifty-plus brand 'rr50plus' (migration 169 renamed it from 'boom'), while
-- publications still carries 'rrb'. Left alone here — this migration is about
-- the parenting family, and renaming a publications row is a separate blast
-- radius.

UPDATE publications SET is_active = true WHERE slug IN ('gpp', 'esp', 'mbp');

-- ── 6. Seed each parenting brand with River Region's guide line-up ──────────
-- "Duplicate the RRP design and add GPP" — this is the data half of that. Each
-- new brand gets a config row for every guide River Region runs, carrying the
-- same titles and featured months, so the structure is there on day one.
--
-- is_active = false on every seeded row. A brand with no listings yet must not
-- publish a Childcare Guide that resolves to an empty page; the editor turns
-- each one on as they fill it. Hero/cover images are deliberately NOT copied —
-- a Pensacola guide fronted by a Montgomery photograph is worse than no photo,
-- and the admin guide editor already has an uploader for them.
--
-- ON CONFLICT DO NOTHING so re-running never clobbers copy an editor has
-- already written for their own brand.

INSERT INTO guide_configs (market, guide_type_slug, title, subtitle, featured_month, is_active)
SELECT b.market, g.guide_type_slug, g.title, g.subtitle, g.featured_month, false
  FROM (SELECT unnest(ARRAY['gpp','esp','mbp','aop']) AS market) b
 CROSS JOIN (
   SELECT guide_type_slug, title, subtitle, featured_month
     FROM guide_configs
    WHERE market = 'rrp'
 ) g
ON CONFLICT (market, guide_type_slug) DO NOTHING;

-- Verify:
--   SELECT market, count(*) FROM ad_placements GROUP BY market;
--   SELECT market, count(*) FROM advertiser_accounts GROUP BY market;
--   SELECT market, guide_type_slug, is_active FROM guide_configs ORDER BY market;
--   SELECT market, count(*) FROM guide_listings GROUP BY market;
--   SELECT slug, is_active FROM publications ORDER BY slug;
--
-- To give the shared Gulf Coast publisher their three brands:
--   UPDATE admin_users
--      SET allowed_markets = ARRAY['esp','gpp','mbp']
--    WHERE email = '<publisher email>';
