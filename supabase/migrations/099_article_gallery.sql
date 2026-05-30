-- Migration 099: Article photo gallery.
--
-- The print magazine often runs 4+ supporting photos at the bottom of a
-- story (Play Ball spotlights, Mom-to-Mom features, etc). Cramming them
-- inline is awkward on short articles, so the web treatment is a branded
-- gallery strip below the body that pops into a lightbox on click.
--
-- We store as JSONB so each image can carry its own alt text + caption +
-- order, and so editors can add/remove without schema changes.
--
-- Shape (array of objects):
--   [
--     { "url": "...", "thumbnail_url": "...", "alt": "...", "caption": "...",
--       "width": 1600, "height": 1067 },
--     ...
--   ]
--
-- url           — the optimized WebP from the Sharp pipeline (article-media bucket)
-- thumbnail_url — 400px WebP variant (also produced by Sharp pipeline)
-- alt           — accessibility / SEO description
-- caption       — optional human-readable caption shown in the lightbox
-- width/height  — recorded so layout can reserve space (no CLS)

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- Constrain to an array so callers can't accidentally store {} and confuse
-- the renderer. Drop-then-add so re-runs are clean.
ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_gallery_images_array_chk;

ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_gallery_images_array_chk
  CHECK (jsonb_typeof(gallery_images) = 'array');

-- Partial index — only articles with at least one gallery image. Helps the
-- future "show me all articles with photo galleries" admin filter without
-- bloating the index across every article.
CREATE INDEX IF NOT EXISTS idx_guide_articles_has_gallery
  ON guide_articles ((jsonb_array_length(gallery_images)))
  WHERE jsonb_array_length(gallery_images) > 0;
