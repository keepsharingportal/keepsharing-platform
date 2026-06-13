-- ── circulation_publications brand fields ─────────────────────────────────
--
-- Migration 116 created circulation_publications with the core columns
-- (short_name, name, abbrev, color_hex, print_total, holdback, sort_order,
-- active) but the admin Publications page queries for website, issuu_url,
-- and logo_path. Without these columns the SELECT throws, the page
-- silently catches and renders 'No publications yet' even when rows exist,
-- and any attempt to add a new row hits the unique constraint on
-- short_name because the existing rows aren't visible to the editor.
--
-- This adds the three brand columns. All nullable so existing rows
-- (RRP, Boom) auto-fill with NULL and don't need a backfill.

ALTER TABLE circulation_publications
  ADD COLUMN IF NOT EXISTS website   TEXT NULL,
  ADD COLUMN IF NOT EXISTS issuu_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS logo_path TEXT NULL;

COMMENT ON COLUMN circulation_publications.website   IS 'Brand website URL — used on the public pickup-location map header.';
COMMENT ON COLUMN circulation_publications.issuu_url IS 'Digital edition link (Issuu / Calameo / etc.) — surfaced on the homepage current-issue widget.';
COMMENT ON COLUMN circulation_publications.logo_path IS 'Hosted logo URL or /assets/img/… path. Inline upload coming later.';
