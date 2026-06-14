-- ── Bridge: community_submissions → guide_articles ─────────────────────────
--
-- Community submissions land in community_submissions. The homepage reads
-- guide_articles. Without this bridge they're two parallel systems — an
-- editor can "approve" a Mom-to-Mom submission and it never appears in
-- the homepage rotation because nothing copies it across.
--
-- This migration adds:
--   1. promoted_to_article_id FK on community_submissions so we can trace
--      lineage + prevent double-publish (one submission → at most one
--      published article).
--   2. submission_type_columns lookup table mapping submission_type to
--      the column_slug it should become when published. Data-driven so
--      editors can re-route a type without a code change.
--   3. Seed data for the existing submission types using the canonical
--      column_slugs the homepage rotation already reads.
--
-- The bridge does NOT auto-publish. An editor clicks "Publish to
-- homepage" from /admin/editorial/approval (or Content Deployment).
-- The bridge API then inserts the guide_articles row, sets
-- published=true, and stamps promoted_to_article_id back here.

-- 1. FK column
ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS promoted_to_article_id UUID NULL
    REFERENCES guide_articles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_community_submissions_promoted
  ON community_submissions (promoted_to_article_id)
  WHERE promoted_to_article_id IS NOT NULL;

-- 2. Lookup table — submission_type → column_slug (+ default guide_slug)
CREATE TABLE IF NOT EXISTS submission_type_columns (
  submission_type TEXT PRIMARY KEY,
  -- The column_slug stamped on the resulting guide_articles row.
  -- This is what the homepage rotation queries against.
  column_slug     TEXT NOT NULL,
  -- The guide_articles.guide_slug to set as parent guide (drives the
  -- listing page where the article also appears). family-resource-guide
  -- is the safe default — most rotation content lives there.
  guide_slug      TEXT NOT NULL DEFAULT 'family-resource-guide',
  -- Optional human label for the admin UI ("Routes to: Mom to Mom column").
  label           TEXT NULL,
  -- When NULL, the type is intentionally NOT bridged (e.g. event
  -- submissions go to calendar_events, not guide_articles). The API
  -- returns 400 for these so editors get a clear "publish this in the
  -- calendar tool" pointer instead of a silent failure.
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submission_type_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS submission_type_columns_service ON submission_type_columns;
CREATE POLICY submission_type_columns_service ON submission_type_columns FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS submission_type_columns_admin ON submission_type_columns;
CREATE POLICY submission_type_columns_admin   ON submission_type_columns FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- 3. Seed the canonical mappings. Slugs match what src/app/page.tsx
-- already queries (mom-to-mom, teacher-of-month, grands-greatest, etc.).
-- ON CONFLICT keeps any per-deployment edits the operator made later.
INSERT INTO submission_type_columns (submission_type, column_slug, guide_slug, label) VALUES
  ('teacher-of-the-month',        'teacher-of-month',     'family-resource-guide', 'Teacher of the Month'),
  ('mom-to-mom',                  'mom-to-mom',           'family-resource-guide', 'Mom to Mom'),
  ('grands-are-the-greatest',     'grands-greatest',      'family-resource-guide', 'Grands Are the Greatest'),
  ('play-ball',                   'play-ball',            'family-resource-guide', 'Play Ball'),
  ('student-spotlight',           'student-spotlights',   'family-resource-guide', 'Student Spotlight'),
  ('school-news',                 'school-bits',          'family-resource-guide', 'School Bits'),
  ('birthday-celebration',        'birthday-celebrations','family-resource-guide', 'Birthday Celebrations'),
  ('parent-picks',                'frg-best-of',          'family-resource-guide', 'Parent Picks / Best Of'),
  ('boom-profile',                'boom-profile',         'fifty-plus-guide',      'Boom / 50+ Profile'),
  ('family-favorites-nomination', 'family-favorites',     'family-resource-guide', 'Family Favorites')
ON CONFLICT (submission_type) DO NOTHING;

-- event-submission has NO row by design — it bridges to calendar_events,
-- not guide_articles. The bridge API returns a friendly error pointing
-- the editor at /admin/calendar instead.

COMMENT ON TABLE submission_type_columns IS
  'Maps community_submissions.submission_type → guide_articles.column_slug for the publish-to-article bridge. Edit rows here (not in code) to re-route a type — the bridge picks up changes immediately.';
