-- ─────────────────────────────────────────────────────────────────────────────
-- 060: Social Export & Asset Readiness Columns
-- Supports the /admin/distribution/social-export workflow.
-- Tracks image/asset status, planner export state, and promotion logging.
-- No automatic posting — all changes require human action.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS image_status               TEXT,
  ADD COLUMN IF NOT EXISTS exported_to_social_planner BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS social_promoted_at         TIMESTAMPTZ;

-- ── Image status constraint ────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD CONSTRAINT image_status_check
  CHECK (image_status IS NULL OR image_status IN (
    'image_ready',          -- image confirmed and ready to use
    'needs_photo',          -- waiting for a photo from submitter
    'needs_canva_graphic',  -- operator needs to create a Canva graphic
    'use_existing_image',   -- reuse a photo already on file
    'no_image_needed'       -- text-only post
  ));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_social_export_idx
  ON community_submissions (approved_social, social_planner_ready, exported_to_social_planner)
  WHERE approved_social = TRUE OR social_planner_ready = TRUE OR social_queue = TRUE;

CREATE INDEX IF NOT EXISTS cs_image_status_idx
  ON community_submissions (image_status)
  WHERE image_status IS NOT NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON COLUMN community_submissions.image_status IS
  'Operator-set image/asset readiness for social posts.
   image_ready          — asset confirmed and ready.
   needs_photo          — waiting for photo from submitter or photographer.
   needs_canva_graphic  — operator must create a branded Canva graphic.
   use_existing_image   — reuse a photo already received or on file.
   no_image_needed      — text-only post, no image required.';

COMMENT ON COLUMN community_submissions.exported_to_social_planner IS
  'TRUE when operator has exported this post to GHL Social Planner or another tool.
   Does NOT indicate posting occurred — only that export happened.';

COMMENT ON COLUMN community_submissions.social_promoted_at IS
  'Date/time when the operator marks this content as actually promoted/posted.
   Set manually — no automatic posting. Useful for tracking what ran.';
