-- ── Advertiser report goals ─────────────────────────────────────────────────
--
-- Lets the admin set a monthly target per advertiser ("Pam wants 30
-- inquiries this month") and the public report renders progress against
-- it. Powers the renewal conversation: "you committed to 30 leads, we
-- delivered 47 — that's why you're renewing."
--
-- One active goal per advertiser per metric per month (enforced via the
-- partial unique index below). Multiple metrics can have goals at once
-- (e.g. phone taps AND form inquiries).
--
-- The metric column is loosely typed text so we can add new metrics
-- without a migration. Initial allowed values:
--   'phone_taps' | 'website_clicks' | 'email_opens' | 'form_inquiries'
--   | 'short_link_clicks' | 'facebook_results' | 'total_engagement'

CREATE TABLE IF NOT EXISTS advertiser_report_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  metric        TEXT NOT NULL,
  target_value  INT  NOT NULL,
  /** YYYY-MM-01 — first day of the goal period. */
  period_start  DATE NOT NULL,
  /** Last day of the goal period (usually month end). */
  period_end    DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID NULL                          -- admin_users.id
);

-- One active goal per (advertiser, metric, period). Overlapping periods
-- are allowed (e.g. a Q1 goal AND a January goal) so an advertiser can
-- have monthly + quarterly targets simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_goal_per_period
  ON advertiser_report_goals (advertiser_id, metric, period_start, period_end)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_advertiser_report_goals_lookup
  ON advertiser_report_goals (advertiser_id, is_active, period_start, period_end);

ALTER TABLE advertiser_report_goals ENABLE ROW LEVEL SECURITY;
-- Service-role only. The public report reads via service-role, admin
-- mutations go through admin routes.

COMMENT ON TABLE advertiser_report_goals IS
  'Per-advertiser metric targets that drive the goal-tracking progress bars on the advertiser report.';
