-- ─────────────────────────────────────────────────────────────────────────────
-- 054: Add 'needs_info' to ai_draft_status check constraint
-- Required for the community draft generation system to signal when a
-- submission is missing required fields before AI drafting can proceed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  DROP CONSTRAINT IF EXISTS ai_draft_status_check;

ALTER TABLE community_submissions
  ADD CONSTRAINT ai_draft_status_check
  CHECK (ai_draft_status IN (
    'none',
    'queued',
    'generating',
    'ready',
    'failed',
    'needs_info'
  ));

COMMENT ON COLUMN community_submissions.ai_draft_status IS
  'none       — no draft generated yet
   queued     — queued for generation (future batch mode)
   generating — API call in flight
   ready      — draft written, awaiting human review
   needs_info — required fields missing; draft not generated
   failed     — generation error; check ai_draft_content for details';
