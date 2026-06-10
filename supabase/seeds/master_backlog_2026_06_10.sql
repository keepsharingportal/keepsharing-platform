-- ── Master Backlog seed — deferred items as of 2026-06-10 ───────────────────
--
-- One-off seed: drop deferred work from recent sessions into admin_todos so
-- it shows up on /admin/today/master-backlog instead of being scattered
-- across commit messages + code comments.
--
-- Run once in the Supabase SQL editor. Safe to re-run — each row uses
-- ON CONFLICT (title) DO NOTHING so duplicates are skipped. (If the table
-- doesn't have a unique title index, the second run will just insert
-- duplicates — clean up manually if needed.)

INSERT INTO admin_todos (title, category, priority, notes) VALUES

-- ── Configuration / wiring (not code) ────────────────────────────────────
('Configure GHL workflow for advertiser report email', 'ghl', 'high',
 'Build an Inbound Webhook trigger workflow in GHL that accepts {advertiser_name, business_name, advertiser_email, report_url, report_label, sent_by_email, market} and sends an email to the advertiser with the report link. Paste the webhook URL into Vercel env var GHL_REPORT_SEND_WEBHOOK_URL. After that the "Send via GHL" button on /admin/advertisers/[id] is live.'),

('Confirm Supabase paid plan + backup retention', 'ops', 'high',
 'Verify project is on a paid Supabase tier with point-in-time recovery enabled. Free tier only retains 7 days of backups — not enough for a platform with real customer/advertiser data. Single highest-ROI security action remaining.'),

-- ── Security follow-ups ─────────────────────────────────────────────────
('Meta token encryption with pgcrypto', 'ops', 'low',
 'facebook_integrations.access_token is currently stored as plain text in a service-role-protected row. Supabase encrypts at rest, but any future super-admin with DB access can read it. Adds pgp_sym_encrypt/decrypt with a key from env. Low marginal risk since the token is read-only (ads_read only).'),

('MFA challenge enforcement at sign-in (aal2)', 'ops', 'medium',
 'Current MFA gate enforces enrollment, not the per-session challenge. A user with a verified TOTP factor still gets in via magic link without entering a code if their session is fresh. Forcing aal2 at sign-in requires a custom flow in the auth callback: after magic-link verification, redirect to a TOTP challenge page before reaching /admin. Worth doing once we have real outside users.'),

('Rotate service-role key every 6 months', 'ops', 'parked',
 'Calendar reminder, not code. Rotate SUPABASE_SERVICE_ROLE_KEY twice a year in Supabase dashboard, then update Vercel env var. Most recent rotation: never (initial value).'),

('Vercel WAF rate-limit rules on /api/*/track endpoints', 'ops', 'parked',
 'In-app rate limiter (migration 139) caps at 60-120/min/IP and silently 204s over-limit. If we ever see sustained abuse spikes, layer Vercel WAF rules in the dashboard for cheaper protection at the edge. Not urgent.'),

('Backup codes for 2FA recovery', 'ops', 'medium',
 'Supabase MFA doesn''t ship native backup codes. If a user loses their phone, the super-admin "Reset 2FA" button is the only recovery path. Adding 5-10 single-use backup codes that the user prints/saves at enrollment time would let them self-recover. Cloud-backed authenticators (Authy, 1Password) already solve this for most users, so this is a nice-to-have not a must.'),

-- ── Reporting / analytics enhancements ──────────────────────────────────
('Per-day clicks for short links', 'general', 'medium',
 'short_links.click_count is cumulative since the link was minted. The advertiser report shows lifetime totals only. Add short_link_clicks_daily (link_id, day, clicks) populated by the /go/* redirect, so date-range slicing on the advertiser report actually reflects the selected window. Until this lands, the "Short links" table on /r/[token] shows lifetime numbers with a footnote.'),

('Per-day on-site ad impressions/clicks', 'general', 'medium',
 'Same shape as the short-links story. ad_placements.impression_count + click_count are cumulative; we have raw rows in ad_events that could be aggregated daily. Add ad_events_daily for fast date-range slicing in the advertiser report. Until then, the report shows lifetime counts (matches what /admin/intelligence already shows).'),

('Page views daily rollup table', 'general', 'low',
 'page_views is the raw event log. At current volume (~50k visits/month) the in-memory aggregation in /admin/analytics/pages is fine. When the table crosses ~5-10GB, swap in a page_views_daily rollup populated by a nightly cron. Cheap insurance for scale.'),

('Listing taps report at /admin/analytics/listings', 'general', 'medium',
 'listing_contact_events captures every phone tap / mailto / website click on a guide listing. Build a top-listings leaderboard with date range — "which listings drive the most reader contact" is a great editorial + sales signal. Data is already flowing; just needs the page.'),

('Ad placement performance report at /admin/analytics/ads', 'general', 'medium',
 'Existing /admin/intelligence shows ad totals but it''s summary-level. Build a per-placement leaderboard with CTR sorting + date range filter. ad_events has the raw data; ad_placements has the metadata. Should mirror the Top Articles pattern.'),

('Referrer + UTM breakdown on analytics pages', 'general', 'low',
 'page_views already captures referrer_host + utm_source/medium/campaign. Add a "where did they come from" pivot to the Top Pages report. Plausible covers this for marketing — worth duplicating only if we need it joined with our internal entities (advertiser, school, etc).'),

-- ── Product concepts ────────────────────────────────────────────────────
('Sponsor "Brought to you by" card in school-bit viewer', 'ads', 'parked',
 'User wants a rotating ad slot in the school bits viewer, but framed as a "Brought to you by ..." gratitude card rather than a CTA-heavy ad. Hold until we''ve seen real engagement numbers on bits + can design the unit deliberately. Tracking the data we''d need (view_count, click_count on bits, per-school engagement) already lands as of migration 136.'),

('Editor-specific Today dashboard at /admin/today/editor', 'general', 'low',
 'Editors currently redirect to /admin/articles on /admin/today access. If we onboard more content-only staff, a real Editor dashboard ("articles on your plate today, school bits awaiting approval, events needing edits") would be worth building. Probably not urgent — most editors are happy starting from their queue.'),

('Phone-tap conversion ratio on advertiser report', 'general', 'low',
 'We track phone taps in listing_contact_events but don''t show "tap → call connected" or "tap → call duration" — those would need Twilio number masking or a tracking phone number per advertiser. Big build; only worth it if advertisers start asking for it.'),

('Per-month rollup for advertiser report data', 'general', 'parked',
 'When advertiser_report_sends or listing_contact_events get into the millions of rows, in-memory aggregation in loadAdvertiserReport will slow down. Add a monthly rollup table populated by cron + serve the report from it. Not urgent — RRP-sized.'),

-- ── Site polish / minor ────────────────────────────────────────────────
('Google Maps API + better geocoding', 'general', 'parked',
 'Already in memory file project_google_maps_deferred.md. Add Google Cloud + Maps API after circulation port is finalized.'),

('Audit log retention / archive', 'ops', 'low',
 'admin_audit_log is append-only and unbounded. At ~1k actions/day each row is ~1KB so ~365MB/year. Fine for now. When the table crosses ~10GB, add a partition-by-month or archive-to-cold-storage job.')

ON CONFLICT DO NOTHING;
