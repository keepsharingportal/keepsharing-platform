-- ─────────────────────────────────────────────────────────────────────────────
-- 058: Editor Approval + Social Promotion Columns
-- Supports the /admin/editorial/approval review desk.
-- Tracks per-channel approval, change requests, social captions,
-- newsletter teasers, and GHL social planner handoff state.
-- Human approval required before any content is published or posted.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions

  -- ── Per-channel approvals ──────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS approved_web          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_newsletter   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_social       BOOLEAN     NOT NULL DEFAULT FALSE,

  -- ── Change request tracking ────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS needs_changes_note    TEXT,          -- set when editor requests changes

  -- ── Editor attribution ─────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS editor_reviewed_at    TIMESTAMPTZ,   -- first review timestamp
  ADD COLUMN IF NOT EXISTS editor_name           TEXT,          -- who approved

  -- ── Social promotion copy ──────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS caption_facebook      TEXT,          -- prepared Facebook caption
  ADD COLUMN IF NOT EXISTS caption_instagram     TEXT,          -- prepared Instagram caption
  ADD COLUMN IF NOT EXISTS caption_sms           TEXT,          -- short SMS/text teaser (≤160 chars)
  ADD COLUMN IF NOT EXISTS newsletter_teaser     TEXT,          -- newsletter blurb (2–3 sentences)
  ADD COLUMN IF NOT EXISTS social_hashtags       JSONB        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS social_image_note     TEXT,          -- which image to use for social
  ADD COLUMN IF NOT EXISTS social_publish_date   DATE,          -- preferred social post date
  ADD COLUMN IF NOT EXISTS social_link           TEXT,          -- URL for social posts

  -- ── GHL / Social planner handoff ──────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS social_planner_ready  BOOLEAN     NOT NULL DEFAULT FALSE;
  -- When TRUE, operator has confirmed this is ready to hand off to social scheduler.
  -- Does NOT trigger any automatic posting.

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_approval_web_idx
  ON community_submissions (approved_web)
  WHERE approved_web = TRUE;

CREATE INDEX IF NOT EXISTS cs_approval_social_idx
  ON community_submissions (approved_social)
  WHERE approved_social = TRUE;

CREATE INDEX IF NOT EXISTS cs_planner_ready_idx
  ON community_submissions (social_planner_ready)
  WHERE social_planner_ready = TRUE;

CREATE INDEX IF NOT EXISTS cs_changes_idx
  ON community_submissions (needs_changes_note)
  WHERE needs_changes_note IS NOT NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON COLUMN community_submissions.approved_web IS
  'Editor has approved this content for web publication. Does not auto-publish.';

COMMENT ON COLUMN community_submissions.approved_social IS
  'Editor has approved social promotion copy. Does not auto-post.';

COMMENT ON COLUMN community_submissions.social_planner_ready IS
  'Operator has confirmed social prep is complete and ready for the scheduling tool. No API posting.';

COMMENT ON COLUMN community_submissions.needs_changes_note IS
  'Set when editor requests changes. Clears automatically when any channel is approved.';

COMMENT ON COLUMN community_submissions.caption_sms IS
  'Short SMS/text teaser. Keep under 160 characters for compatibility.';
