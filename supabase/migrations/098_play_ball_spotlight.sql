-- Migration 098: Play Ball Sports Spotlight — structured Q&A on articles.
--
-- The Play Ball column in the magazine features Athletes, Coaches, and
-- Volunteers with a structured "Quick Hits" sidebar (different questions
-- per type) and a top-strip of 5 vitals (school, role, years, etc.).
--
-- We store this on the article itself so the public detail page can render
-- a magazine-matching layout, and so future filtering ("show me all athletes
-- whose dream college is Auburn") becomes possible.
--
-- Fields are deliberately generic — the template config in
-- src/lib/articles/spotlight-templates.ts decides which keys are expected
-- for each type, so we can add new types (Trainer? Referee?) without a
-- migration.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS spotlight_type TEXT,                -- 'athlete' | 'coach' | 'volunteer' (or NULL = not a spotlight)
  ADD COLUMN IF NOT EXISTS spotlight_data JSONB DEFAULT '{}';  -- { topStrip: {...}, quickHits: {...} }

ALTER TABLE guide_articles
  DROP CONSTRAINT IF EXISTS guide_articles_spotlight_type_chk;

ALTER TABLE guide_articles
  ADD CONSTRAINT guide_articles_spotlight_type_chk
  CHECK (spotlight_type IS NULL OR spotlight_type IN ('athlete', 'coach', 'volunteer'));

CREATE INDEX IF NOT EXISTS idx_guide_articles_spotlight
  ON guide_articles (spotlight_type, published)
  WHERE spotlight_type IS NOT NULL;
