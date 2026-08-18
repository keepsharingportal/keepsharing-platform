-- Migration 228: Give school bits a shareable URL
--
-- A shared school bit was
--   /school-zone/school-bits?focus=f2a1e2a5-2a1a-4181-8c55-6b057efd1bf8
-- which tells a parent nothing about what they're being sent, looks like spam
-- when pasted into a text message, and drops the reader on the full feed rather
-- than the thing they clicked. Search engines get nothing to index either — the
-- item has no URL of its own, so a bit about one school's news can never rank
-- for that school's name.
--
-- Adds slug so each bit can live at
--   /school-zone/school-bits/talent-education-art-christian-academy-...
--
-- Nullable with a partial unique index rather than NOT NULL: bits arrive from
-- public submissions, and a slug is derived on approval, so an in-flight
-- submission legitimately has none yet. Partial so those nulls don't collide
-- with each other.

ALTER TABLE school_bits
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS school_bits_slug_key
  ON school_bits (slug)
  WHERE slug IS NOT NULL;

-- Lookup by slug is the detail page's only query, and it runs on every share
-- click.
CREATE INDEX IF NOT EXISTS idx_school_bits_slug_status
  ON school_bits (slug, status);

COMMENT ON COLUMN school_bits.slug IS
  'URL segment for /school-zone/school-bits/<slug>. Derived from title on approval; unique among non-null values. Old ?focus=<uuid> links redirect here.';

-- Verify:
--   SELECT COUNT(*) FILTER (WHERE slug IS NOT NULL) AS slugged, COUNT(*) AS total
--     FROM school_bits WHERE status IN ('approved','published');
