-- Migration 035: Ad placement system

CREATE TABLE IF NOT EXISTS ad_placements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_type        TEXT NOT NULL,
  context_type          TEXT,
  context_slug          TEXT,
  advertiser_account_id UUID REFERENCES advertiser_accounts(id),
  ad_image_url          TEXT,
  ad_eyebrow            TEXT,
  ad_headline           TEXT,
  ad_description        TEXT,
  ad_cta_label          TEXT,
  ad_link               TEXT,
  starts_at             TIMESTAMPTZ DEFAULT NOW(),
  ends_at               TIMESTAMPTZ,
  is_active             BOOLEAN DEFAULT true,
  display_priority      INT DEFAULT 0,
  impression_count      INT DEFAULT 0,
  click_count           INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_placements_lookup       ON ad_placements(placement_type, context_type, context_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_ad_placements_active_dates ON ad_placements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_ad_placements_advertiser   ON ad_placements(advertiser_account_id);

-- ── Helper functions ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_ad_impression(p_ad_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE ad_placements SET impression_count = impression_count + 1 WHERE id = p_ad_id;
$$;

CREATE OR REPLACE FUNCTION increment_ad_click(p_ad_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE ad_placements SET click_count = click_count + 1 WHERE id = p_ad_id;
$$;

-- ── Seed ad inventory ─────────────────────────────────────────────────────────
DO $$
DECLARE
  rrp_id UUID;
  dfc_id UUID;
BEGIN
  SELECT id INTO rrp_id FROM advertiser_accounts WHERE business_name ILIKE 'River Region Parents' LIMIT 1;
  SELECT id INTO dfc_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1;

  IF dfc_id IS NOT NULL THEN
    INSERT INTO ad_placements (placement_type, context_type, context_slug, advertiser_account_id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, display_priority) VALUES
    ('guide_sidebar_sticky', 'guide', 'healthy-kids-guide', dfc_id,
     'Featured Partner', 'First dental visits, made easier.',
     'Free Happy Visit for new patients — just a tour, no procedures. Two board-certified pediatric dentists.',
     'Schedule a Happy Visit', '/healthy-kids-guide/listings/dentistry-for-children', 100),
    ('guide_inline_sponsored', 'guide', 'healthy-kids-guide', dfc_id,
     'Recommended By Local Moms', 'The pediatric dentist designed for nervous kids.',
     'Patient-led pace. Free Happy Visits for new patients. Three River Region locations.',
     'Learn More', '/healthy-kids-guide/listings/dentistry-for-children', 90),
    ('calendar_featured_event', 'calendar', NULL, dfc_id,
     'Sponsor Spotlight', 'Free Happy Visit — No Procedures, Just a Tour',
     'Make your child''s first dental visit a positive memory. Dentistry for Children, River Region''s pediatric dental leader.',
     'Schedule Now', '/healthy-kids-guide/listings/dentistry-for-children', 80);
  END IF;

  IF rrp_id IS NOT NULL THEN
    INSERT INTO ad_placements (placement_type, context_type, context_slug, advertiser_account_id, ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link, display_priority) VALUES
    ('guide_sidebar_sticky', 'guide', 'family-resource-guide', rrp_id,
     'For Local Businesses', 'Want your business featured here?',
     'Reach 50,000+ River Region families monthly across our magazine, website, and newsletter.',
     'View Partnership Options', '/advertise', 50),
    ('guide_inline', 'guide', 'private-school-guide', rrp_id,
     'From River Region Parents', 'School decisions made easier.',
     'Get our weekly email with the latest school news, tour reminders, and what local moms are saying.',
     'Subscribe Free', '/calendar', 50),
    ('calendar_inline_promotion', 'calendar', NULL, rrp_id,
     'Never Miss an Event', 'Get the weekly events email',
     'Every Thursday — what''s happening for River Region families this weekend.',
     'Subscribe Free', '/calendar', 40),
    ('newsletter_sponsor', 'newsletter', NULL, rrp_id,
     'This Week Brought to You By', 'Premium Local Partners',
     'This newsletter slot is available — partner with us to reach our weekly audience.',
     'Become a Partner', '/advertise', 20),
    ('site_footer_partners', 'site_global', NULL, rrp_id,
     NULL, 'River Region Parents',
     'Local family media serving the River Region since 2001.',
     'About Us', '/advertise', 30);
  END IF;
END $$;
