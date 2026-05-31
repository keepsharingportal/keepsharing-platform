-- Migration 105: Allow 'grand' as a 6th spotlight type so the Grands Are
-- the Greatest column can opt into the structured-spotlight infrastructure
-- (top strip, brand-colored eyebrow, soft amber palette). Extends the
-- constraint from 098/103/104.

ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_spotlight_type_chk;

ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_spotlight_type_chk
  CHECK (spotlight_type IS NULL OR spotlight_type IN ('athlete', 'coach', 'volunteer', 'teacher', 'mom', 'grand'));
