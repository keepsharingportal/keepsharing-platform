-- Migration 037: Trending items + community spotlights for homepage

CREATE TABLE IF NOT EXISTS trending_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji         TEXT,
  label         TEXT NOT NULL,
  link          TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO trending_items (emoji, label, link, display_order) VALUES
('☀️', '2026 Summer Camp Guide', '/summer-camp-guide', 1),
('📖', 'May Digital Issue Released', '/local-guides', 2),
('🏆', 'Nominate Teacher of the Month', '/local-guides', 3),
('🎪', 'Mother''s Day Weekend Events', '/calendar', 4),
('🍎', 'School Year Wind-Down Tips', '/newcomer-guide/articles', 5)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS community_spotlights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotlight_type    TEXT NOT NULL,
  honoree_name      TEXT NOT NULL,
  honoree_context   TEXT,
  hero_image_url    TEXT,
  full_story_link   TEXT,
  is_active         BOOLEAN DEFAULT true,
  display_order     INT DEFAULT 0,
  featured_month    INT,
  featured_year     INT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO community_spotlights (spotlight_type, honoree_name, honoree_context, display_order, featured_month, featured_year) VALUES
('teacher', 'Mrs. Davis', '3rd Grade, Riverside Elementary', 1, 5, 2026),
('student', 'Marcus Johnson', 'State Science Fair Winner', 2, 5, 2026),
('grands', 'The Smiths', '50 Years in the River Region', 3, 5, 2026)
ON CONFLICT DO NOTHING;

-- Add homepage ad placement types to ad_placements seeds
DO $$
DECLARE rrp_id UUID; dfc_id UUID;
BEGIN
  SELECT id INTO rrp_id FROM advertiser_accounts WHERE business_name ILIKE 'River Region Parents' LIMIT 1;
  SELECT id INTO dfc_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1;

  IF dfc_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ad_placements WHERE placement_type = 'homepage_inline_ad' LIMIT 1
  ) THEN
    INSERT INTO ad_placements (
      placement_type, context_type, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, display_priority
    ) VALUES
    ('homepage_inline_ad', 'homepage', dfc_id,
     'Sponsored', 'River Region Pediatric Dentistry',
     'Now accepting new patients. Book your child''s summer checkup today.',
     'Learn More', '/healthy-kids-guide/listings/dentistry-for-children', 100);
  END IF;

  IF rrp_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ad_placements WHERE placement_type = 'homepage_sidebar_ad' LIMIT 1
  ) THEN
    INSERT INTO ad_placements (
      placement_type, context_type, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, display_priority
    ) VALUES
    ('homepage_sidebar_ad', 'homepage', rrp_id,
     'Advertisement', 'List Your Business',
     'Partner with River Region Parents and reach 50,000+ local families.',
     'Learn More', '/advertise', 90),
    ('guides_index_ad', 'guides', rrp_id,
     'Partner Spotlight', 'Your Business Here',
     'Featured placement in our Local Guides index. Contact us to learn more.',
     'Get Listed', '/advertise', 80),
    ('guide_directory_inline_ad', 'guide', rrp_id,
     'AD', 'Advertise in This Guide',
     'Reach families searching for exactly what you offer.',
     'Learn More', '/advertise', 70);
  END IF;
END $$;
