-- Migration 079: Newsletter issue audit log
-- One row per outbound newsletter send. Captures the subject, scheduled time,
-- the list/tag it was sent to, the rendered HTML at send time, and GHL's
-- response. Lets us see what went out, when, and to whom from /admin.

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date      DATE NOT NULL,                      -- The Thursday this newsletter is "about"
  market          TEXT NOT NULL DEFAULT 'rrp',
  subject         TEXT NOT NULL,
  list_tag        TEXT,                                -- The GHL list/tag the workflow sends to
  scheduled_for   TIMESTAMPTZ,                         -- null = send immediately
  status          TEXT NOT NULL DEFAULT 'pending',     -- pending | queued | sent | failed
  ghl_response    JSONB,                               -- whatever GHL's webhook returns
  error_message   TEXT,
  rendered_html   TEXT NOT NULL,                       -- frozen at send time
  picks_count     INT DEFAULT 0,
  sent_by         TEXT,                                -- operator email
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_recent
  ON newsletter_issues (market, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_by_date
  ON newsletter_issues (market, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status
  ON newsletter_issues (status, scheduled_for)
  WHERE status IN ('pending', 'queued');
