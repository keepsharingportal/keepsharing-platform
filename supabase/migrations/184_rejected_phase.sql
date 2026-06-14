-- ── Rejected phase + reason capture ─────────────────────────────────────────
--
-- 'rejected' is editorially DIFFERENT from 'archived':
--
--   archived  = workflow ended (nominee declined, no reply, replaced by
--               another candidate, etc.) — bookkeeping close-out
--   rejected  = editor decided NOT to feature this nomination — a real
--               editorial decision the team should be able to revisit
--
-- A rejected row keeps its data, lives in a dedicated "Rejected" queue
-- filter, captures WHY (rejection_reason), and can be brought back
-- (reconsidered → phase=nominated) without data loss.

ALTER TABLE community_submissions
  DROP CONSTRAINT IF EXISTS community_submissions_phase_check;

ALTER TABLE community_submissions
  ADD CONSTRAINT community_submissions_phase_check
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
    'rejected',
    'archived'
  ));

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by      UUID;

-- Index for the "Rejected" queue filter
CREATE INDEX IF NOT EXISTS idx_community_submissions_phase_rejected
  ON community_submissions (rejected_at DESC)
  WHERE phase = 'rejected';

COMMENT ON COLUMN community_submissions.rejection_reason IS
  'Editor-supplied reason when phase=rejected. Visible to other editors. Cleared on reconsider.';
