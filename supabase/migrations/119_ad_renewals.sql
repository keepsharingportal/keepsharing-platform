-- Migration 119: ad renewal reminder system
--
-- Two tables drive the expiry-reminder pipeline:
--
--   ad_renewal_templates — editable email templates keyed by
--     "days_before_expiry" (positive number = before expiry, 0 = day-of,
--     negative = follow-up after the ad ended). Each template carries
--     subject + HTML body + an is_live flag so editors can write drafts
--     without the cron firing them prematurely. Until is_live=true the
--     cron skips that template entirely — by design, so the editor can
--     "fine-tune before going live."
--
--   ad_renewal_log — one row per email the cron would-have-sent or did
--     send. status='sent' (delivered), 'queued' (template draft → email
--     held, editor can hand-send), 'skipped' (no advertiser email on the
--     placement, etc). Prevents the cron from re-firing the same window
--     twice for the same ad.
--
-- ad_placements already carries starts_at + ends_at from migration 075,
-- so we don't need to add contract fields here. The optional
-- advertiser_email / sales_rep_email columns below let the cron route
-- the email even when the placement isn't tied to a full
-- advertiser_account row (useful for one-off bookings).

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS advertiser_email TEXT,
  ADD COLUMN IF NOT EXISTS sales_rep_email  TEXT;

CREATE TABLE IF NOT EXISTS ad_renewal_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  -- Days before ends_at to fire. 0 = day-of. Negative = follow-up
  -- AFTER the ad has ended (e.g. -1 = "yesterday your ad ended").
  days_before     INTEGER NOT NULL,
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  body_text       TEXT,
  -- Editor approves a template by flipping this true. While false the
  -- cron skips it entirely — drafts stay draft until you say go.
  is_live         BOOLEAN NOT NULL DEFAULT false,
  -- When true, route to the sales rep too (CC). For "this is about to
  -- expire — chase them" reminders this is the difference between a
  -- quiet automated touch and a hand-off to the human.
  notify_sales    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_renewal_templates_window
  ON ad_renewal_templates (days_before) WHERE is_live = true;

CREATE TABLE IF NOT EXISTS ad_renewal_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id    UUID NOT NULL REFERENCES ad_placements(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES ad_renewal_templates(id) ON DELETE CASCADE,
  -- Snapshot of the ends_at the cron saw — defends against rebooking
  -- mid-window (editor extends the ad → cron shouldn't re-fire the same
  -- 30-day reminder for the new ends_at because we already fired one
  -- for the old).
  ends_at_snapshot TIMESTAMPTZ NOT NULL,
  recipient_email TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'sent',  -- sent | queued | skipped | failed
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: one row per (placement, template, ends_at_snapshot).
-- Re-runs in the same day get a unique-violation and harmlessly skip.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ad_renewal_fire
  ON ad_renewal_log (placement_id, template_id, ends_at_snapshot);

-- ── Seeds — drafts (is_live=false) so editor can fine-tune ──────────────
-- All templates ship disabled. Editor visits /admin/ads/renewals,
-- reviews each, edits the subject/body, then flips Live. Cron only
-- fires Live templates.
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
-- Service role bypasses RLS; admin & cron access via service role only.
