-- ── Advertiser report token expiry ─────────────────────────────────────────
--
-- Migration 144 minted stable per-advertiser report tokens (~256-bit, base64url)
-- with no expiry: a leaked token retained access indefinitely unless an admin
-- manually regenerated it. That's the wrong default for a sales asset that
-- gets emailed, forwarded, screenshotted, and pasted into Slack channels.
--
-- This adds:
--   expires_at   — when the token stops working. Default 90 days from
--                  creation. NULL = no expiry (super-admin override for
--                  long-term partners; keep rare).
--   The public report page checks this; expired tokens render a clear
--   "ask for a new link" page rather than silently 404'ing.

ALTER TABLE advertiser_report_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

-- Backfill: existing rows expire 90 days from now so we don't break working
-- links immediately, but new active tokens won't outlast the window.
UPDATE advertiser_report_tokens
   SET expires_at = NOW() + INTERVAL '90 days'
 WHERE expires_at IS NULL
   AND is_active   = TRUE;

CREATE INDEX IF NOT EXISTS idx_advertiser_report_tokens_expiry
  ON advertiser_report_tokens (expires_at)
  WHERE is_active = TRUE AND expires_at IS NOT NULL;

COMMENT ON COLUMN advertiser_report_tokens.expires_at IS
  'When this token stops working. Default 90 days from mint. NULL = no expiry (use sparingly).';
