-- ─────────────────────────────────────────────────────────────────────────────
-- 057: Distribution Coordination Columns
-- Adds lightweight distribution metadata to community_submissions.
-- Supports the /admin/distribution orchestration layer:
-- homepage placement, newsletter assembly, social queue, guide routing.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS homepage_section    TEXT,
  ADD COLUMN IF NOT EXISTS homepage_priority   INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS homepage_remove_on  DATE,
  ADD COLUMN IF NOT EXISTS newsletter_section  TEXT,
  ADD COLUMN IF NOT EXISTS newsletter_order    INTEGER,
  ADD COLUMN IF NOT EXISTS social_priority     TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS social_platforms    JSONB NOT NULL DEFAULT '[]';

-- ── Constraints ───────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD CONSTRAINT homepage_section_check
  CHECK (homepage_section IS NULL OR homepage_section IN (
    'hero', 'featured', 'community', 'school', 'events', 'guides'
  ));

ALTER TABLE community_submissions
  ADD CONSTRAINT social_priority_dist_check
  CHECK (social_priority IN ('low', 'normal', 'high'));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_homepage_idx
  ON community_submissions (homepage_feature, homepage_section)
  WHERE homepage_feature = TRUE;

CREATE INDEX IF NOT EXISTS cs_newsletter_idx
  ON community_submissions (newsletter_include, newsletter_section, newsletter_order)
  WHERE newsletter_include = TRUE;

CREATE INDEX IF NOT EXISTS cs_social_queue_idx
  ON community_submissions (social_queue, social_priority)
  WHERE social_queue = TRUE;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON COLUMN community_submissions.homepage_section IS
  'Which section of the homepage this content occupies: hero | featured | community | school | events | guides';

COMMENT ON COLUMN community_submissions.homepage_priority IS
  '1 = highest priority, 10 = lowest. Used to order items within a homepage section.';

COMMENT ON COLUMN community_submissions.homepage_remove_on IS
  'Date when this item should rotate off the homepage. Operator-set; no auto-removal.';

COMMENT ON COLUMN community_submissions.newsletter_section IS
  'Which newsletter section this content belongs to.';

COMMENT ON COLUMN community_submissions.newsletter_order IS
  'Ordering within the newsletter section. Lower = earlier.';

COMMENT ON COLUMN community_submissions.social_priority IS
  'low | normal | high — helps operators prioritize social scheduling.';

COMMENT ON COLUMN community_submissions.social_platforms IS
  'Array of platform identifiers for planned social posts. e.g. ["facebook","instagram"]';
