-- Migration 028: Guide Architecture for Family Resource Guide
-- Run in Supabase SQL editor after migration 026.

-- ── Add fields to advertiser_accounts ────────────────────────────────────────
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS office_phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS card_hook TEXT,
  ADD COLUMN IF NOT EXISTS detail_lead TEXT,
  ADD COLUMN IF NOT EXISTS hero_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS city_state_zip TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── Guide types reference ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  short_description TEXT,
  hub_intro_paragraph TEXT,
  hero_image_url TEXT,
  primary_filter_field TEXT,
  publishes_annually BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO guide_types (slug, display_name, short_description, hub_intro_paragraph, display_order, primary_filter_field) VALUES
  ('newcomer',       'Newcomer Guide',        'For families new to the River Region',        'Everything a family new to the River Region needs to feel at home faster. Schools, doctors, neighborhoods, and the local rhythms only insiders know.', 1, NULL),
  ('private-school', 'Private School Guide',   'Private and parochial schools serving K-12',  'A complete picture of private school options across the River Region. Tuition, mission, leadership, and what makes each campus distinct.', 2, 'category'),
  ('summer-camp',    'Summer Camp Guide',      'Day camps, overnight camps, specialty camps',  'When school lets out, the River Region opens up. Day camps, overnight adventures, specialty programs — your complete summer planning resource.', 3, 'category'),
  ('childcare',      'Childcare Guide',        'Childcare centers, preschools, in-home care',  'Finding childcare you trust takes time. We have done the research so you can compare side by side — hours, ratios, philosophies, and what each center does best.', 4, NULL),
  ('healthy-kids',   'Healthy Kids Guide',     'Pediatricians, dentists, specialists',         'Pediatric care that fits your family. From first visits to specialty referrals — providers across the River Region serving children from birth through teens.', 5, 'category'),
  ('summer-fun',     'Summer Fun Guide',       'Activities and events for summer break',       'Beat the boredom. Summer activities across the River Region for every interest — arts, sports, science, outdoor adventures, and slow afternoons too.', 6, 'category'),
  ('birthday-party', 'Birthday Party Guide',   'Venues and services for birthday parties',     'From toddler bashes to teen celebrations — venues, entertainers, cake artists, and party rentals that make hosting easier and the day unforgettable.', 7, 'category'),
  ('afterschool',    'After-School Guide',     'After-school programs and activities',         'After the bell rings — programs and activities that fill the afternoons with learning, movement, art, and friendship.', 8, 'category'),
  ('special-needs',  'Special Needs Guide',    'Resources for special needs families',         'A trusted directory of resources, providers, and organizations supporting families navigating special needs across the River Region.', 9, 'category')
ON CONFLICT (slug) DO NOTHING;

-- ── Guide listings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  guide_type_slug TEXT REFERENCES guide_types(slug),
  publication_id UUID,
  listing_year INT,
  listing_tier TEXT DEFAULT 'free',
  category TEXT,
  guide_data JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  source_csv_filename TEXT,
  source_csv_row_number INT,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_account_id, guide_type_slug, listing_year)
);

CREATE INDEX IF NOT EXISTS idx_guide_listings_guide      ON guide_listings(guide_type_slug, is_published);
CREATE INDEX IF NOT EXISTS idx_guide_listings_advertiser ON guide_listings(advertiser_account_id);
CREATE INDEX IF NOT EXISTS idx_guide_listings_category   ON guide_listings(guide_type_slug, category);

-- ── Listing flexible sections ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  headline TEXT,
  subheadline TEXT,
  body_content TEXT,
  bullet_points JSONB DEFAULT '[]',
  items JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',
  offer_text TEXT,
  offer_expiration TIMESTAMPTZ,
  offer_cta_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_sections_advertiser ON listing_sections(advertiser_account_id, is_active);

-- ── Calendar events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  start_date DATE,
  end_date DATE,
  start_time TEXT,
  end_time TEXT,
  location_name TEXT,
  address TEXT,
  city TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  cost_text TEXT,
  is_free BOOLEAN DEFAULT false,
  description TEXT,
  hero_image_url TEXT,
  category TEXT,
  age_range TEXT,
  is_indoor BOOLEAN,
  related_advertiser_id UUID,
  source_csv_filename TEXT,
  status TEXT DEFAULT 'published',
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_status      ON calendar_events(status);

-- ── Guide ad slots ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_ad_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug TEXT REFERENCES guide_types(slug),
  slot_position TEXT NOT NULL,
  advertiser_account_id UUID REFERENCES advertiser_accounts(id),
  ad_image_url TEXT,
  ad_headline TEXT,
  ad_description TEXT,
  ad_cta_label TEXT,
  ad_link TEXT,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  impression_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_ad_slots_active ON guide_ad_slots(guide_type_slug, slot_position, is_active);

-- ── Cross-guide intelligence view ─────────────────────────────────────────────
CREATE OR REPLACE VIEW advertiser_guide_appearances AS
SELECT
  a.id          AS advertiser_id,
  a.business_name,
  a.slug,
  COUNT(DISTINCT gl.guide_type_slug) AS guide_count,
  ARRAY_AGG(DISTINCT gl.guide_type_slug ORDER BY gl.guide_type_slug)
    FILTER (WHERE gl.id IS NOT NULL) AS guides_appearing_in,
  ARRAY_AGG(DISTINCT gl.listing_tier ORDER BY gl.listing_tier)
    FILTER (WHERE gl.id IS NOT NULL) AS tiers
FROM advertiser_accounts a
LEFT JOIN guide_listings gl ON gl.advertiser_account_id = a.id AND gl.is_published = true
GROUP BY a.id, a.business_name, a.slug;
