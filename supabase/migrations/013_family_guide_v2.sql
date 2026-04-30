-- KeepSharing Platform — Migration 013
-- Family Guide v2: multi-category support, tags, research flags, group hierarchy

-- ── guide_categories: add parent_group ────────────────────────────────────────
-- parent_group is the top-level grouping (e.g., "Schools", "Pediatric Care")
-- category name lives in the existing `name` column

ALTER TABLE guide_categories
  ADD COLUMN IF NOT EXISTS parent_group TEXT;

CREATE INDEX IF NOT EXISTS idx_gc_parent_group
  ON guide_categories(guide_slug, parent_group);

-- ── guide_listings: new columns ────────────────────────────────────────────────

ALTER TABLE guide_listings
  ADD COLUMN IF NOT EXISTS tags                   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS serves_pediatrics      TEXT,   -- 'YES' | 'NO' | 'VERIFY' | NULL
  ADD COLUMN IF NOT EXISTS offers_military_discount TEXT,  -- 'YES' | NULL
  ADD COLUMN IF NOT EXISTS subcategory            TEXT,   -- geographic or thematic sub-slice
  ADD COLUMN IF NOT EXISTS needs_research         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes                  TEXT;

-- ── New indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gl_tags
  ON guide_listings USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_gl_subcategory
  ON guide_listings(subcategory);

CREATE INDEX IF NOT EXISTS idx_gl_serves_peds
  ON guide_listings(serves_pediatrics);

CREATE INDEX IF NOT EXISTS idx_gl_listing_tier
  ON guide_listings(listing_tier);

CREATE INDEX IF NOT EXISTS idx_gl_needs_research
  ON guide_listings(needs_research);

CREATE INDEX IF NOT EXISTS idx_gl_military
  ON guide_listings(offers_military_discount);
