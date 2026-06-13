-- ── Seed driver_welcome email template ──────────────────────────────────────
--
-- The POST /api/admin/circulation/drivers route already calls
-- renderTemplate({ key: 'driver_welcome' }) when a driver is added, but
-- the template itself was never seeded so renderTemplate returned null
-- and the email silently dropped. New drivers were created with no
-- onboarding email.
--
-- This migration seeds the template for every active market. ON CONFLICT
-- updates an existing row in case the user has been tweaking it — they
-- can still re-edit afterwards via /admin/circulation/emails.
--
-- Template variables (substituted by lib/circulation/email.ts):
--   {{first_name}}      — driver's first name
--   {{brand_name}}      — publication name ("River Region Parents Distribution")
--   {{login_url}}       — https://drivers.keepsharing.com/distribution/login
--   {{magic_link}}      — one-tap sign-in link (valid 1 hour)
--   {{driver_email}}    — the email address they'll sign in with
--   {{route_list}}      — comma-separated list of assigned routes
--   {{ops_email}}       — distribution manager's reply-to address

INSERT INTO circulation_email_templates (market, key, name, subject, body_html, trigger_type, active, description)
VALUES (
  'rrp',
  'driver_welcome',
  'Driver Welcome',
  'Welcome aboard, {{first_name}} — your {{brand_name}} portal is ready',
  $body$<p>Hi {{first_name}},</p>
<p>You have been added as a delivery driver for <strong>{{brand_name}}</strong>. Welcome to the team!</p>

<p style="margin:24px 0;text-align:center;">
  <a href="{{magic_link}}" style="display:inline-block;background:#1A5FA8;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">Sign in now (one tap)</a>
</p>

<p style="font-size:12px;color:#64748b;text-align:center;">
  This one-tap link expires in 1 hour. After that, go to
  <a href="{{login_url}}">{{login_url}}</a>, enter your email
  ({{driver_email}}), and click <em>&ldquo;Email me a link&rdquo;</em> for a fresh one.
</p>

<p><strong>Your route(s):</strong> {{route_list}}</p>

<h3 style="margin-top:28px;">What you can do in the portal</h3>
<ul style="line-height:1.7;">
  <li><strong>Check off stops:</strong> tap each stop as you drop the magazines &mdash; each one is time-stamped automatically.</li>
  <li><strong>Get directions:</strong> tap the blue Get Directions button on any stop to open it in Google Maps.</li>
  <li><strong>See your earnings:</strong> a running pay total sits at the bottom of the screen and ticks up with every stop.</li>
  <li><strong>Found a problem?</strong> tap the flag icon to report Closed / Wrong address / Wrong quantity / Add a stop &mdash; ops sees it instantly.</li>
  <li><strong>Per-publication quantities:</strong> the chips on each stop show how many copies of each magazine to leave.</li>
  <li><strong>Submit your invoice:</strong> when the run is done, tap Submit Invoice. Pay is calculated automatically based on stops completed.</li>
</ul>

<p style="margin-top:24px;">Questions? Just reply to this email and we will get back to you.</p>

<p style="margin-top:24px;">Thanks for joining the team,<br>The {{brand_name}} team</p>$body$,
  'auto',
  true,
  'Sent automatically when a driver is added via /admin/circulation/drivers. Includes a one-tap Supabase magic link valid for 1 hour.'
)
ON CONFLICT (market, key) DO UPDATE SET
  subject     = EXCLUDED.subject,
  body_html   = EXCLUDED.body_html,
  description = EXCLUDED.description,
  active      = EXCLUDED.active;

-- Mirror the same template into every other active circulation market
-- (rr50plus and any future ones) so a multi-pub deploy doesn't have to
-- re-run this for each market. ON CONFLICT keeps any per-market edits
-- the admin already made.
INSERT INTO circulation_email_templates (market, key, name, subject, body_html, trigger_type, active, description)
SELECT
  m.market_slug,
  src.key,
  src.name,
  src.subject,
  src.body_html,
  src.trigger_type,
  src.active,
  src.description
FROM circulation_email_templates src
CROSS JOIN (VALUES ('rr50plus'), ('boom'), ('mbp'), ('aop'), ('esp'), ('gpp')) AS m(market_slug)
WHERE src.market = 'rrp' AND src.key = 'driver_welcome'
  AND m.market_slug != 'rrp'
ON CONFLICT (market, key) DO NOTHING;
