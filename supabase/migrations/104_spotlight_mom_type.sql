-- Migration 104: Allow 'mom' as a 5th spotlight type so the Mom to Mom
-- column can opt into the structured-spotlight infrastructure (top strip,
-- About card, branded eyebrow). Extends the constraint from 098/103.

ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_spotlight_type_chk;

ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_spotlight_type_chk
  CHECK (spotlight_type IS NULL OR spotlight_type IN ('athlete', 'coach', 'volunteer', 'teacher', 'mom'));
