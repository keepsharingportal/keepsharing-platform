-- Migration 227: Store the uncropped original for advertiser/listing hero photos
--
-- Mirrors guide_articles.hero_image_orig_path (migration 100). Re-cropping is
-- only possible if the full-resolution upload is kept somewhere — the served
-- WebP has already been cover-cropped and downscaled, so re-cropping from it
-- would compound the loss and could never recover framing outside the first
-- crop.
--
-- Articles have had upload + 9-way gravity picker + drag-a-region re-crop since
-- migration 100. Listings had upload only, and until this week not even that —
-- the guide listing editor was a paste-a-URL text box. This is the schema half
-- of bringing listing photos to the same standard.
--
-- Private bucket `listing-hero-orig` holds the originals; only the derived
-- WebP in `article-media` is public.

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS hero_photo_orig_path TEXT;

COMMENT ON COLUMN advertiser_accounts.hero_photo_orig_path IS
  'Path in the listing-hero-orig bucket holding the uncropped upload, so the hero can be re-cropped without a re-upload. Null for heroes set before migration 227 or pasted in as a URL.';

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'advertiser_accounts' AND column_name = 'hero_photo_orig_path';
