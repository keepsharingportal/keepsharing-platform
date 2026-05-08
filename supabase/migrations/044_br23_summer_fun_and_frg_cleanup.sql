-- Migration 044: BR23 — FRG Cleanup + Summer Fun Guide Seed Data
-- Idempotent: IF NOT EXISTS on every CREATE, ON CONFLICT DO NOTHING / WHERE NOT EXISTS on every INSERT.
--
-- AUDIT NOTE: The BR23 spec referenced `family_guide_listings` but that table does not exist.
-- Newcomer-guide listings are linked via `guide_categories.guide_slug = 'newcomer-guide'`.
-- The correct migration is to UPDATE guide_categories to point to 'family-resource-guide'.

-- ── Part A: FRG Cleanup ────────────────────────────────────────────────────────

-- 1. Migrate newcomer-guide categories (and their linked listings) to family-resource-guide
UPDATE guide_categories
SET guide_slug = 'family-resource-guide'
WHERE guide_slug = 'newcomer-guide';

-- 2. Null out the burger placeholder hero so FRG falls back to gradient
UPDATE guide_meta
SET hero_image_url = NULL
WHERE guide_slug = 'family-resource-guide';

-- ── Part B: Summer Fun Guide Seed Data ────────────────────────────────────────

-- 3. Insert Summer Fun guide_meta row
INSERT INTO guide_meta (guide_slug, guide_name, hero_image_url, hero_eyebrow, hero_title, hero_subtitle, hero_issue_label)
VALUES (
  'summer-fun-guide',
  'Summer Fun Guide',
  NULL,
  'RIVER REGION PARENTS · SUMMER FUN GUIDE',
  'Make This Summer the One They Remember',
  'Camps, splash pads, day trips, festivals, and lazy-afternoon ideas — everything that keeps summer feeling like summer in the River Region.',
  'Summer Issue · 2026'
)
ON CONFLICT (guide_slug) DO UPDATE SET
  guide_name        = EXCLUDED.guide_name,
  hero_eyebrow      = EXCLUDED.hero_eyebrow,
  hero_title        = EXCLUDED.hero_title,
  hero_subtitle     = EXCLUDED.hero_subtitle,
  hero_issue_label  = EXCLUDED.hero_issue_label;

-- 4. Insert Summer Fun Start Here cards

INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_label, cta_href)
SELECT
  'summer-fun-guide', 1, 'Camps & Programs',
  'Summer Camps Across the River Region',
  'Day camps, sports leagues, art studios, and faith-based programs — find the right fit for every age and interest.',
  'Browse',
  '/summer-camp-guide'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'summer-fun-guide' AND display_order = 1
);

INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_label, cta_href)
SELECT
  'summer-fun-guide', 2, 'Water Play',
  'Splash Pads, Pools & Lake Days',
  'Where to cool off when Alabama summer hits — and a few hidden spots most families never find.',
  'Read',
  '#splash-pads'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'summer-fun-guide' AND display_order = 2
);

INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_label, cta_href)
SELECT
  'summer-fun-guide', 3, 'Day Trips',
  'Family Day Trips Within 90 Minutes',
  'When the backyard''s not enough — the best mini-getaways for a memorable weekend without the long drive.',
  'Read',
  '#day-trips'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'summer-fun-guide' AND display_order = 3
);

-- 5. Insert Summer Fun playbook section + items

INSERT INTO guide_playbook_sections (guide_slug, section_title, section_subtitle, display_order)
SELECT
  'summer-fun-guide',
  'Your Summer Game Plan',
  'A week-by-week rhythm that keeps everyone happy and the burnout away.',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM guide_playbook_sections WHERE guide_slug = 'summer-fun-guide' AND display_order = 1
);

DO $$
DECLARE
  sec_id UUID;
BEGIN
  SELECT id INTO sec_id
  FROM guide_playbook_sections
  WHERE guide_slug = 'summer-fun-guide' AND display_order = 1;

  IF sec_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Reset Weeks (1–2)', 0,
    '["Set a daily rhythm — wake-up, breakfast, outside by 10","Plan screen-free hours mid-day (1–3pm works)","Stock the freezer with popsicles and cut fruit","Identify 3 indoor \"plan B\" spots for the hottest days"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 0
  );

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Adventure Weeks (3–5)', 1,
    '["Try one new park or playground per week","Take one day trip outside Montgomery","Sign up for one community event (library, festival, splash pad opening)","Schedule an early-morning water play visit before crowds"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 1
  );

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Wind-Down Weeks (6–8)', 2,
    '["Start the school sleep routine two weeks before day one","One last big family memory — beach day, zoo, fair","Refresh school supplies, backpacks, water bottles, lunchboxes","Schedule pediatrician/dental check-ups if needed"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 2
  );
END $$;

-- ── Verification queries ────────────────────────────────────────────────────────
-- Run these after migration to confirm expected state:

-- SELECT count(*) FROM guide_categories WHERE guide_slug = 'family-resource-guide';
-- expect non-zero (count of migrated categories)

-- SELECT count(*) FROM guide_categories WHERE guide_slug = 'newcomer-guide';
-- expect 0

-- SELECT hero_image_url FROM guide_meta WHERE guide_slug = 'family-resource-guide';
-- expect NULL

-- SELECT count(*) FROM guide_meta WHERE guide_slug = 'summer-fun-guide';
-- expect 1

-- SELECT count(*) FROM guide_start_cards WHERE guide_slug = 'summer-fun-guide';
-- expect 3

-- SELECT count(*) FROM guide_playbook_sections WHERE guide_slug = 'summer-fun-guide';
-- expect 1

-- SELECT count(*) FROM guide_playbook_items WHERE playbook_section_id IN (
--   SELECT id FROM guide_playbook_sections WHERE guide_slug = 'summer-fun-guide'
-- );
-- expect 3
