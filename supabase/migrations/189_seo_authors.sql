-- ── Migration 189 — Editor-controlled author profiles for E-E-A-T ────────
--
-- Currently /authors/[slug] pulls a name from guide_articles.author_name
-- and auto-generates a one-line bio. For E-E-A-T credibility Google
-- wants:
--   - real bio paragraph
--   - headshot
--   - credentials / job title
--   - sameAs URLs (LinkedIn, twitter, etc.)
--   - knowsAbout topics
--
-- This table is keyed by author_slug (same authorNameToSlug() the
-- author page uses) so it joins cleanly to whatever name shape an
-- article carries. Editor can fill any subset; the public page falls
-- back to auto-generated content for missing fields.

CREATE TABLE IF NOT EXISTS seo_authors (
  author_slug        TEXT PRIMARY KEY,
  display_name       TEXT NOT NULL,

  -- E-E-A-T signal payload
  bio                TEXT,
  headshot_url       TEXT,
  job_title          TEXT,
  credentials        TEXT[]      DEFAULT '{}',
  knows_about        TEXT[]      DEFAULT '{}',
  -- JSONB array of { platform: 'twitter'|'linkedin'|'instagram'|..., url: '...' }
  social_urls        JSONB       DEFAULT '[]'::jsonb,

  -- Per-author email / public contact
  contact_email      TEXT,

  -- Brand scoping — if NULL the author publishes across multiple brands.
  -- Used to bias the Person.publisher field on the public schema.
  primary_brand_slug TEXT,

  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by     TEXT
);

CREATE INDEX IF NOT EXISTS idx_seo_authors_brand ON seo_authors(primary_brand_slug);

-- Trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION touch_seo_authors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seo_authors_updated_at ON seo_authors;
CREATE TRIGGER seo_authors_updated_at
  BEFORE UPDATE ON seo_authors
  FOR EACH ROW EXECUTE FUNCTION touch_seo_authors_updated_at();
