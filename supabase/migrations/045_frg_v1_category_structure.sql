-- Migration 045: FRG V1 Launch Category Structure
-- Seeds guide_categories for guide_slug = 'family-resource-guide'
-- Idempotent: skips any (guide_slug, slug) pair that already exists
--
-- 28 directory categories across all 11 approved V1 parent groups:
--   Schools & Learning · Childcare · Pediatric & Family Healthcare
--   Things To Do · Family Getaways · Food & Dining · Community & Faith
--   Mom Life · Family Services · Shopping · Sports & Recreation
--
-- display_order uses 100-based group spacing (100s per group, 10-step rows)
-- so subcategories can be inserted between existing ones without renumbering.
--
-- show_in_print = false marks categories that are editorial-forward at launch
-- and unlikely to have directory listings Day 1 (not permanently deferred).
--
-- Run in Supabase SQL editor. Safe to re-run — WHERE NOT EXISTS guard prevents
-- duplicate rows even though the UNIQUE constraint includes nullable publication_id.

WITH cats (name, slug, parent_group, display_order, show_in_print, description) AS (
  VALUES

    -- ── Schools & Learning ──────────────────────────────────────────────────────
    (
      'Private & Faith-Based Schools',
      'private-schools',
      'Schools & Learning',
      100, true,
      'Independent, parochial, and faith-based K–12 options across the River Region.'
    ),
    (
      'Public School Systems',
      'public-schools',
      'Schools & Learning',
      110, true,
      'Montgomery, Autauga, Elmore, and Pike Road public school districts.'
    ),
    (
      'Tutoring & Learning Centers',
      'tutoring',
      'Schools & Learning',
      120, true,
      'One-on-one tutoring, test prep, and enrichment programs for K–12 students.'
    ),
    (
      'Mother''s Day Out Programs',
      'mothers-day-out',
      'Schools & Learning',
      130, true,
      'Part-time, church-based programs for infants and toddlers.'
    ),

    -- ── Childcare ───────────────────────────────────────────────────────────────
    (
      'Childcare Centers',
      'childcare-centers',
      'Childcare',
      200, true,
      'Licensed childcare and early education centers serving infants through school age.'
    ),

    -- ── Pediatric & Family Healthcare ───────────────────────────────────────────
    (
      'Pediatricians',
      'pediatricians',
      'Pediatric & Family Healthcare',
      300, true,
      'Pediatric primary care practices accepting new patients across the River Region.'
    ),
    (
      'Pediatric Dentists & Orthodontists',
      'pediatric-dentists',
      'Pediatric & Family Healthcare',
      310, true,
      'Pediatric dental care and orthodontic practices serving children and teens.'
    ),
    (
      'Hospitals & Emergency',
      'hospitals',
      'Pediatric & Family Healthcare',
      320, true,
      'Hospitals and emergency departments serving the River Region.'
    ),
    (
      'Urgent Care',
      'urgent-care',
      'Pediatric & Family Healthcare',
      330, true,
      'Walk-in urgent care clinics, including those serving pediatric patients.'
    ),
    (
      'Women''s Health & OB-GYN',
      'womens-health',
      'Pediatric & Family Healthcare',
      340, true,
      'OB-GYN practices and women''s health specialists in Montgomery and surrounding areas.'
    ),

    -- ── Things To Do ────────────────────────────────────────────────────────────
    (
      'Indoor Fun & Play',
      'indoor-fun',
      'Things To Do',
      400, true,
      'Trampoline parks, skating rinks, play zones, and indoor family activity venues.'
    ),
    (
      'Parks & Outdoor Adventures',
      'parks-outdoor',
      'Things To Do',
      410, true,
      'Public parks, splash pads, nature trails, and outdoor spaces for families across the River Region.'
    ),
    (
      'Libraries',
      'libraries',
      'Things To Do',
      420, true,
      'Public library branches with children''s programming, story times, and free resources.'
    ),
    (
      'Live Entertainment & Theatre',
      'performing-arts',
      'Things To Do',
      430, true,
      'Theatres, performing arts venues, and live entertainment options for the whole family.'
    ),

    -- ── Family Getaways ──────────────────────────────────────────────────────────
    (
      'Day Trips & Weekend Getaways',
      'day-trips',
      'Family Getaways',
      500, false,
      'The best destinations within two hours of Montgomery — beaches, mountains, cities, and hidden Alabama gems worth the drive.'
    ),

    -- ── Food & Dining ────────────────────────────────────────────────────────────
    (
      'Kid-Friendly Restaurants',
      'kid-friendly-restaurants',
      'Food & Dining',
      600, true,
      'Local restaurants where kids are genuinely welcome — with menus and atmospheres that work for the whole family.'
    ),
    (
      'Farmers Markets',
      'farmers-markets',
      'Food & Dining',
      610, true,
      'Local farmers markets with fresh produce, baked goods, and vendors across the River Region.'
    ),

    -- ── Community & Faith ────────────────────────────────────────────────────────
    (
      'Mom Groups & Support',
      'mom-groups',
      'Community & Faith',
      700, true,
      'Local mom groups, MOPS chapters, and parent support communities.'
    ),
    (
      'Faith Communities',
      'faith-communities',
      'Community & Faith',
      710, false,
      'Churches, synagogues, and faith communities welcoming families across the River Region.'
    ),

    -- ── Mom Life ─────────────────────────────────────────────────────────────────
    (
      'Mom Wellness',
      'mom-wellness',
      'Mom Life',
      800, true,
      'Spas, fitness studios, mental health services, and wellness providers serving moms in the River Region.'
    ),
    (
      'Pregnancy & Postpartum',
      'pregnancy-postpartum',
      'Mom Life',
      810, true,
      'Midwives, birth centers, postpartum doulas, lactation consultants, and pregnancy support resources.'
    ),

    -- ── Family Services ──────────────────────────────────────────────────────────
    (
      'Family Photographers',
      'family-photographers',
      'Family Services',
      900, true,
      'Local photographers specializing in family portraits and milestone sessions.'
    ),
    (
      'Real Estate',
      'real-estate',
      'Family Services',
      910, false,
      'Family-focused realtors and real estate agencies serving the River Region.'
    ),
    (
      'Moving & Storage',
      'moving-storage',
      'Family Services',
      920, false,
      'Local movers, storage facilities, and packing services for relocating families.'
    ),

    -- ── Shopping ─────────────────────────────────────────────────────────────────
    (
      'Children''s Clothing & Boutiques',
      'kids-clothing',
      'Shopping',
      1000, true,
      'Local boutiques and children''s clothing shops serving newborns through tweens.'
    ),
    (
      'Baby Gear & Nursery',
      'baby-gear',
      'Shopping',
      1010, true,
      'Baby gear, nursery furniture, and specialty shops for expectant and new parents.'
    ),

    -- ── Sports & Recreation ──────────────────────────────────────────────────────
    (
      'Recreation Leagues & Programs',
      'recreation-leagues',
      'Sports & Recreation',
      1100, true,
      'Youth leagues, recreation programs, YMCA facilities, and organized outdoor activities.'
    ),
    (
      'Golf & Tennis',
      'golf-tennis',
      'Sports & Recreation',
      1110, true,
      'Golf courses, tennis facilities, and country clubs in Montgomery and surrounding areas.'
    )
)
INSERT INTO guide_categories (guide_slug, name, slug, parent_group, display_order, show_in_print, description)
SELECT
  'family-resource-guide',
  c.name,
  c.slug,
  c.parent_group,
  c.display_order,
  c.show_in_print,
  c.description
