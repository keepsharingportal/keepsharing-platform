-- ── Multi-brand article attribution ─────────────────────────────────────────
--
-- Every guide_articles row now has an explicit brand (the origin brand
-- that owns the SEO + canonical URL) and a list of brands it's been
-- syndicated to (cross-published with rel=canonical back to the origin).
--
-- Brand families are defined in code (src/lib/markets.ts):
--   parents      — RRP, MBP, AOP, ESP, GPP
--   fifty-plus   — BOOM
--
-- Cross-publish defaults to "same family only" in the admin UI, but the
-- data model itself allows any combination — a deliberate cross-family
-- syndication (e.g., a grandparent piece relevant to both) is possible
-- with an admin override.
--
-- Backfill: every existing row gets brand_slug='rrp'. Historical content
-- is RRP-only by definition (no other brand sites existed yet).

ALTER TABLE guide_articles
  -- The ORIGIN brand. SEO + canonical URL live here. Required for new rows.
  ADD COLUMN IF NOT EXISTS brand_slug TEXT NOT NULL DEFAULT 'rrp',
  -- Brands this article is cross-published to. Each syndicated brand
  -- renders the same article body with rel=canonical pointing back to
  -- the origin brand's URL. Default: not syndicated anywhere.
  ADD COLUMN IF NOT EXISTS syndicated_to_brands TEXT[] NOT NULL DEFAULT '{}';

-- The default + the historical reality (every existing article was RRP)
-- means the backfill is a no-op — the DEFAULT clause handled it. Still,
-- we make sure here in case future fields cause any row to slip through.
UPDATE guide_articles
   SET brand_slug = 'rrp'
 WHERE brand_slug IS NULL OR brand_slug = '';

-- Tight check: brand_slug must match the platform's known brands. We
-- enforce in code (markets.ts is the source of truth) but a CHECK keeps
-- bad data from getting through a stray SQL write.
ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_brand_slug_chk;
ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_brand_slug_chk
  CHECK (brand_slug IN ('rrp', 'boom', 'aop', 'mbp', 'esp', 'gpp'));

-- Index on brand_slug — every public route filters on it.
CREATE INDEX IF NOT EXISTS idx_guide_articles_brand
  ON guide_articles (brand_slug, published_at DESC)
  WHERE published = TRUE;

-- GIN index on syndicated_to_brands so the public query
--   WHERE brand_slug = $1 OR $1 = ANY(syndicated_to_brands)
-- can use both indexes via OR-bitmap scan when the syndication graph
-- gets wide.
CREATE INDEX IF NOT EXISTS idx_guide_articles_syndicated
  ON guide_articles USING GIN (syndicated_to_brands);

COMMENT ON COLUMN guide_articles.brand_slug IS
  'Origin brand that owns this article. SEO + rel=canonical reference this brand''s domain.';
COMMENT ON COLUMN guide_articles.syndicated_to_brands IS
  'Additional brands that publish this article (with rel=canonical back to origin). Use the admin editor to manage.';
