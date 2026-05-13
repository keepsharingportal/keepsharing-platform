-- ─────────────────────────────────────────────────────────────────────────────
-- 059: AI Task Queue Foundation
--
-- Foundational table for AI-assisted content workflows.
-- AI prepares work (captions, teasers, suggestions, summaries).
-- Humans review and approve every task before any output is used.
--
-- SAFETY INVARIANT:
--   human_review_required = TRUE on every row by default.
--   No AI task output is ever applied automatically.
--   Approval by an operator is always required.
--
-- FUTURE ARCHITECTURE:
--   Background processing via Supabase Edge Functions + pg_cron (or external
--   cron) will INSERT rows with status='queued', then a worker will process
--   them and set status='completed' / 'failed'. Operators review in
--   /admin/ai-tasks and approve/reject. Approved output is then applied to
--   the source record by a separate (human-triggered) action.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_tasks (

  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Task classification ──────────────────────────────────────────────────
  task_type               TEXT        NOT NULL,
  source_table            TEXT,                 -- e.g. 'community_submissions'
  source_id               UUID,                 -- FK-equivalent (no hard constraint for flexibility)

  -- ── Workflow ─────────────────────────────────────────────────────────────
  status                  TEXT        NOT NULL DEFAULT 'queued',
  priority                TEXT        NOT NULL DEFAULT 'normal',
  requested_by            TEXT,                 -- operator name or 'system'
  assigned_to             TEXT,                 -- operator assigned to review

  -- ── Input / Output ───────────────────────────────────────────────────────
  input_snapshot          JSONB,                -- snapshot of data used as input (audit trail)
  output_preview          TEXT,                 -- short human-readable summary for queue display
  output_payload          JSONB,                -- full structured AI output
  error_message           TEXT,                 -- set when status = 'failed'

  -- ── Human review (mandatory) ─────────────────────────────────────────────
  human_review_required   BOOLEAN     NOT NULL DEFAULT TRUE,
    -- This field exists as a belt-and-suspenders reminder.
    -- The application MUST enforce this independently.
  approved_by             TEXT,
  approved_at             TIMESTAMPTZ,
  rejected_at             TIMESTAMPTZ,
  rejection_note          TEXT,                 -- optional reason for rejection

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at              TIMESTAMPTZ,          -- when worker began processing
  completed_at            TIMESTAMPTZ           -- when AI finished (success or failure)

);

-- ── Constraints ───────────────────────────────────────────────────────────────

ALTER TABLE ai_tasks
  ADD CONSTRAINT ai_tasks_status_check
  CHECK (status IN (
    'queued',         -- waiting to be processed
    'running',        -- worker is processing
    'completed',      -- AI finished; awaiting human review
    'needs_review',   -- explicitly flagged for operator review
    'approved',       -- operator approved the output
    'rejected',       -- operator rejected the output
    'failed',         -- processing error; see error_message
    'canceled'        -- manually stopped before completion
  ));

ALTER TABLE ai_tasks
  ADD CONSTRAINT ai_tasks_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE ai_tasks
  ADD CONSTRAINT ai_tasks_task_type_check
  CHECK (task_type IN (
    'social_caption',       -- social media caption for content
    'newsletter_teaser',    -- newsletter section teaser
    'missing_info_email',   -- email to submitter requesting missing info
    'article_refresh',      -- suggestion to refresh aging article
    'proposal_notes',       -- advertiser proposal preparation notes
    'sponsor_pairing',      -- sponsor/content alignment suggestion
    'headline_options',     -- alternative headline suggestions
    'seo_suggestions',      -- SEO keyword/meta suggestions
    'event_summary'         -- cleaned event listing/summary
  ));

-- human_review_required must always be TRUE for now
-- (leave as advisory constraint; enforced at application layer)

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS ai_tasks_status_idx
  ON ai_tasks (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_tasks_source_idx
  ON ai_tasks (source_table, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_tasks_review_queue_idx
  ON ai_tasks (human_review_required, status, created_at DESC)
  WHERE human_review_required = TRUE
    AND status IN ('completed', 'needs_review');

CREATE INDEX IF NOT EXISTS ai_tasks_priority_idx
  ON ai_tasks (priority, status, created_at DESC)
  WHERE status IN ('queued', 'running');

-- ── Auto-update trigger (reuses existing pattern) ────────────────────────────
-- Note: add an updated_at column + trigger if needed when the table is active.

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE ai_tasks IS
  'AI task queue for background content assistance. '
  'Every row requires human review before output is applied anywhere. '
  'human_review_required = TRUE is a safety invariant. '
  'Approval does NOT auto-publish — a separate human action applies the output.';

COMMENT ON COLUMN ai_tasks.input_snapshot IS
  'JSONB snapshot of the data sent to the AI at generation time. '
  'Enables audit: what did the AI actually see?';

COMMENT ON COLUMN ai_tasks.output_preview IS
  'Short plain-text summary of the AI output for queue display. '
  'First 300 characters of the output, or a curated summary.';

COMMENT ON COLUMN ai_tasks.output_payload IS
  'Full structured AI output. Schema varies by task_type. '
  'Only applied to source record after human approval.';

COMMENT ON COLUMN ai_tasks.human_review_required IS
  'Always TRUE. Reminder invariant — application must enforce separately. '
  'No AI output is ever applied without explicit operator approval.';
