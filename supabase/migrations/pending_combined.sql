-- =====================================================================
-- COMBINED PENDING MIGRATIONS — paste into Supabase SQL Editor and Run.
-- =====================================================================
-- Bundles four idempotent migrations that need to land on production:
--   093 — ad pricing + rotation weight + rotation_group
--   117 — trending_items.archived_at
--   118 — page_views table + trending_paths_7d view
--   119 — ad renewal templates + log
--
-- Safe to re-run: every statement uses IF NOT EXISTS, ON CONFLICT,
-- or CREATE OR REPLACE — applying twice is a no-op.
--
-- After this runs successfully you can delete this file from the repo
-- (the individual 093/117/118/119 files are the source of truth).
-- =====================================================================


-- =====================================================================
-- 093 — Ad pricing + rotation
-- =====================================================================
ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS price_monthly    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_quarterly  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price_annual     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS rotation_weight  NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS rotation_group   TEXT;

CREATE INDEX IF NOT EXISTS idx_ad_placements_rotation
  ON ad_placements (rotation_group, is_active)
  WHERE rotation_group IS NOT NULL;

ALTER TABLE advertiser_packages
  ADD COLUMN IF NOT EXISTS rotation_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0;

UPDATE advertiser_packages SET rotation_weight = 4.0  WHERE tier_name = 'tier-4-won';
UPDATE advertiser_packages SET rotation_weight = 3.0  WHERE tier_name = 'tier-3-chosen';
UPDATE advertiser_packages SET rotation_weight = 2.0  WHERE tier_name = 'tier-2-featured';
UPDATE advertiser_packages SET rotation_weight = 1.0  WHERE tier_name = 'tier-1-found';


-- =====================================================================
-- 117 — trending_items archived_at
-- =====================================================================
ALTER TABLE trending_items
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_trending_items_archived
  ON trending_items (archived_at) WHERE archived_at IS NOT NULL;


-- =====================================================================
-- 118 — page_views table + trending_paths_7d view
-- =====================================================================
CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL PRIMARY KEY,
  path          TEXT NOT NULL,
  article_id    UUID NULL,
  session_hash  TEXT NOT NULL,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_recent
  ON page_views (viewed_at DESC, path);

CREATE INDEX IF NOT EXISTS idx_page_views_session_path
  ON page_views (session_hash, path, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_article
  ON page_views (article_id, viewed_at DESC) WHERE article_id IS NOT NULL;

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW trending_paths_7d
  WITH (security_invoker = true)
AS
SELECT
  path,
  COUNT(DISTINCT session_hash)::int AS unique_views,
  MAX(viewed_at)                    AS last_view
FROM page_views
WHERE viewed_at > NOW() - INTERVAL '7 days'
GROUP BY path
ORDER BY unique_views DESC, last_view DESC
LIMIT 20;


-- =====================================================================
-- 119 — Ad renewal reminders
-- =====================================================================
ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS advertiser_email TEXT,
  ADD COLUMN IF NOT EXISTS sales_rep_email  TEXT;

CREATE TABLE IF NOT EXISTS ad_renewal_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  days_before     INTEGER NOT NULL,
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_text       TEXT,
  is_live         BOOLEAN NOT NULL DEFAULT false,
  notify_sales    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_renewal_templates_window
  ON ad_renewal_templates (days_before) WHERE is_live = true;

CREATE TABLE IF NOT EXISTS ad_renewal_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id     UUID NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
  template_id      UUID NOT NULL REFERENCES ad_renewal_templates(id) ON DELETE CASCADE,
  ends_at_snapshot TIMESTAMPTZ NOT NULL,
  recipient_email  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'sent',
  error_message    TEXT,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ad_renewal_fire
  ON ad_renewal_log (placement_id, template_id, ends_at_snapshot);

INSERT INTO ad_renewal_templates (name, days_before, subject, body_html, body_text, notify_sales, is_live)
VALUES
  ('30-day renewal heads-up', 30,
    'Your ad with River Region Parents renews in 30 days',
    E'<p>Hi {{first_name}},</p>\n<p>Just a heads-up — your {{placement_label}} placement on riverregionparents.com is set to end on <strong>{{ends_at}}</strong>.</p>\n<p>To keep your message running without a gap, reply to this email or click below to renew at the same rate.</p>\n<p><a href="{{renewal_url}}">Renew my placement →</a></p>\n<p>Thanks for being a partner.<br>The River Region Parents team</p>',
    E'Hi {{first_name}},\n\nYour {{placement_label}} placement ends on {{ends_at}}. Reply to renew at the same rate.\n\nThanks,\nThe River Region Parents team',
    true, false),

  ('14-day reminder', 14,
    'Two weeks left on your River Region Parents placement',
    E'<p>Hi {{first_name}},</p>\n<p>Quick reminder — your <strong>{{placement_label}}</strong> placement ends on <strong>{{ends_at}}</strong>. That gives us about two weeks to lock in your renewal.</p>\n<p>If you''d like to refresh your creative or change packages, hit reply and we''ll set it up.</p>\n<p>Thanks,<br>The River Region Parents team</p>',
    E'Your {{placement_label}} placement ends {{ends_at}}. Reply to renew or refresh creative.',
    true, false),

  ('7-day reminder', 7,
    'Your River Region Parents ad expires in a week',
    E'<p>Hi {{first_name}},</p>\n<p>One week to go — your <strong>{{placement_label}}</strong> placement runs through <strong>{{ends_at}}</strong>.</p>\n<p>Renew today and we''ll keep your campaign uninterrupted.</p>\n<p>Reply to this email or click <a href="{{renewal_url}}">renew now</a>.</p>',
    E'One week left on your {{placement_label}} placement (ends {{ends_at}}). Reply to renew.',
    true, false),

  ('1-day reminder', 1,
    'Tomorrow is the last day of your River Region Parents placement',
    E'<p>Hi {{first_name}},</p>\n<p>Tomorrow — <strong>{{ends_at}}</strong> — is the final day your <strong>{{placement_label}}</strong> placement runs.</p>\n<p>If you''d like to extend without a gap, reply today.</p>',
    E'Tomorrow ({{ends_at}}) is your last day on {{placement_label}}. Reply to extend.',
    true, false),

  ('Day-after follow-up', -1,
    'Your River Region Parents ad ended — want to renew?',
    E'<p>Hi {{first_name}},</p>\n<p>Your <strong>{{placement_label}}</strong> placement ended yesterday. The spot is open again — if you''d like to pick it back up, reply and we''ll get you re-booked.</p>\n<p>If you''d like to change the creative or move to a different package, that''s easy too. Just let us know what works.</p>',
    E'Your {{placement_label}} placement ended yesterday. Reply to renew.',
    true, false)
ON CONFLICT DO NOTHING;

ALTER TABLE ad_renewal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_renewal_log       ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'ad_placements'
--      AND column_name IN ('rotation_group','price_monthly','advertiser_email');
--   SELECT count(*) FROM ad_renewal_templates;   -- should return 5
--   SELECT count(*) FROM page_views;             -- should return 0 (or more if tracking has fired)
-- =====================================================================
