-- Migration 121: admin_todos (master backlog for super-admin)
--
-- A simple, batchable to-do list living under /admin/today. Replaces
-- the scattered "I'll do this later" mental notes with one queryable
-- table that the super-admin can mark off as work lands.
--
-- Structure:
--   - id              UUID
--   - parent_id       optional — sub-todos roll up under a parent
--   - title           one-line action
--   - category        grouping key (see SEED below for the canonical set)
--   - priority        'launch-blocker' | 'high' | 'medium' | 'low' | 'parked'
--   - status          'open' | 'in-progress' | 'done'
--   - notes           freeform context — quote from chat, env var name, etc.
--   - display_order   sort within a category
--   - completed_at    set when status flips to 'done'
--   - created_at      timestamp
--
-- Seed below pulls every "we'll do this later / phase 2 / migration to
-- apply / next-step" item from our build conversation so the editor
-- can batch-attack it without context-switching back to chat.

CREATE TABLE IF NOT EXISTS admin_todos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     UUID REFERENCES admin_todos(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  priority      TEXT NOT NULL DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'open',
  notes         TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_todos_status   ON admin_todos (status, category, display_order);
CREATE INDEX IF NOT EXISTS idx_admin_todos_parent   ON admin_todos (parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE admin_todos ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; admin reads/writes through service-role API.

-- ── SEED — only inserts if the table is empty (re-run safe) ──────────────
DO $$
DECLARE
  v_root_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM admin_todos LIMIT 1) THEN
    RETURN;
  END IF;

  -- =================================================================
  -- LAUNCH BLOCKERS — must land before/at the public site flip
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Apply pending Supabase migrations (093, 117, 118, 119, 120, 121)',
     'launch', 'launch-blocker',
     'Run supabase/migrations/pending_combined.sql (now also includes 121 admin_todos itself) in Supabase SQL Editor. Verify with the queries at the bottom of that file.',
     10),
    ('Pause / delete YMCA + Pediatric Dentistry seed ads in /admin/ads',
     'launch', 'launch-blocker',
     'Demo ad rows from migration 037. Toggle OFF or Delete so they stop rendering on the live homepage.',
     20),
    ('Verify RESEND_API_KEY is set in Vercel + domain verified at resend.com',
     'launch', 'launch-blocker',
     'Required for: submission notifications, ad renewal cron, ad inquiry capture, GHL fallback emails. Without it, every email-fire silently no-ops.',
     30),
    ('Confirm GHL_PIT_RRP and GHL_LOCATION_ID_RRP env vars are in Vercel',
     'launch', 'launch-blocker',
     'Both copied from .env.local last session. Newsletter signups silently fail to sync to GHL without these.',
     40),
    ('Final maintenance-mode walk-through before site flip',
     'launch', 'high',
     'Site Offline banner currently visible. Toggle off when ready to launch publicly.',
     50);

  -- =================================================================
  -- ADS & SPONSORS
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order)
  VALUES ('Build /admin/ads/inquiries queue page',
          'ads', 'high',
          'Lists ad_inquiries rows with status filter (new/contacted/converted/lost). Mark-as-converted should auto-create an ad_placement pre-filled from the inquiry.',
          10)
  RETURNING id INTO v_root_id;
  INSERT INTO admin_todos (parent_id, title, category, priority, notes, display_order) VALUES
    (v_root_id, 'List view + filter chips (new/contacted/converted/lost)', 'ads', 'high', null, 10),
    (v_root_id, 'Click-through to detail with notes field', 'ads', 'medium', null, 20),
    (v_root_id, 'Mark-as-converted button → create ad_placement', 'ads', 'medium', null, 30),
    (v_root_id, 'Red badge in sidebar when status=new count > 0', 'ads', 'medium', 'Reuse sidebar-counts endpoint pattern.', 40);

  INSERT INTO admin_todos (title, category, priority, notes, display_order)
  VALUES ('Wire ad inquiry → GHL workflow (custom values + trigger links)',
          'ads', 'high',
          'When ad_inquiry lands, POST to a GHL workflow with placement_type, business_name, contact_name, email. Custom values feed the nurture sequence. Trigger link takes them toward the eventual checkout.',
          20)
  RETURNING id INTO v_root_id;
  INSERT INTO admin_todos (parent_id, title, category, priority, notes, display_order) VALUES
    (v_root_id, 'Decide which GHL workflow ID receives the webhook', 'ghl', 'high', null, 10),
    (v_root_id, 'Add GHL_AD_INQUIRY_WORKFLOW_ID env var', 'ghl', 'high', null, 20),
    (v_root_id, 'Extend /api/ad-inquiry to POST to GHL after Resend email', 'ghl', 'high', null, 30),
    (v_root_id, 'Add custom values: placement_type, source_url, slot_label', 'ghl', 'medium', null, 40),
    (v_root_id, 'Build trigger link landing page (Phase 1 = pricing PDF; Phase 2 = checkout)', 'ghl', 'medium', null, 50);

  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Migrate templated article layouts to inlineAds[] multi-slot',
     'ads', 'medium',
     'Teacher of the Month, Contributor, School Bits Roundup layouts only get the FIRST allocated ad. Plumb the full inlineAds array so they support 1-3 positions like the default ArticleBody.',
     30),
    ('Migrate existing calendar_featured_event bookings to top/bottom banner types',
     'ads', 'medium',
     'Legacy slot kept as fallback in calendar query. Re-tag bookings via /admin/ads edit → change Placement Type → Save.',
     40),
    ('Draw layout diagrams for School Bits / Calendar / Newsletter / Site-wide',
     'ads', 'low',
     'PageLayoutPreview only maps homepage/articles/guides today. Other surfaces show "layout not mapped" fallback.',
     50);

  -- =================================================================
  -- ADVERTISERS
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Decide active/inactive advertiser semantics: sales stage vs "has live ad_placement"',
     'advertisers', 'medium',
     'Currently filters by stage (Closed Won / Renewed / Verbal = active). Alternative: any active ad_placement row. Pick one and align UI labels.',
     10),
    ('Add /admin/advertisers/[id] "Active rotation pools" tile',
     'advertisers', 'low',
     'Per-advertiser view of which rotation_groups they''re in across the site so the sales rep sees "you''re on inline + sidebar" at a glance.',
     20);

  -- =================================================================
  -- AD RENEWALS
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order)
  VALUES ('Tune + activate the 5 draft renewal email templates',
          'ads', 'medium',
          'All ship is_live=false. Editor visits /admin/ads/renewals, rewrites copy per template, flips Live when ready. Cron only fires Live templates.',
          60)
  RETURNING id INTO v_root_id;
  INSERT INTO admin_todos (parent_id, title, category, priority, notes, display_order) VALUES
    (v_root_id, '30-day reminder — review subject + body', 'ads', 'medium', null, 10),
    (v_root_id, '14-day reminder — review', 'ads', 'medium', null, 20),
    (v_root_id, '7-day reminder — review', 'ads', 'medium', null, 30),
    (v_root_id, '1-day reminder — review', 'ads', 'medium', null, 40),
    (v_root_id, 'Day-after follow-up — review', 'ads', 'medium', null, 50);

  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Populate advertiser_email on each ad_placement so cron knows who to email',
     'ads', 'medium',
     'Renewal cron skips rows without an advertiser_email or linked advertiser_account.email. Sweep through /admin/ads and fill them in.',
     70);

  -- =================================================================
  -- PHASE 2 — Stripe self-serve
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order)
  VALUES ('Phase 2: replace SlotInquiryModal email-fire with Stripe checkout',
          'phase-2', 'medium',
          'Single replacement in SlotInquiryModal upgrades every "Claim this spot" CTA across the site at once.',
          10)
  RETURNING id INTO v_root_id;
  INSERT INTO admin_todos (parent_id, title, category, priority, notes, display_order) VALUES
    (v_root_id, 'Map each placement_type → Stripe Price object', 'phase-2', 'medium', null, 10),
    (v_root_id, 'Build /api/ads/checkout route (Stripe Checkout session)', 'phase-2', 'medium', null, 20),
    (v_root_id, 'Build /advertise/success page that creates the ad_placement on webhook', 'phase-2', 'medium', null, 30),
    (v_root_id, 'Auto-set rotation_weight per tier (full=4, half=3, qtr=1) on checkout', 'phase-2', 'medium', null, 40),
    (v_root_id, 'Email confirmation + GHL contact upgrade to "customer" on success', 'phase-2', 'medium', null, 50);

  -- =================================================================
  -- BRAIN GAMES
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Verify daily games-refill cron is running (check Vercel cron logs after 5am ET)',
     'games', 'high',
     'Once a refill or two completes, supply should self-heal to ≥ 10 days across every (game × tier) cell.',
     10),
    ('Flip GAMES_REFILL_AUTO_APPROVE=true once confident in Claude output quality',
     'games', 'medium',
     'Currently items land in review queue. Auto-approve sends straight to live pool. Recommend reviewing 50+ items first.',
     20),
    ('Tune GAMES_REFILL_DAILY_BUDGET if cost spikes',
     'games', 'low',
     'Default $20/day. Conservative. Watch the first week''s real Anthropic invoice and adjust.',
     30);

  -- =================================================================
  -- GHL INTEGRATION
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Add GHL custom values + tags for community submission types',
     'ghl', 'medium',
     'When someone submits Play Ball / Teacher of the Month / Grands etc., tag the GHL contact with the submission_type so the magazine''s nurture sequence knows what they engaged with.',
     10),
    ('Build GHL workflow trigger from /api/newsletter/subscribe with first_name custom value',
     'ghl', 'medium',
     'Form now collects first_name. GHL personalization tokens fire correctly once the workflow is configured.',
     20);

  -- =================================================================
  -- FAMILY HUB (mentioned in passing as future direction)
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Explore Family Hub membership concept (mentioned, not yet specced)',
     'family-hub', 'parked',
     'Editor mentioned "new amazing Family Hub kind of thing" as an aspirational frame. Park for now; spec when ready.',
     10);

  -- =================================================================
  -- MIGRATIONS / OPS
  -- =================================================================
  INSERT INTO admin_todos (title, category, priority, notes, display_order) VALUES
    ('Switch Supabase migration workflow to supabase CLI db push',
     'ops', 'low',
     'Currently using pending_combined.sql copy-paste. Once supabase CLI is set up locally, db push handles delta application automatically.',
     10),
    ('Delete supabase/migrations/pending_combined.sql after 121 is applied',
     'ops', 'low',
     'Individual 093/117/118/119/120/121 files remain the source of truth.',
     20);

END $$;
