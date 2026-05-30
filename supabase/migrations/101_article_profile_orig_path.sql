-- Migration 101: Same re-crop story for the article profile image.
--
-- profile_image_url is the square avatar shown in the Community Spotlights
-- sidebar and other small-circle slots. Same crop-misses-the-subject issue
-- as the hero, so the same fix: save the original in a private bucket,
-- expose a gravity picker that re-processes from it.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS profile_image_orig_path TEXT;

CREATE INDEX IF NOT EXISTS idx_guide_articles_profile_orig
  ON guide_articles (profile_image_orig_path)
  WHERE profile_image_orig_path IS NOT NULL;
