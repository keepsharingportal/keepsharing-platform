-- ─────────────────────────────────────────────────────────────────────────────
-- 053: Unified community submission and participation engine
-- Handles all recurring community-driven content workflows via one flexible
-- table. The `payload` JSONB field stores type-specific question answers.
-- This is separate from the existing `reader_submissions` table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Routing ──────────────────────────────────────────────────────────────
  submission_type    TEXT NOT NULL,
    -- teacher-of-the-month | mom-to-mom | grands-are-the-greatest | play-ball |
    -- student-spotlight | school-news | birthday-celebration | event-submission |
    -- parent-picks | boom-profile | family-favorites-nomination
  target_publication TEXT NOT NULL DEFAULT 'rrp',  -- rrp | mbp | aop | esp | gpp | boom
  target_market      TEXT,
  source_page        TEXT,   -- where the form was submitted from

  -- ── Publication targeting ──────────────────────────────────────────────
  issue_month        TEXT,           -- 'January', 'February', etc.
  issue_year         INTEGER,

  -- ── Submitter ────────────────────────────────────────────────────────────
  submitter_name     TEXT NOT NULL,
  submitter_email    TEXT NOT NULL,
  submitter_phone    TEXT,

  -- ── Subject of submission (extracted from payload for fast querying) ────
  related_person_name    TEXT,  -- the person being featured/nominated
  related_business_name  TEXT,  -- business being spotlighted
  related_school_name    TEXT,  -- school referenced in submission
  related_sport          TEXT,  -- for Play Ball type

  -- ── Flexible payload for type-specific answers ────────────────────────
  payload            JSONB NOT NULL DEFAULT '{}',

  -- ── Photos / media ───────────────────────────────────────────────────
  photo_urls         JSONB NOT NULL DEFAULT '[]',
  -- Array of { url, caption, alt } objects.
  -- Phase 1: submitters email photos; operators paste URLs here.
  -- Phase 2: direct upload via storage bucket.

  -- ── Workflow status ───────────────────────────────────────────────────
  status TEXT NOT NULL DEFAULT 'new'
    CONSTRAINT community_submissions_status_check
    CHECK (status IN (
      'new',              -- just submitted, not yet reviewed
      'needs-review',     -- operator has queued it for review
      'awaiting-info',    -- operator requested more info from submitter
      'in-progress',      -- operator is actively working on it
      'ready-for-ai',     -- all info present, queued for AI draft (future)
      'ai-draft-ready',   -- AI has generated a draft (future)
      'in-editing',       -- editor refining the content
      'approved',         -- approved and ready to publish
      'scheduled',        -- assigned to a specific issue
      'published',        -- live / printed
      'rejected',         -- not moving forward
      'archived'          -- completed, moved to archive
    )),

  -- ── AI assist (future) ────────────────────────────────────────────────
  ai_draft_status  TEXT NOT NULL DEFAULT 'none'
    CONSTRAINT ai_draft_status_check
    CHECK (ai_draft_status IN ('none', 'queued', 'generating', 'ready', 'failed')),
  ai_draft_content TEXT,   -- the AI-generated draft text
  ai_prompt_used   TEXT,   -- which prompt template was used

  -- ── Editorial ──────────────────────────────────────────────────────────
  editor_notes        TEXT,   -- internal editorial notes (never shown to submitter)
  internal_priority   TEXT NOT NULL DEFAULT 'normal'
    CONSTRAINT priority_check
    CHECK (internal_priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to         TEXT,   -- operator email/name handling this submission
  editorial_deadline  DATE,   -- deadline if tied to a print issue

  -- ── GHL integration (future) ──────────────────────────────────────────
  ghl_contact_id      TEXT,   -- set after GHL contact is created/found
  ghl_tagged_at       TIMESTAMPTZ,
  thank_you_sent_at   TIMESTAMPTZ,
  follow_up_sent_at   TIMESTAMPTZ,
  published_notice_sent_at TIMESTAMPTZ,

  -- ── Publishing ────────────────────────────────────────────────────────
  published_url   TEXT,
  published_at    TIMESTAMPTZ,

  -- ── Fraud / quality ───────────────────────────────────────────────────
  submitter_ip    INET,
  quality_flags   JSONB DEFAULT '[]',  -- future: AI-detected quality issues

  -- ── Timestamps ────────────────────────────────────────────────────────
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS cs_status_idx
  ON community_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS cs_type_status_idx
  ON community_submissions (submission_type, status);

CREATE INDEX IF NOT EXISTS cs_email_idx
  ON community_submissions (lower(submitter_email));

CREATE INDEX IF NOT EXISTS cs_publication_issue_idx
  ON community_submissions (target_publication, issue_year, issue_month);

CREATE INDEX IF NOT EXISTS cs_created_idx
  ON community_submissions (created_at DESC);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_community_submissions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_submissions_updated_at
  BEFORE UPDATE ON community_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_community_submissions_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE community_submissions IS
  'Unified community participation engine. '
  'All recurring community content workflows (nominations, spotlights, events, '
  'interviews, school news) flow through this single table. '
  'submission_type routes to the correct editorial workflow. '
  'payload JSONB stores type-specific question answers. '
  'Separate from reader_submissions (existing legacy system).';

COMMENT ON COLUMN community_submissions.payload IS
  'JSONB map of question_id → answer for type-specific form fields. '
  'Always includes all user-submitted answers beyond the core columns. '
  'Example: {"grade_subject": "5th Grade Math", "nomination_reason": "..."}';

COMMENT ON COLUMN community_submissions.ai_draft_content IS
  'AI-generated first-pass article/profile/caption. '
  'Never published without human editorial review and approval. '
  'Set when ai_draft_status = ready.';

COMMENT ON COLUMN community_submissions.quality_flags IS
  'Future: AI-detected issues with the submission. '
  'Array of { field, issue, severity } objects. '
  'Example: [{"field": "nomination_reason", "issue": "too short", "severity": "warning"}]';
