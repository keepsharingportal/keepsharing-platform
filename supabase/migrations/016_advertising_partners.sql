-- Migration 016: Advertising Partners infrastructure
-- Run in Supabase SQL editor (Dashboard → SQL editor → New query)

-- ── advertiser_packages ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name       TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  monthly_price   NUMERIC NOT NULL,
  annual_price    NUMERIC NOT NULL,
  deliverables    JSONB NOT NULL DEFAULT '[]',
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE advertiser_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_active_packages" ON advertiser_packages
  FOR SELECT USING (is_active = true);
CREATE POLICY "service_all_packages" ON advertiser_packages
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_packages" ON advertiser_packages
  FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_accounts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name           TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  package_tier            TEXT REFERENCES advertiser_packages(tier_name),
  contact_name            TEXT,
  contact_email           TEXT,
  contact_phone           TEXT,
  ghl_contact_id          TEXT,
  listing_id              UUID REFERENCES guide_listings(id),
  landing_page_published  BOOLEAN NOT NULL DEFAULT false,
  contract_start_date     DATE,
  contract_end_date       DATE,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advertiser_accounts_slug          ON advertiser_accounts(slug);
CREATE INDEX idx_advertiser_accounts_package_tier  ON advertiser_accounts(package_tier);

ALTER TABLE advertiser_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_published_accounts" ON advertiser_accounts
  FOR SELECT USING (landing_page_published = true);
CREATE POLICY "service_all_accounts" ON advertiser_accounts
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_accounts" ON advertiser_accounts
  FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── lead_submissions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_submissions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name          TEXT,
  submitter_email         TEXT,
  submitter_phone         TEXT,
  message                 TEXT,
  source_page             TEXT,
  target_advertiser_id    UUID REFERENCES advertiser_accounts(id),
  target_tier_interest    TEXT,
  form_step_completed     INT NOT NULL DEFAULT 1,
  business_name           TEXT,
  business_size           TEXT,
  current_marketing_spend TEXT,
  biggest_challenge       TEXT,
  ghl_synced              BOOLEAN NOT NULL DEFAULT false,
  ghl_contact_id          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_submissions_target_advertiser    ON lead_submissions(target_advertiser_id);
CREATE INDEX idx_lead_submissions_target_tier_interest ON lead_submissions(target_tier_interest);
CREATE INDEX idx_lead_submissions_created_at           ON lead_submissions(created_at DESC);

ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_leads" ON lead_submissions
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_leads" ON lead_submissions
  FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_listing_photos ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_listing_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES guide_listings(id) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  alt_text      TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_cover      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advertiser_listing_photos_listing ON advertiser_listing_photos(listing_id, display_order);

ALTER TABLE advertiser_listing_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_photos" ON advertiser_listing_photos FOR SELECT USING (true);
CREATE POLICY "service_all_photos" ON advertiser_listing_photos
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_photos" ON advertiser_listing_photos
  FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── Add click tracking to guide_listings ─────────────────────────────────────

ALTER TABLE guide_listings ADD COLUMN IF NOT EXISTS click_count_phone   INT NOT NULL DEFAULT 0;
ALTER TABLE guide_listings ADD COLUMN IF NOT EXISTS click_count_website INT NOT NULL DEFAULT 0;

-- ── Seed advertiser_packages ──────────────────────────────────────────────────

INSERT INTO advertiser_packages (tier_name, display_name, monthly_price, annual_price, display_order, deliverables)
VALUES
(
  'tier-1-found', 'Featured Listing', 125, 1500, 1,
  '[
    "Featured Listing in our digital Family Resource Guide",
    "Listed across all relevant guides for your category, year-round",
    "1 photo + editorial blurb written by our team",
    "Send a Message form on your listing — leads come straight to your inbox",
    "Click-to-call & click-to-website tracking",
    "Quarterly mention in our Family Resource Guide newsletter",
    "River Region Parents Trusted Partner badge for your website"
  ]'
),
(
  'tier-2-featured', 'Featured', 400, 4800, 2,
  '[
    "Everything in Tier 1, PLUS:",
    "Quarter page print ad in 12 issues",
    "Premium placement in your section",
    "5-photo gallery on your listing",
    "Enhanced 150-word editorial blurb",
    "Local Family Marketing System Lite — lead capture form, email auto-response, monthly lead notifications",
    "Paid social distribution reaches 10,000+ targeted local moms monthly",
    "Monthly newsletter mention",
    "Quarterly performance report"
  ]'
),
(
  'tier-3-chosen', 'Chosen', 750, 9000, 3,
  '[
    "Everything in Tier 2, PLUS:",
    "Half page print ad in 12 issues",
    "10-photo gallery + 1 video",
    "Editorial profile twice per year (300 words)",
    "Local Family Marketing System — custom landing page, lead capture with email + SMS auto-response, missed call text-back",
    "Paid social distribution reaches 25,000+ targeted local moms monthly",
    "Monthly editorial mentions in newsletter",
    "Direct contact line to Jason or DeAnne",
    "Featured in 1-2 carousel posts per year"
  ]'
),
(
  'tier-4-won', 'Won', 1500, 18000, 4,
  '[
    "Everything in Tier 3, PLUS:",
    "Full page print ad in 12 issues with premium placement (rotating)",
    "Unlimited photo gallery + multiple videos",
    "Cover or feature consideration",
    "Section sponsorship in 1 guide per year",
    "Full Local Family Marketing System — custom branded landing page, GHL workflow with personalized email + SMS sequences, missed call text-back, Google Business Profile management",
    "Paid social distribution reaches 50,000+ targeted local moms monthly across Facebook, Instagram, and Reels",
    "Monthly newsletter feature with editorial copy",
    "Monthly strategy call with Jason",
    "Comprehensive monthly performance report"
  ]'
)
ON CONFLICT (tier_name) DO NOTHING;

-- ── Seed Dentistry for Children advertiser account ────────────────────────────

INSERT INTO advertiser_accounts (
  business_name, slug, package_tier,
  contact_name, contact_phone,
  listing_id, landing_page_published, notes
)
SELECT
  'Dentistry for Children PC',
  'dentistry-for-children',
  'tier-4-won',
  'Dentistry for Children PC',
  '334-277-6830',
  (SELECT id FROM guide_listings WHERE slug = 'dentistry-for-children' LIMIT 1),
  true,
  'Tier 4 demo account. Custom landing page at /partners/dentistry-for-children.'
WHERE NOT EXISTS (
  SELECT 1 FROM advertiser_accounts WHERE slug = 'dentistry-for-children'
);
