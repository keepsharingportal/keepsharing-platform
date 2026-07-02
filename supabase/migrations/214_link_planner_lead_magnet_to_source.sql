-- 214_link_planner_lead_magnet_to_source.sql
--
-- The seeded "Big Birthday Bash Planner" lead magnet row (migration 206,
-- carried over to the unified lead_magnets table in migration 208) was
-- created before the `source` column existed. Result: source IS NULL,
-- and the /api/birthday/subscribe endpoint's lookup
-- (WHERE brand_slug=X AND source=Y) never matches — signups save fine
-- but no PDF email fires and no GHL sync happens.
--
-- Link the planner row to the Planning Timeline form's source value so
-- the pipeline is wired end-to-end. Idempotent: only fills NULL and
-- only touches the RRP planner row.

BEGIN;

UPDATE lead_magnets
   SET source     = 'timeline-checklist',
       updated_at = NOW()
 WHERE brand_slug = 'rrp'
   AND slug       = 'planner'
   AND source IS NULL;

COMMIT;

-- Sanity check after apply:
-- SELECT slug, source, file_url IS NOT NULL AS has_file, is_active
--   FROM lead_magnets
--  WHERE brand_slug='rrp' AND slug='planner';
-- Expected: source='timeline-checklist', is_active=true. file_url set once
-- the editor uploads the PDF via /admin/lead-magnets.
