-- Migration 042: Add hours_of_operation jsonb to advertiser_accounts
-- Seed sample hours for DFC and Alabama Christian Academy
-- Also seed features_bullets listing_sections for both

-- SCHEMA CHECK — run this first to confirm column names in listing_sections:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'listing_sections'
-- ORDER BY ordinal_position;

-- Step 1: Add hours_of_operation column
ALTER TABLE advertiser_accounts
ADD COLUMN IF NOT EXISTS hours_of_operation JSONB;

-- Step 2: Seed hours for Dentistry for Children
UPDATE advertiser_accounts
SET hours_of_operation = '{
  "Monday": "8:00 AM - 5:00 PM",
  "Tuesday": "8:00 AM - 5:00 PM",
  "Wednesday": "8:00 AM - 5:00 PM",
  "Thursday": "8:00 AM - 5:00 PM",
  "Friday": "8:00 AM - 12:00 PM",
  "Saturday": "Closed",
  "Sunday": "Closed"
}'::jsonb
WHERE slug = 'dentistry-for-children'
  AND hours_of_operation IS NULL;

-- Step 3: Seed hours for Alabama Christian Academy
UPDATE advertiser_accounts
SET hours_of_operation = '{
  "Monday": "7:30 AM - 3:30 PM",
  "Tuesday": "7:30 AM - 3:30 PM",
  "Wednesday": "7:30 AM - 3:30 PM",
  "Thursday": "7:30 AM - 3:30 PM",
  "Friday": "7:30 AM - 3:30 PM",
  "Saturday": "Closed",
  "Sunday": "Closed"
}'::jsonb
WHERE slug = 'alabama-christian-academy'
  AND hours_of_operation IS NULL;

-- Step 4: Seed features_bullets for Alabama Christian Academy (idempotent)
INSERT INTO listing_sections (
  advertiser_account_id, section_type, headline, bullet_points, display_order, is_active, created_at
)
SELECT
  (SELECT id FROM advertiser_accounts WHERE slug = 'alabama-christian-academy' LIMIT 1),
  'features_bullets',
  'School Features',
  '["K3 through 12th grade",
    "College preparatory curriculum",
    "Founded 1942 with Church of Christ affiliation",
    "23 Advanced Placement sections offered",
    "Award-winning athletics program",
    "Active fine arts and theatre departments",
    "Christian values integrated throughout curriculum",
    "Small class sizes with dedicated faculty"]'::jsonb,
  10,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM listing_sections
  WHERE advertiser_account_id = (SELECT id FROM advertiser_accounts WHERE slug = 'alabama-christian-academy' LIMIT 1)
    AND section_type = 'features_bullets'
);

-- Step 5: Seed features_bullets for Dentistry for Children (idempotent)
INSERT INTO listing_sections (
  advertiser_account_id, section_type, headline, bullet_points, display_order, is_active, created_at
)
SELECT
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1),
  'features_bullets',
  'Practice Features',
  '["Pediatric specialists from infancy through adolescence",
    "Three convenient River Region locations",
    "Kid-friendly office design with games and toys",
    "Sedation dentistry available for nervous patients",
    "All major insurance plans accepted",
    "Same-day emergency appointments",
    "Bilingual staff (English and Spanish)",
    "Special needs experienced team"]'::jsonb,
  10,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM listing_sections
  WHERE advertiser_account_id = (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1)
    AND section_type = 'features_bullets'
);
