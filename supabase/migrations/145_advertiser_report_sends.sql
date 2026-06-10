-- ── Advertiser report send log ──────────────────────────────────────────────
--
-- One row per "Send report to advertiser" dispatch. Lets the admin see
-- last-sent timestamps on the advertiser detail panel, prevents accidental
-- double-sends, and gives renewal conversations a paper trail ("we sent
-- you a report on Apr 1 and May 1 — did you open them?").
--
-- We do NOT store the report payload here — the report at /r/<token> is
-- live data, not a snapshot. If we ever want snapshot history we'd add a
-- separate table for that.

CREATE TABLE IF NOT EXISTS advertiser_report_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by         UUID NULL,                        -- admin_users.id
  channel         TEXT NOT NULL DEFAULT 'ghl',      -- 'ghl' for now; sms/email later
  recipient_email TEXT NULL,                        -- snapshot of the email used
  report_url      TEXT NULL,                        -- the actual URL sent
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed'
  status_code     INT  NULL,                        -- HTTP status from webhook target
  error           TEXT NULL                         -- error message on failure
);

CREATE INDEX IF NOT EXISTS idx_advertiser_report_sends_advertiser
  ON advertiser_report_sends (advertiser_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_advertiser_report_sends_recent
  ON advertiser_report_sends (sent_at DESC);

ALTER TABLE advertiser_report_sends ENABLE ROW LEVEL SECURITY;
-- Service-role only. Admin reads + the send endpoint write via service role.

COMMENT ON TABLE advertiser_report_sends IS
  'One row per Send-Report dispatch. Drives the last-sent timestamp on the advertiser detail panel + the renewal-conversation paper trail.';
