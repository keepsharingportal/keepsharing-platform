-- Migration 100: Save the original hero upload for article re-crop.
--
-- Until now /api/admin/upload ran Sharp once on the hero, kept the
-- natural-aspect output, and threw the raw away. That meant an editor who
-- wanted to nudge the crop (subject too low, head clipped at the top, busy
-- background winning Sharp's attention pick) had to re-upload.
--
-- Same pattern we already use for school bits and events (migration 092):
-- stash the original in a private bucket, store the path on the row, expose
-- a 9-direction compass + auto button in the admin to re-process from the
-- saved original.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS hero_image_orig_path TEXT;

-- Partial index — only articles that have a saved original. Skips legacy
-- rows whose hero was uploaded before this migration.
CREATE INDEX IF NOT EXISTS idx_guide_articles_hero_orig
  ON guide_articles (hero_image_orig_path)
  WHERE hero_image_orig_path IS NOT NULL;
