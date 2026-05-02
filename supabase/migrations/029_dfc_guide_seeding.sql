-- Migration 029: Seed Dentistry for Children guide data
-- Run AFTER migration 028 and after the DFC advertiser_account exists.
-- This adds card_hook, detail_lead, hero content, and listing sections.

-- ── Update DFC advertiser_account ────────────────────────────────────────────
UPDATE advertiser_accounts
SET
  card_hook    = 'Board-certified pediatric dentists who make every visit feel like an adventure — not an appointment.',
  detail_lead  = 'Dentistry for Children is the River Region''s leading pediatric dental practice, with three locations built entirely around the needs of children from infancy through adolescence. No rushed visits, no intimidating equipment — just a team that loves kids and shows it.',
  address      = '2820 Zelda Road',
  city_state_zip = 'Montgomery, AL 36106',
  website_url  = 'https://www.dentistryforchildren.com',
  neighborhood = 'Montgomery',
  is_active    = true
WHERE slug = 'dentistry-for-children';

-- ── Guide listing for healthy-kids guide ─────────────────────────────────────
INSERT INTO guide_listings (
  advertiser_account_id,
  guide_type_slug,
  listing_year,
  listing_tier,
  category,
  guide_data,
  is_published,
  display_order
)
SELECT
  id,
  'healthy-kids',
  2026,
  'featured',
  'Dentistry',
  '{
    "description": "Dentistry for Children specializes exclusively in pediatric dentistry for patients from birth through age 18. Our board-certified pediatric dentists and specialists provide preventive, restorative, and emergency care in a calming, child-friendly environment. We accept most major insurance plans and offer flexible scheduling at three convenient River Region locations.",
    "hours": "Monday – Friday 8:00 AM – 5:00 PM",
    "ages": "Birth through age 18",
    "specialties": "Pediatric dentistry, orthodontics, oral surgery consultation, sedation dentistry"
  }'::jsonb,
  true,
  0
FROM advertiser_accounts
WHERE slug = 'dentistry-for-children'
ON CONFLICT (advertiser_account_id, guide_type_slug, listing_year) DO UPDATE
  SET
    listing_tier = 'featured',
    guide_data   = EXCLUDED.guide_data,
    updated_at   = NOW();

-- ── Listing sections for DFC ──────────────────────────────────────────────────
-- Delete any existing sections for clean re-seed
DELETE FROM listing_sections
WHERE advertiser_account_id = (
  SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children'
);

INSERT INTO listing_sections (advertiser_account_id, section_type, display_order, headline, subheadline, body_content, bullet_points)
SELECT
  id,
  'about',
  1,
  'Why Families Choose DFC',
  'Three locations. One standard of care.',
  'Dentistry for Children was founded on a single idea: children deserve dental care designed specifically for them. That means shorter wait times, gentler techniques, and a team trained not just in dentistry but in working with kids at every developmental stage.',
  '["Board-certified pediatric dentists on staff", "Sedation dentistry available for anxious patients", "Same-day emergency appointments", "Accepts most major insurance plans", "Evening and Saturday hours at select locations"]'::jsonb
FROM advertiser_accounts
WHERE slug = 'dentistry-for-children';

INSERT INTO listing_sections (advertiser_account_id, section_type, display_order, headline, body_content, bullet_points)
SELECT
  id,
  'services',
  2,
  'Services',
  'From first teeth to teen smiles, DFC offers a full spectrum of pediatric dental services.',
  '["Preventive cleanings and exams", "Fluoride treatments and sealants", "Cavity fillings (tooth-colored)", "Emergency dental care", "Early orthodontic evaluation", "Infant oral health exams", "Special needs dentistry"]'::jsonb
FROM advertiser_accounts
WHERE slug = 'dentistry-for-children';

INSERT INTO listing_sections (advertiser_account_id, section_type, display_order, headline, body_content, offer_text, offer_cta_label)
SELECT
  id,
  'offer',
  3,
  'New Patient Offer',
  'Ready to bring your child in for their first visit?',
  'New patients receive a complimentary first exam and cleaning. Call any DFC location or book online to schedule — appointments typically available within one week.',
  'Book Online'
FROM advertiser_accounts
WHERE slug = 'dentistry-for-children';
