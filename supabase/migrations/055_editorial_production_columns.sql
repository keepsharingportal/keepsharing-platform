-- ─────────────────────────────────────────────────────────────────────────────
-- 055: Editorial Production Columns
-- Adds lightweight editorial production metadata to community_submissions.
-- These columns support the /admin/editorial production pipeline:
-- title, excerpt, slug, image, tags, destination, print placement, scheduling.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS working_title           TEXT,
  ADD COLUMN IF NOT EXISTS excerpt                 TEXT,
  ADD COLUMN IF NOT EXISTS slug_suggestion         TEXT,
  ADD COLUMN IF NOT EXISTS feature_image_url       TEXT,
  ADD COLUMN IF NOT EXISTS tags                    JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS destination_section     TEXT,
  ADD COLUMN IF NOT EXISTS destination_guide_slug  TEXT,
  ADD COLUMN IF NOT EXISTS print_placement         TEXT,
  ADD COLUMN IF NOT EXISTS publish_date            DATE,
  ADD COLUMN IF NOT EXISTS newsletter_include      BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS social_queue            BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS homepage_feature        BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS permissions_confirmed   BOOLEAN  NOT NULL DEFAULT FALSE;

-- ── Destination section constraint ────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD CONSTRAINT destination_section_check
  CHECK (destination_section IS NULL OR destination_section IN (
    'website-article',
    'print-issue',
    'grouped-roundup',
    'guide-integration',
    'homepage-section',
    'newsletter',
    'social-queue',
    'family-favorites',
    'event-calendar'
  ));

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_destination_idx
  ON community_submissions (destination_section, target_publication);

CREATE INDEX IF NOT EXISTS cs_publish_date_idx
  ON community_submissions (publish_date)
  WHERE publish_date IS NOT NULL;

-- ── Comments ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN community_submissions.working_title IS
  'Operator-set editorial title. Overrides derived label in editorial queue.';

COMMENT ON COLUMN community_submissions.excerpt IS
  '1-2 sentence summary for web/newsletter use. Written by editor, not AI.';

COMMENT ON COLUMN community_submissions.destination_section IS
  'Where this content will be published. Drives publish readiness checklist.';

COMMENT ON COLUMN community_submissions.permissions_confirmed IS
  'True when subject or guardian has confirmed consent for publication. Required for profile features.';
