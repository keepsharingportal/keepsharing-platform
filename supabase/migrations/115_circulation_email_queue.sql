-- Migration 115: Circulation email queue
--
-- Phase B of the circulation port — the Email Center needs a queue so:
--   1. Resend rate limits don't bite us (we drain N per minute)
--   2. Cron-fired scheduled templates (reminders, on-our-way) can stage
--      every recipient in a transaction, then send later
--   3. Failures are retryable with attempt counters, not silently dropped
--
-- Status lifecycle: pending → sending → sent | failed
-- Failed rows keep their error message so the admin can see what went wrong.

CREATE TABLE IF NOT EXISTS circulation_email_queue (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market            TEXT        NOT NULL DEFAULT 'rrp',
  -- Which template was rendered to produce this row (for audit + retry).
  -- Nullable for one-off admin "test email" sends.
  template_key      TEXT        NULL,
  -- The actual recipient (one row per recipient — we don't bcc).
  to_email          TEXT        NOT NULL,
  to_name           TEXT        NULL,
  subject           TEXT        NOT NULL,
  body_html         TEXT        NOT NULL,
  -- Optional reply-to override (default = ops_email from settings).
  reply_to          TEXT        NULL,
  -- Optional related entity ids — useful for "show emails sent about this
  -- delivery" filtering later.
  related_delivery_id UUID      NULL REFERENCES circulation_deliveries(id) ON DELETE SET NULL,
  related_stop_id     UUID      NULL REFERENCES circulation_stops(id)      ON DELETE SET NULL,
  related_driver_id   UUID      NULL REFERENCES circulation_drivers(user_id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'pending', -- pending|sending|sent|failed
  attempts          INTEGER     NOT NULL DEFAULT 0,
  last_error        TEXT        NULL,
  last_attempted_at TIMESTAMPTZ NULL,
  sent_at           TIMESTAMPTZ NULL,
  -- Provider response id (Resend) — handy for tracing in logs.
  provider_id       TEXT        NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_email_queue_pending
  ON circulation_email_queue (market, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_circulation_email_queue_recent
  ON circulation_email_queue (market, status, created_at DESC);
