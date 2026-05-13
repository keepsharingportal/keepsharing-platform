-- ─────────────────────────────────────────────────────────────────────────────
-- 064: Social Workflow Status Consolidation
--
-- Replaces four overlapping boolean flags with a single ordered state machine.
--
-- EXISTING BOOLEANS (retained for one release cycle):
--   approved_social              — editor approved
--   social_queue                 — marked for social
--   social_planner_ready         — operator confirmed prep complete
--   exported_to_social_planner   — exported to scheduler
--
-- NEW STATE MACHINE: social_workflow_status
--   draft         — not yet submitted for social consideration
--   needs_review  — marked for social, awaiting editorial approval
--   approved      — editor has approved for social use
--   queued        — operator confirmed ready; all prep (captions, hashtag) done
--   exported      — operator exported to GHL Social Planner or other tool
--   scheduled     — confirmed scheduled in external tool (optional step)
--   posted        — operator confirmed the post went live
--   archived      — removed from active social workflow
--
-- The booleans are preserved here and will be dropped in migration 065 after
-- all UI references have been migrated to use social_workflow_status.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS social_workflow_status TEXT NOT NULL DEFAULT 'draft';

-- ── Populate from existing boolean combinations ───────────────────────────────
-- Priority order: most advanced state wins.

UPDATE community_submissions
  SET social_workflow_status = CASE
    WHEN social_promoted_at IS NOT NULL             THEN 'posted'
    WHEN exported_to_social_planner = TRUE          THEN 'exported'
    WHEN social_planner_ready = TRUE                THEN 'queued'
    WHEN approved_social = TRUE                     THEN 'approved'
    WHEN social_queue = TRUE AND approved_social = FALSE THEN 'needs_review'
    ELSE 'draft'
  END
  WHERE social_workflow_status = 'draft';   -- only update rows still at default

-- ── Constraint ────────────────────────────────────────────────────────────────

ALTER TABLE community_submissions
  ADD CONSTRAINT community_submissions_social_workflow_status_check
  CHECK (social_workflow_status IN (
    'draft',        -- not yet submitted for social consideration
    'needs_review', -- marked for social; awaiting editorial approval
    'approved',     -- editor has approved the content for social use
    'queued',       -- all prep done; ready to export to scheduler
    'exported',     -- operator exported to GHL Social Planner or other tool
    'scheduled',    -- confirmed scheduled in external tool (optional)
    'posted',       -- operator confirmed the post went live
    'archived'      -- removed from active social workflow
  ));

-- ── Index ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_social_workflow_status_idx
  ON community_submissions (social_workflow_status, created_at DESC)
  WHERE social_workflow_status NOT IN ('draft', 'archived');

-- ── Comment ───────────────────────────────────────────────────────────────────

COMMENT ON COLUMN community_submissions.social_workflow_status IS
  'Unified social distribution state machine. Replaces approved_social, social_queue, '
  'social_planner_ready, and exported_to_social_planner booleans. '
  'Valid transitions: draft → needs_review → approved → queued → exported → posted. '
  'scheduled and archived are optional side states. '
  'Old boolean columns will be removed in migration 065 after UI migration is complete.';
