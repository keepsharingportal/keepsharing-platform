-- ── Migration 197 — Social caption examples (few-shot voice tuning) ──
--
-- Adds a per-brand library of "captions that hit perfectly" — editor-
-- curated examples the AI caption generator reads as few-shot prompts.
-- Examples beat abstract voice instructions for matching real tone.
--
-- Shape (JSONB): array of objects
--   [
--     { "caption": "Most of us grew up thinking...", "platform": "facebook", "note": "Personal hook + reframe" },
--     { "caption": "Friday energy, summer-soaked 🌞...", "platform": "instagram", "note": "Light + visual" },
--     ...
--   ]
--
-- The generator picks 2-3 random examples per call to demonstrate the
-- voice without over-fitting to a single tone.

ALTER TABLE brand_seo_profiles
  ADD COLUMN IF NOT EXISTS social_caption_examples JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN brand_seo_profiles.social_caption_examples IS
  'Few-shot examples of "captions that hit." JSONB array: [{ caption, platform?, note? }]. Generator picks 2-3 random ones per call.';