FROM cats c
WHERE NOT EXISTS (
  SELECT 1
  FROM guide_categories g
  WHERE g.guide_slug = 'family-resource-guide'
    AND g.slug = c.slug
);

-- ── Fix display_order for any rows that already existed with the old 10-step numbering ──
-- (Safe to run even if no rows matched above — only updates guide_slug + slug pairs that exist)

UPDATE guide_categories SET display_order = 100  WHERE guide_slug = 'family-resource-guide' AND slug = 'private-schools'        AND display_order = 10;
UPDATE guide_categories SET display_order = 110  WHERE guide_slug = 'family-resource-guide' AND slug = 'public-schools'         AND display_order = 20;
UPDATE guide_categories SET display_order = 120  WHERE guide_slug = 'family-resource-guide' AND slug = 'tutoring'               AND display_order = 30;
UPDATE guide_categories SET display_order = 130  WHERE guide_slug = 'family-resource-guide' AND slug = 'mothers-day-out'        AND display_order = 40;
UPDATE guide_categories SET display_order = 200  WHERE guide_slug = 'family-resource-guide' AND slug = 'childcare-centers'      AND display_order = 50;
UPDATE guide_categories SET display_order = 300  WHERE guide_slug = 'family-resource-guide' AND slug = 'pediatricians'          AND display_order = 60;
UPDATE guide_categories SET display_order = 310  WHERE guide_slug = 'family-resource-guide' AND slug = 'pediatric-dentists'     AND display_order = 70;
UPDATE guide_categories SET display_order = 320  WHERE guide_slug = 'family-resource-guide' AND slug = 'hospitals'              AND display_order = 80;
UPDATE guide_categories SET display_order = 330  WHERE guide_slug = 'family-resource-guide' AND slug = 'urgent-care'            AND display_order = 90;
UPDATE guide_categories SET display_order = 340  WHERE guide_slug = 'family-resource-guide' AND slug = 'womens-health'          AND display_order = 100;
UPDATE guide_categories SET display_order = 400  WHERE guide_slug = 'family-resource-guide' AND slug = 'indoor-fun'             AND display_order = 110;
UPDATE guide_categories SET display_order = 420  WHERE guide_slug = 'family-resource-guide' AND slug = 'libraries'              AND display_order = 120;
UPDATE guide_categories SET display_order = 430  WHERE guide_slug = 'family-resource-guide' AND slug = 'performing-arts'        AND display_order = 130;
UPDATE guide_categories SET display_order = 610  WHERE guide_slug = 'family-resource-guide' AND slug = 'farmers-markets'        AND display_order = 140;
UPDATE guide_categories SET display_order = 700  WHERE guide_slug = 'family-resource-guide' AND slug = 'mom-groups'             AND display_order = 150;
UPDATE guide_categories SET display_order = 710  WHERE guide_slug = 'family-resource-guide' AND slug = 'faith-communities'      AND display_order = 160;
UPDATE guide_categories SET display_order = 900  WHERE guide_slug = 'family-resource-guide' AND slug = 'family-photographers'   AND display_order = 170;
UPDATE guide_categories SET display_order = 910  WHERE guide_slug = 'family-resource-guide' AND slug = 'real-estate'            AND display_order = 180;
UPDATE guide_categories SET display_order = 920  WHERE guide_slug = 'family-resource-guide' AND slug = 'moving-storage'         AND display_order = 190;
UPDATE guide_categories SET display_order = 1100 WHERE guide_slug = 'family-resource-guide' AND slug = 'recreation-leagues'     AND display_order = 200;
UPDATE guide_categories SET display_order = 1110 WHERE guide_slug = 'family-resource-guide' AND slug = 'golf-tennis'            AND display_order = 210;

-- ── Verification ─────────────────────────────────────────────────────────────────
-- Run these after migration to confirm expected state:

-- SELECT parent_group, name, slug, display_order, show_in_print
-- FROM guide_categories
-- WHERE guide_slug = 'family-resource-guide'
-- ORDER BY display_order;
-- expect 28 rows across 11 parent groups

-- SELECT COUNT(*) FROM guide_categories WHERE guide_slug = 'family-resource-guide';
-- expect 28

-- SELECT DISTINCT parent_group FROM guide_categories
-- WHERE guide_slug = 'family-resource-guide'
-- ORDER BY 1;
-- expect 11 distinct parent_groups:
--   Childcare, Community & Faith, Family Getaways, Family Services,
--   Food & Dining, Mom Life, Pediatric & Family Healthcare,
--   Schools & Learning, Shopping, Sports & Recreation, Things To Do
