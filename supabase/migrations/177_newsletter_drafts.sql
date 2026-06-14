-- ── newsletter_drafts — snapshot of an assembled newsletter ─────────────────
--
-- The Content Deployment Newsletter tab lets editors build a full issue
-- (lineup + section assignment + subject + HTML/text/mobile export) but
-- previously had no way to PRESERVE one. Close the browser tab, lose the
-- subject line you'd been refining. Reload after lunch and the queue
-- shows a different mix because freshness/queue dynamics changed.
--
-- This table snapshots a draft at a moment in time. The editor saves it,
-- works on it across sessions, marks it sent once the manual ESP push
-- completes, and audit-trails which submissions went out together.
--
-- When the GHL v3 newsletter API ships, this table becomes the payload
-- queue — a row enters status='draft', the operator approves it to
-- status='scheduled', a worker reads scheduled rows and POSTs the
-- html/subject to GHL. We design the schema for that flow today so we
-- don't need a migration when GHL v3 lands.

CREATE TABLE IF NOT EXISTS newsletter_drafts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Brand this draft is for (rrp, rr50plus, mbp, etc.). Drives the
  -- visual + audience scope.
  publication     TEXT         NOT NULL DEFAULT 'rrp',

  -- Issue label the editor titled it (e.g. "Week of Jun 16" or
  -- "RRP March Family Roundup"). Free-form.
  issue_label     TEXT         NOT NULL,

  -- Subject the editor picked from the AI suggestions (or wrote
  -- themselves). Null while still drafting.
  subject_line    TEXT         NULL,

  -- The assembled HTML body (output of buildHTML helper). The editor
  -- pastes this into their ESP today; the GHL push job will read it
  -- from here tomorrow.
  body_html       TEXT         NULL,
  body_plain_text TEXT         NULL,
  body_mobile     TEXT         NULL,

  -- The community_submissions ids included in this issue, ordered.
  -- Editorial integrity trail — we can always answer "which stories
  -- went out in the Jun 16 issue?"
  item_ids        UUID[]       NOT NULL DEFAULT '{}',

  -- Workflow.
  -- draft     — editor is still building
  -- scheduled — approved for send, waiting on the push worker
  -- sent      — push completed (or operator marked it sent manually)
  -- archived  — superseded, retained for audit
  status          TEXT         NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'scheduled', 'sent', 'archived')),

  -- When the editor wants it sent (nullable; defaults to 'whenever
  -- the worker next runs'). The GHL push job will respect this.
  send_at         TIMESTAMPTZ  NULL,
  sent_at         TIMESTAMPTZ  NULL,

  -- GHL handoff metadata — populated by the push worker. Null until
  -- a real send fires.
  ghl_email_id    TEXT         NULL,
  ghl_response    JSONB        NULL,

  -- Audit
  created_by      UUID         NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT         NULL,

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_pub_status
  ON newsletter_drafts (publication, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_drafts_scheduled
  ON newsletter_drafts (status, send_at)
  WHERE status = 'scheduled';

ALTER TABLE newsletter_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_drafts_service ON newsletter_drafts;
CREATE POLICY newsletter_drafts_service ON newsletter_drafts FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS newsletter_drafts_admin ON newsletter_drafts;
CREATE POLICY newsletter_drafts_admin   ON newsletter_drafts FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- updated_at touch
CREATE OR REPLACE FUNCTION newsletter_drafts_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_drafts_touch_updated_at_trg ON newsletter_drafts;
CREATE TRIGGER newsletter_drafts_touch_updated_at_trg
BEFORE UPDATE ON newsletter_drafts
FOR EACH ROW EXECUTE FUNCTION newsletter_drafts_touch_updated_at();
