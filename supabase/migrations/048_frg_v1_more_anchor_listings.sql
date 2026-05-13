-- Migration 048: FRG V1 — Additional Anchor Listings
--
-- AUDIT RESULT: Only one additional safe listing is available from existing
-- advertiser_accounts data. All five priority sections (Pediatricians, Mom Wellness,
-- Sports & Recreation, Shopping, Family Services) have NO matching advertiser_accounts
-- in the database. Those sections remain on the punch list for outreach-based seeding.
--
-- This migration adds:
--   Guitar Center Montgomery → Tutoring & Learning Centers (enhanced)
--   Rationale: card_hook (migration 032) confirms music lessons for River Region kids.
--   The card_hook also serves as editorial_blurb on the listing card via FRG page logic.
--   Adding a second listing to Tutoring alongside Abrakadoodle makes that section
--   look populated in screenshots.
--
-- Data used:
--   - slug: confirmed by migration 032 UPDATE statement
--   - card_hook: "From first-time guitar pickers to advanced players,
--                 Guitar Center's private lesson instructors have introduced more
--                 River Region kids to music than any program in the area."
--   - guide_data.description: derived directly from card_hook, no invented specifics
--
-- guide_type_slug = 'newcomer' (guide_types.slug for Family Resource Guide)
-- listing_year    = 2026
-- category        = 'tutoring' (matches guide_categories.slug — normalizeForMatch resolves correctly)
--
-- Idempotent: WHERE NOT EXISTS guard prevents duplicate on re-run.

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
    "description": "Private music lessons for River Region students at every level — from first-time guitar pickers to advanced players. Guitar Center''s certified private lesson instructors work one-on-one with kids and teens, with flexible scheduling and no long-term commitment required."
  }'::jsonb,
  true,
  10
FROM advertiser_accounts a
WHERE a.slug = 'guitar-center-montgomery'
  AND NOT EXISTS (
    SELECT 1 FROM guide_listings g
    WHERE g.advertiser_account_id = a.id
      AND g.guide_type_slug = 'newcomer'
      AND g.listing_year = 2026
  );

-- ── Verification ──────────────────────────────────────────────────────────────

-- SELECT a.business_name, gl.listing_tier, gl.category, gl.display_order
-- FROM guide_listings gl
-- JOIN advertiser_accounts a ON a.id = gl.advertiser_account_id
-- WHERE gl.guide_type_slug = 'newcomer'
--   AND gl.listing_year = 2026
--   AND gl.category = 'tutoring'
-- ORDER BY gl.display_order;
-- expect 2 rows: Abrakadoodle (order 0), Guitar Center Montgomery (order 10)

-- SELECT COUNT(*) FROM guide_listings
-- WHERE guide_type_slug = 'newcomer' AND listing_year = 2026;
-- expect 12 (11 from migration 046 + 1 from this migration)

-- ── DATA NEEDED FOR PRIORITY SECTIONS (punch list) ────────────────────────────
--
-- The following sections remain empty because no matching advertiser_accounts exist.
-- Minimum data required before each can be safely seeded:
--
-- PEDIATRICIANS (category: pediatricians)
--   Need: 1–2 local pediatric practices added to advertiser_accounts with:
--   - business_name, slug, phone (office_phone), website_url
--   - Optional: address, city_state_zip, accepting_new_patients flag in guide_data
--   Candidates to approach: River Region Pediatrics, Capitol City Pediatrics,
--     Montgomery Pediatric Associates, River Region Physicians Group pediatric wing
--
-- MOM WELLNESS (category: mom-wellness)
--   Need: 1 spa, fitness studio, or women's wellness provider with:
--   - business_name, slug, phone, website_url
--   - Optional: address, short description of services for guide_data
--   Candidates: local Pilates/yoga studios, women's fitness centers, day spas
--
-- SPORTS & RECREATION (category: recreation-leagues OR golf-tennis)
--   Need: YMCA Montgomery or a youth recreation league with:
--   - business_name, slug, phone, website_url
--   - Optional: address, program types in guide_data
--   Montgomery YMCA (3 locations) is the obvious anchor — high credibility, free listing
--
-- SHOPPING (category: kids-clothing OR baby-gear)
--   Need: 1 children's boutique or baby gear shop with:
--   - business_name, slug, phone, website_url
--   - Optional: address, specialty (newborn, ages 0–10, maternity, etc.)
--   Eastchase and EastChase-adjacent boutiques are the strongest candidates
--
-- FAMILY SERVICES (category: family-photographers)
--   Need: 1 local photographer who works with families/newborns with:
--   - business_name, slug, website_url
--   - Optional: Instagram handle, booking link, price range in guide_data
--   Photography is high-demand, high-willingness-to-pay — ideal founding partner
--
-- FARMERS MARKETS (category: farmers-markets)
--   Need: Montgomery Curb Market or Pike Road Farmers Market added to advertiser_accounts with:
--   - business_name, slug, address/location, hours (Saturday mornings)
--   - Website or Facebook page URL
--   Both are free listings — no advertiser relationship required, just editorial placement
