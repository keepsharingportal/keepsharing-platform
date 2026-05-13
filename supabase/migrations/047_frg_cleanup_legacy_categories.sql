-- Migration 047: Remove legacy guide_categories rows from the newcomer-guide era
-- Migration 044 renamed all guide_slug = 'newcomer-guide' rows to 'family-resource-guide'.
-- Those rows carried pre-V1 parent_group values no longer part of the approved taxonomy:
--   Schools, Pediatric Care, Healthcare, Faith Communities, Family Activities,
--   Community & Connection, Day Trips & Family Getaways, Family Shopping,
--   Date Nights & Adult Time, Mom Self-Care, Senior & Multi-Generational.
--
-- Schema reality: guide_listings uses guide_listings.category TEXT (not category_id).
-- The frontend matches a listing to a category via normalizeForMatch(), which is:
--   regexp_replace(lower(trim(value)), '[^a-z0-9]+', '-', 'g')  → strip leading/trailing hyphens
-- A listing references a category if its normalized category TEXT matches either:
--   normalizeForMatch(guide_categories.name)  OR  guide_categories.slug
--
-- The DELETE guard uses the same text-based logic so no referenced category is removed.
-- Idempotent: safe to re-run. The frontend already filters by V1 parent_groups as a
-- safety net; this migration cleans the DB itself for admin tooling and future reporting.

-- ── Helper: normalize a text value the same way the frontend does ──────────────
-- normalizeForMatch(s) = lower(trim(s)) → replace non-alphanumeric runs with '-'
--                        → strip leading/trailing hyphens
-- Defined once here as an inline expression so we don't need a function.

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 1 — PREVIEW: run this SELECT first to see exactly what will be deleted.
--          Copy/paste it into the SQL editor and review before running STEP 2.
-- ══════════════════════════════════════════════════════════════════════════════

SELECT
  gc.id,
  gc.parent_group,
  gc.name,
  gc.slug,
  gc.display_order
FROM guide_categories gc
WHERE gc.guide_slug = 'family-resource-guide'
  AND (
    gc.parent_group IS NULL
    OR gc.parent_group NOT IN (
      'Schools & Learning',
      'Childcare',
      'Pediatric & Family Healthcare',
      'Things To Do',
      'Family Getaways',
      'Food & Dining',
      'Community & Faith',
      'Mom Life',
      'Family Services',
      'Shopping',
      'Sports & Recreation'
    )
  )
  -- Safety: exclude any category still referenced by a guide_listings row
  -- via the same text-matching logic the frontend uses.
  AND NOT EXISTS (
    SELECT 1
    FROM guide_listings gl
    WHERE gl.category IS NOT NULL
      AND (
        -- Match on normalized name: normalizeForMatch(gl.category) = normalizeForMatch(gc.name)
        regexp_replace(
          regexp_replace(lower(trim(gl.category)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        =
        regexp_replace(
          regexp_replace(lower(trim(gc.name)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        OR
        -- Match on slug: normalizeForMatch(gl.category) = gc.slug
        regexp_replace(
          regexp_replace(lower(trim(gl.category)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        = gc.slug
      )
  )
ORDER BY gc.display_order;

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 2 — DELETE: only run after reviewing the STEP 1 preview above.
--          The WHERE clause is identical to the SELECT above.
-- ══════════════════════════════════════════════════════════════════════════════

DELETE FROM guide_categories gc
WHERE gc.guide_slug = 'family-resource-guide'
  AND (
    gc.parent_group IS NULL
    OR gc.parent_group NOT IN (
      'Schools & Learning',
      'Childcare',
      'Pediatric & Family Healthcare',
      'Things To Do',
      'Family Getaways',
      'Food & Dining',
      'Community & Faith',
      'Mom Life',
      'Family Services',
      'Shopping',
      'Sports & Recreation'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM guide_listings gl
    WHERE gl.category IS NOT NULL
      AND (
        regexp_replace(
          regexp_replace(lower(trim(gl.category)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        =
        regexp_replace(
          regexp_replace(lower(trim(gc.name)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        OR
        regexp_replace(
          regexp_replace(lower(trim(gl.category)), '[^a-z0-9]+', '-', 'g'),
          '^-+|-+$', '', 'g'
        )
        = gc.slug
      )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFICATION: run after DELETE to confirm clean state.
-- ══════════════════════════════════════════════════════════════════════════════

-- 3a. Confirm only V1 parent_groups remain:
SELECT DISTINCT parent_group
FROM guide_categories
WHERE guide_slug = 'family-resource-guide'
ORDER BY 1;
-- expect exactly 11 rows:
--   Childcare | Community & Faith | Family Getaways | Family Services |
--   Food & Dining | Mom Life | Pediatric & Family Healthcare |
--   Schools & Learning | Shopping | Sports & Recreation | Things To Do

-- 3b. Confirm total row count:
SELECT COUNT(*) FROM guide_categories WHERE guide_slug = 'family-resource-guide';
-- expect 28 (the V1 rows seeded by migration 045)

-- 3c. Confirm zero legacy rows remain:
SELECT COUNT(*) FROM guide_categories
WHERE guide_slug = 'family-resource-guide'
  AND (
    parent_group IS NULL
    OR parent_group NOT IN (
      'Schools & Learning','Childcare','Pediatric & Family Healthcare',
      'Things To Do','Family Getaways','Food & Dining','Community & Faith',
      'Mom Life','Family Services','Shopping','Sports & Recreation'
    )
  );
-- expect 0
