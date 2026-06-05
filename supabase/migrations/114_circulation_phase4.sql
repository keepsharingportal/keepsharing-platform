-- Migration 114: Circulation Phase 4 additions
--
-- Brings the schema up to parity with the PHP v2 portal's operational
-- features (leftovers tracking, pay adjustments, archive log, publication
-- metadata) so the deliveries + financial flow can ship.
--
-- All additive — no destructive changes to migration 113's tables.

-- ── delivery_stops: leftover tracking + per-stop driver notes ────────────
-- leftovers      = TOTAL copies brought back from this stop unused
-- leftovers_json = per-publication breakdown {"rrp":5,"boom":3}
-- driver_note    = free-text note FROM THE DRIVER specific to this stop
--                  (different from the existing `notes` field which is
--                  the stop's permanent metadata)
ALTER TABLE circulation_delivery_stops
  ADD COLUMN IF NOT EXISTS leftovers      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE circulation_delivery_stops
  ADD COLUMN IF NOT EXISTS leftovers_json JSONB   NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE circulation_delivery_stops
  ADD COLUMN IF NOT EXISTS driver_note    TEXT    NULL;

-- ── deliveries: pay_final + adjustment_note ──────────────────────────────
-- pay_calculated stays as auto-calculated rate × completed stops.
-- pay_final is what we actually pay (admin can adjust at mark-paid time).
-- adjustment_note explains why if pay_final != pay_calculated.
ALTER TABLE circulation_deliveries
  ADD COLUMN IF NOT EXISTS pay_final       NUMERIC(10,2) NULL;
ALTER TABLE circulation_deliveries
  ADD COLUMN IF NOT EXISTS adjustment_note TEXT          NULL;

-- ── publications: website + issuu_url ────────────────────────────────────
-- Surfaced on the public maps and in driver "on our way" emails so stops
-- know where to point readers if asked.
ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS website   TEXT NULL;
ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS issuu_url TEXT NULL;

-- ── archive_log: monthly close-out tracking ──────────────────────────────
-- One row per (region, month) when admin "archives" the month — locks
-- further changes to that month's deliveries. The "low-performer report"
-- and the monthly_summary email both read from this to know what's done.
CREATE TABLE IF NOT EXISTS circulation_archive_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market      TEXT        NOT NULL DEFAULT 'rrp',
  month       TEXT        NOT NULL,           -- YYYY-MM
  archived_by UUID        NULL REFERENCES auth.users(id),
  note        TEXT        NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market, month)
);

CREATE INDEX IF NOT EXISTS idx_circulation_archive_log_market_month
  ON circulation_archive_log (market, month DESC);

-- ── seed default email templates ────────────────────────────────────────
-- Eight templates (driver_welcome, invoice_confirm, driver_paid,
-- driver_reminder, on_our_way, delivered, new_stop_welcome,
-- monthly_summary) that the Email Center in Phase B will surface for
-- editing. We seed them per region so each region can customize. The
-- INSERT is gated by NOT EXISTS so re-running the migration is safe.
INSERT INTO circulation_email_templates (market, key, name, subject, body_html, trigger_type, send_day, active, description)
SELECT * FROM (VALUES
  ('rrp', 'driver_welcome',         'Driver Welcome',            'Welcome to the KeepSharing Driver Portal',
    '<p>Hi {{first_name}},</p><p>You have been set up as a delivery driver for River Region Parents and River Region Boom.</p><p>Sign in: {{login_url}}</p><p>Your routes: {{route_list}}</p>',
    'auto', 0, TRUE, 'Sent when a driver account is created'),
  ('rrp', 'driver_invoice_confirm', 'Invoice Confirmation',      'Invoice received - {{month}} - ${{pay}}',
    '<p>Hi {{first_name}},</p><p>Your {{month}} invoice has been received.</p><p><strong>Stops:</strong> {{stops}}<br><strong>Payout:</strong> ${{pay}}</p>',
    'auto', 0, TRUE, 'Sent to driver when they submit their invoice'),
  ('rrp', 'driver_paid',            'Payment Processed',         'Payment processed - {{month}}',
    '<p>Hi {{first_name}},</p><p>Your payment of ${{pay}} for {{month}} has been processed.</p>',
    'auto', 0, TRUE, 'Sent when admin marks an invoice as paid'),
  ('rrp', 'driver_reminder',        'Monthly Invoice Reminder',  'Reminder: Submit your {{month}} invoice',
    '<p>Hi {{first_name}},</p><p>We have not received your {{month}} invoice yet. Please submit before the {{archive_day}}th.</p>',
    'scheduled', 17, TRUE, 'Sent to drivers who have not yet submitted'),
  ('rrp', 'stop_on_our_way',        'On Our Way to Stop',        'Your {{pub_name}} copies are on their way - {{month}}',
    '<p>Hi {{contact_first}},</p><p>Your {{month}} copies of {{pub_name}} will be delivered to {{stop_name}} soon.</p>',
    'scheduled', 1, TRUE, 'Sent to stop contacts before delivery'),
  ('rrp', 'stop_delivered',         'Just Delivered',            '{{pub_name}} delivered to {{stop_name}} - {{month}}',
    '<p>Hi {{contact_first}},</p><p>Your {{month}} copies of {{pub_name}} have been delivered to {{stop_name}}.</p>',
    'auto', 0, TRUE, 'Sent to stop contact when driver checks off that stop'),
  ('rrp', 'stop_welcome',           'New Stop Welcome',          'Welcome - thank you for carrying {{pub_name}}',
    '<p>Hi {{contact_first}},</p><p>Thank you for partnering with us to share {{pub_name}} at {{stop_name}}.</p>',
    'auto', 0, TRUE, 'Sent when admin adds a new stop with a contact email'),
  ('rrp', 'monthly_summary',        'Monthly Summary',           'Distribution summary - {{month}}',
    '<p>Here is your distribution summary for {{month}}.</p>{{summary_table}}',
    'scheduled', 1, TRUE, 'Monthly summary email to ops')
) AS seed (market, key, name, subject, body_html, trigger_type, send_day, active, description)
WHERE NOT EXISTS (
  SELECT 1 FROM circulation_email_templates t
  WHERE t.market = seed.market AND t.key = seed.key
);

-- ── circulation_settings: simple key/value store per region ─────────────
-- Mirrors the PHP `settings` table — ops_email, owner_email,
-- bookkeeper_email, invoice_handler ('admin'|'bookkeeper'), bundle_size,
-- archive_day, late_submit_days, etc. Phase C ships the editor UI.
CREATE TABLE IF NOT EXISTS circulation_settings (
  market TEXT NOT NULL DEFAULT 'rrp',
  key    TEXT NOT NULL,
  value  TEXT NULL,
  PRIMARY KEY (market, key)
);

-- Default RRP settings — INSERT IF NOT EXISTS so re-running the migration
-- doesn't wipe what an admin has edited.
INSERT INTO circulation_settings (market, key, value)
SELECT * FROM (VALUES
  ('rrp', 'ops_email',         ''),
  ('rrp', 'owner_email',       ''),
  ('rrp', 'bookkeeper_email',  ''),
  ('rrp', 'invoice_handler',   'admin'),
  ('rrp', 'bundle_size',       '25'),
  ('rrp', 'archive_day',       '20'),
  ('rrp', 'late_submit_days',  '10'),
  ('rrp', 'on_our_way_day',    '1'),
  ('rrp', 'reminder_day',      '17')
) AS d (market, key, value)
ON CONFLICT (market, key) DO NOTHING;
