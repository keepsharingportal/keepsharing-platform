-- Migration 046: FRG V1 Anchor Listings
-- Seeds guide_listings entries for existing advertiser_accounts
-- into the Family Resource Guide directory.
--
-- guide_type_slug = 'newcomer' — the guide_types.slug for Family Resource Guide
--   (guide_types.url_slug = 'family-resource-guide', slug = 'newcomer')
-- listing_year = 2026
--
-- category values use guide_categories.slug for the FRG.
-- The FRG page normalizeForMatch() checks: norm === cat.slug OR norm === normalizeForMatch(cat.name)
-- Storing the slug as category gives a direct slug match — cleanest approach.
--
-- All inserts are guarded by WHERE EXISTS (advertiser_account must exist)
-- and WHERE NOT EXISTS (no duplicate guide_listing for same account + guide + year).
-- Safe to re-run.

-- ── Dentistry for Children — Pediatric Dentists · Featured ────────────────────
-- Fully profiled: card_hook, detail_lead, listing_sections, hours, hero_photo
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'featured',
  'pediatric-dentists',
  '{
    "description": "Dentistry for Children specializes exclusively in pediatric dentistry for patients from birth through age 18. Board-certified pediatric dentists, three River Region locations, same-day emergency appointments, and an office designed to make kids actually want to come back.",
    "hours": "Mon–Thu 8:00 AM – 5:00 PM · Fri 8:00 AM – 12:00 PM",
    "ages": "Birth through age 18",
    "specialties": "Pediatric dentistry, orthodontics, sedation dentistry, special needs"
  }'::jsonb,
  true,
  0
FROM advertiser_accounts a
WHERE a.slug = 'dentistry-for-children'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Hooper Childcare & Early Learning Center — Childcare Centers · Featured ───
-- Strong card_hook: "the childcare center families put on their list before the baby is born"
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'featured',
  'childcare-centers',
  '{
    "description": "Hooper Childcare is the River Region center families put on their waitlist before the baby is born. Licensed for infants through school age, with a curriculum and staff ratio that sets the local standard for early childhood education."
  }'::jsonb,
  true,
  0
FROM advertiser_accounts a
WHERE a.slug = 'hooper-childcare-early-learning-center'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Saint James School — Private Schools · Enhanced ───────────────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'enhanced',
  'private-schools',
  '{
    "description": "A K3-through-12 college-preparatory school where 100% of seniors receive academic scholarship offers. Known for rigorous academics, a strong arts program, and a community where students and teachers know each other by name."
  }'::jsonb,
  true,
  10
FROM advertiser_accounts a
WHERE a.slug = 'saint-james-school'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Macon-East Academy — Private Schools · Enhanced ──────────────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'enhanced',
  'private-schools',
  '{
    "description": "The River Region''s largest private school, with 45 athletic teams, an award-winning arts program, and a community built over 70 years. Pre-K through 12th grade with broad extracurricular depth that few schools in Alabama can match."
  }'::jsonb,
  true,
  20
FROM advertiser_accounts a
WHERE a.slug = 'macon-east-academy'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── AIM Academy — Private Schools · Enhanced ─────────────────────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'enhanced',
  'private-schools',
  '{
    "description": "Small classes, college-prep rigor, and a genuinely supportive community. AIM Academy is the school River Region parents keep recommending to newcomers who want high academic standards without a large-school atmosphere."
  }'::jsonb,
  true,
  30
FROM advertiser_accounts a
WHERE a.slug = 'aim-academy'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Alabama Christian Academy — Private Schools · Free ────────────────────────
-- Has hours_of_operation and features_bullets from migration 042
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'free',
  'private-schools',
  '{
    "description": "K3 through 12th grade with a Church of Christ affiliation. 23 Advanced Placement sections, award-winning athletics, and a college-preparatory curriculum in a faith-integrated environment since 1942."
  }'::jsonb,
  true,
  40
FROM advertiser_accounts a
WHERE a.slug = 'alabama-christian-academy'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── River Region Academy — Private Schools · Free ────────────────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'free',
  'private-schools',
  '{
    "description": "An independent K–12 school built for students who learn differently. 8:1 student-teacher ratio, flexible scheduling, and teachers who work with the whole child — not just the test score."
  }'::jsonb,
  true,
  50
FROM advertiser_accounts a
WHERE a.slug = 'river-region-academy'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Cobblestone Learning Center — Childcare Centers · Free ───────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'free',
  'childcare-centers',
  '{
    "description": "Montgomery''s longest-running early learning center, with a curriculum built for the whole child and a staff that has been here longer than most kids have been alive."
  }'::jsonb,
  true,
  10
FROM advertiser_accounts a
WHERE a.slug = 'cobblestone-learning-center'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Abrakadoodle Art Education — Tutoring & Learning Centers · Enhanced ───────
-- Arts + STEAM enrichment; fits tutoring/enrichment better than indoor fun
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'enhanced',
  'tutoring',
  '{
    "description": "Process-based, imagination-driven art and STEAM programs trusted by River Region schools and families for over two decades. Afterschool classes, school-day programs, and summer camps at multiple host sites."
  }'::jsonb,
  true,
  0
FROM advertiser_accounts a
WHERE a.slug = 'abrakadoodle-art-education'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── 2211 The Ultimate Play Zone — Indoor Fun & Play · Enhanced ────────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'enhanced',
  'indoor-fun',
  '{
    "description": "Roller skating, arcade games, and private party rooms under one roof. The Ultimate Play Zone has been the go-to for Montgomery family fun and birthday parties for years — open weekends and school breaks."
  }'::jsonb,
  true,
  0
FROM advertiser_accounts a
WHERE a.slug = '2211-the-ultimate-play-zone'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Bruster's Real Ice Cream — Kid-Friendly Restaurants · Free ───────────────
INSERT INTO guide_listings (
  advertiser_account_id, guide_type_slug, listing_year,
  listing_tier, category, guide_data, is_published, display_order
)
SELECT
  a.id,
  'newcomer',
  2026,
  'free',
  'kid-friendly-restaurants',
  '{
    "description": "The River Region''s favorite ice cream stop — made fresh in-store daily, with flavors that rotate seasonally. The cake option is what River Region moms order instead of baking. Walk-up windows, family-friendly, and reliably crowded on Friday nights."
  }'::jsonb,
  true,
  0
FROM advertiser_accounts a
WHERE a.slug = 'brusters-ice-cream-yogurt'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Verification ─────────────────────────────────────────────────────────────────

-- SELECT a.business_name, gl.listing_tier, gl.category, gl.guide_type_slug
-- FROM guide_listings gl
-- JOIN advertiser_accounts a ON a.id = gl.advertiser_account_id
-- WHERE gl.guide_type_slug = 'newcomer' AND gl.listing_year = 2026
-- ORDER BY gl.listing_tier, gl.category, gl.display_order;
-- expect 10 rows:
--   featured:  Dentistry for Children (pediatric-dentists), Hooper Childcare (childcare-centers)
--   enhanced:  Saint James (private-schools), Macon-East (private-schools), AIM Academy (private-schools)
--              Abrakadoodle (tutoring), 2211 Play Zone (indoor-fun)
--   free:      Alabama Christian (private-schools), River Region Academy (private-schools)
--              Cobblestone (childcare-centers), Bruster's (kid-friendly-restaurants)

-- SELECT COUNT(*) FROM guide_listings WHERE guide_type_slug = 'newcomer' AND listing_year = 2026;
-- expect 11
