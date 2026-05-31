-- Migration 106: per-column editorial branding (logo image + tagline).
--
-- Surfaces a small admin UI where editors can give each column its own
-- visual identity (Grands, Mom to Mom, Dave Says, Education Matters,
-- Teens Tweens Screens, etc.) without code changes. Color palettes and
-- structural config still live in src/lib/articles/column-brand.ts;
-- this table only holds the EDITORIAL pieces:
--   - logo_url: uploaded PNG/SVG used as the article eyebrow on every
--               article in this column (falls back to the code default
--               wordmark/pill when null)
--   - tagline:  short identity line shown under the article title (falls
--               back to the code default tagline when null)
--
-- The column_slug column matches content-taxonomy.ts entries.

CREATE TABLE IF NOT EXISTS column_branding (
  column_slug   TEXT PRIMARY KEY,
  logo_url      TEXT,
  tagline       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger so admin lists can sort by recent edits
CREATE OR REPLACE FUNCTION set_column_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_column_branding_updated_at ON column_branding;
CREATE TRIGGER trg_column_branding_updated_at
  BEFORE UPDATE ON column_branding
  FOR EACH ROW EXECUTE FUNCTION set_column_branding_updated_at();
