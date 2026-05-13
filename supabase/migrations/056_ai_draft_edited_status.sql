-- ─────────────────────────────────────────────────────────────────────────────
-- 056: Add 'edited' to ai_draft_status constraint
-- Tracks when an operator has manually refined an AI-generated draft.
-- Distinguishes machine-generated ('ready') from human-touched ('edited').
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
    'edited',
    'failed',
    'needs_info'
  ));

COMMENT ON COLUMN community_submissions.ai_draft_status IS
  'none       — no draft generated yet
   queued     — queued for generation (future batch mode)
   generating — API call in flight
   ready      — AI draft written, awaiting human review
   edited     — operator has refined the AI draft
   needs_info — required fields missing; draft not generated
   failed     — generation error; check ai_draft_content for details';
