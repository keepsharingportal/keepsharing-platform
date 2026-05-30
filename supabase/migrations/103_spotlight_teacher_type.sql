-- Migration 103: Allow 'teacher' as a 4th spotlight type alongside the
-- athlete / coach / volunteer Play Ball trio (migration 098).
--
-- Teacher of the Month uses the same structured-spotlight infrastructure
-- — top strip on the article page, JSONB spotlight_data, admin form picks
-- up the template automatically. The eyebrow + colors come from the column
-- brand config (column_slug = 'teacher-of-the-month'), not from the Play
-- Ball pipe pattern.

ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_spotlight_type_chk;

ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_spotlight_type_chk
  CHECK (spotlight_type IS NULL OR spotlight_type IN ('athlete', 'coach', 'volunteer', 'teacher'));
