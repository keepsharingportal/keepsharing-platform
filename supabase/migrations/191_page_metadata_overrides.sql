-- ── Migration 191 — Per-page social + SEO metadata overrides ──────────
--
-- WordPress + Yoast/MashShare give per-page editor control over
-- og:title, og:description, og:image for EVERY page. We have it for
-- articles already (guide_articles.seo_*). This migration extends it
-- to static routes — /school-zone, /about, /family-resource-guide,
-- the column hub pages, etc.
--
-- buildPageMetadata() in lib/seo/metadata reads this table first; the
-- coded defaults stay as the fallback.

CREATE TABLE IF NOT EXISTS page_metadata_overrides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The route path this override applies to. Path-only (no origin) so
  -- the same override works across brand origins when the path exists
  -- on multiple brands (e.g. /school-zone exists per-brand).
  route_path          TEXT NOT NULL,

  -- Brand slug for brand-scoped overrides. NULL = applies globally.
  brand_slug          TEXT,

  -- OG / page-level overrides
  og_title            TEXT,
  og_description      TEXT,
  og_image_url        TEXT,

  -- Twitter card overrides — when null, og_* values are inherited
  twitter_card_type   TEXT
    CHECK (twitter_card_type IN ('summary', 'summary_large_image', 'app', 'player') OR twitter_card_type IS NULL),
  twitter_title       TEXT,
  twitter_description TEXT,
  twitter_image_url   TEXT,

  -- Pinterest sometimes uses a different image (vertical 2:3) + description
  pinterest_image_url TEXT,
  pinterest_description TEXT,

  -- Indexing controls
  noindex             BOOLEAN NOT NULL DEFAULT FALSE,
  canonical_override  TEXT,

  -- Provenance + audit
  generated_by_ai_at  TIMESTAMPTZ,
  last_edited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_by      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A route + brand pair must be unique. Treat NULL brand as a sentinel
-- via the COALESCE — Postgres unique indexes treat NULLs as distinct.
CREATE UNIQUE INDEX IF NOT EXISTS uq_page_metadata_overrides
  ON page_metadata_overrides (LOWER(route_path), COALESCE(brand_slug, '_global'));

COMMENT ON TABLE page_metadata_overrides IS
  'Per-route social sharing + SEO metadata overrides. Read by buildPageMetadata() before falling back to coded defaults. Edited at /admin/seo/page-metadata.';
