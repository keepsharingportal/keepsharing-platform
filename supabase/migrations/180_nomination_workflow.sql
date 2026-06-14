-- ── Nomination workflow: model the real multi-actor multi-phase flow ───────
--
-- The user pointed out the actual editorial flow for a nomination has
-- distinct phases the current single-status enum doesn't capture:
--
--   1. Nominator submits           (community_submissions row created at 'new')
--   2. Editor accepts nomination   (phase = 'nomination-accepted')
--   3. Outreach email goes to nominee (phase = 'outreach-sent')
--   4. Nominee opens email + accepts (phase = 'nominee-accepted')
--   5. Nominee submits interview form (phase = 'interview-received')
--   6. Editor drafts article from nomination + interview (phase = 'draft-in-progress')
--   7. Draft ready for editorial review (phase = 'draft-ready')
--   8. Editorial approved (phase = 'approved')
--   9. Sitting in monthly pool waiting to be scheduled (phase = 'in-pool')
--   10. Scheduled for a specific issue month (phase = 'scheduled')
--   11. Published — guide_articles row exists (phase = 'published')
--   12. Archived or declined (phase = 'archived' | 'nominee-declined')
--
-- We KEEP the existing `status` column for backward compat with every
-- query that still uses it; `phase` becomes the new source of truth for
-- the workflow state machine.
--
-- Nominee fields are separate from submitter fields. The nominator
-- gives us the nominee's email/name/phone in the original form; the
-- editor confirms / corrects before outreach fires.

ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'nominated';

-- Validate the value at the DB level so a typo can't put a row in
-- limbo. The DEFAULT is 'nominated' because that's what a fresh row
-- from the public /submit form represents.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'community_submissions' AND constraint_name = 'community_submissions_phase_check'
  ) THEN
    ALTER TABLE community_submissions ADD CONSTRAINT community_submissions_phase_check
      CHECK (phase IN (
        'nominated',
        'nomination-accepted',
        'outreach-sent',
        'nominee-accepted',
        'nominee-declined',
        'interview-sent',
        'interview-received',
        'draft-in-progress',
        'draft-ready',
        'approved',
        'in-pool',
        'scheduled',
        'published',
        'archived'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_submissions_phase
  ON community_submissions (phase, target_publication, created_at DESC);

-- ── Nominee identity (separate from submitter) ──────────────────────────────
-- The original submission has submitter_name/submitter_email (the nominator).
-- These columns track who we're trying to feature.
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS nominee_name  TEXT;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS nominee_email TEXT;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS nominee_phone TEXT;

-- ── Outreach tracking ──────────────────────────────────────────────────────
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS outreach_sent_at      TIMESTAMPTZ;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS outreach_message      TEXT;     -- snapshot of what we sent
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS outreach_sent_by      UUID;     -- admin_users.id
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS nominee_responded_at  TIMESTAMPTZ;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS nominee_response      TEXT;     -- 'accepted' | 'declined' | null

-- ── Interview form ──────────────────────────────────────────────────────────
-- Token is the secret URL piece: /interview/[token]. The nominee receives
-- it in the outreach email, opens it, fills out per-type questions, uploads
-- images. We capture their responses + images in JSONB.
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS interview_token         TEXT;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS interview_sent_at       TIMESTAMPTZ;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS interview_submitted_at  TIMESTAMPTZ;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS interview_responses     JSONB DEFAULT '{}'::jsonb;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS interview_image_urls    JSONB DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_submissions_interview_token
  ON community_submissions (interview_token)
  WHERE interview_token IS NOT NULL;

-- ── Monthly scheduling ──────────────────────────────────────────────────────
-- scheduled_for_month is the YYYY-MM string the editor picked when they
-- pulled this article from the pool. issue_month/issue_year (text/int)
-- existed before but were free-form; this is the structured version
-- the bridge + cron use.
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS scheduled_for_month TEXT;  -- 'YYYY-MM'

CREATE INDEX IF NOT EXISTS idx_community_submissions_pool
  ON community_submissions (target_publication, submission_type, phase, scheduled_for_month)
  WHERE phase IN ('in-pool', 'scheduled');

-- ── Backfill phase for existing rows ────────────────────────────────────────
-- Rows created before this migration map their status → phase so the new
-- machine has a coherent starting point. Test data + real submissions
-- both get a sensible phase.
UPDATE community_submissions SET phase = CASE
  WHEN promoted_to_article_id IS NOT NULL                                  THEN 'published'
  WHEN status = 'published'                                                THEN 'published'
  WHEN status = 'scheduled'                                                THEN 'scheduled'
  WHEN status = 'approved'        AND scheduled_for_month IS NOT NULL      THEN 'scheduled'
  WHEN status = 'approved'                                                 THEN 'approved'
  WHEN status = 'in-editing'                                               THEN 'draft-in-progress'
  WHEN status = 'ai-draft-ready'                                           THEN 'draft-ready'
  WHEN status = 'ready-for-ai'                                             THEN 'interview-received'
  WHEN status = 'in-progress'                                              THEN 'interview-received'
  WHEN status = 'awaiting-info'                                            THEN 'outreach-sent'
  WHEN status = 'needs-review'                                             THEN 'nominated'
  WHEN status = 'new'                                                      THEN 'nominated'
  WHEN status = 'rejected'                                                 THEN 'archived'
  WHEN status = 'archived'                                                 THEN 'archived'
  ELSE 'nominated'
END
WHERE phase = 'nominated' OR phase IS NULL;

COMMENT ON COLUMN community_submissions.phase IS
  'Source of truth for the multi-actor nomination workflow. See migration 180 for the full state diagram. The legacy `status` column is kept for backward compat but new code should write phase.';
