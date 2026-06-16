-- ── Migration 195 — SEO AI provenance ────────────────────────────────
--
-- Tracks when an article's seo_title / seo_description were filled by
-- the bulk AI seeder vs. by a human editor. Lets the editor filter:
--   - "Show me everything Claude seeded → review + tune"
--   - "Show me everything still empty → backfill"
--   - "Show me everything an editor wrote → leave alone"
--
-- Set by the bulk seeder when it writes a row. Cleared (set NULL) when
-- a human edits the row through the normal SEO editor.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS seo_ai_seeded_at TIMESTAMPTZ;

COMMENT ON COLUMN guide_articles.seo_ai_seeded_at IS
  'Timestamp when the bulk seeder generated this article''s seo_title/seo_description. NULL = either never seeded, or a human has edited since.';

CREATE INDEX IF NOT EXISTS idx_guide_articles_seo_ai_seeded
  ON guide_articles (seo_ai_seeded_at)
  WHERE seo_ai_seeded_at IS NOT NULL;
