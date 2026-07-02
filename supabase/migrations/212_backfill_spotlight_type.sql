-- 212_backfill_spotlight_type.sql
--
-- Backfill spotlight_type on the three single-type community spotlight
-- columns. Editors keep forgetting to set the field when creating new
-- articles, and every unset article falls through to the plain "column"
-- render instead of the branded magazine layout (Grands wordmark hero,
-- snapshot card, "Grand Story" Q&A, Family Moments gallery, etc.).
--
-- The public render at /columns/[column]/[slug] now defaults
-- spotlight_type from the column when it's null (see
-- defaultSpotlightTypeForColumn in spotlight-templates.ts) — this
-- migration writes the same default into the DB so:
--   1. The admin editor loads the right value into the dropdown.
--   2. The DB reflects the truth (no more "why is this null in
--      Supabase but branded on the site" confusion).
--   3. Any future report/query that filters on spotlight_type works.
--
-- Play Ball is intentionally excluded — it carries three valid
-- spotlight_types (athlete/coach/volunteer) and the editor genuinely
-- must choose.

UPDATE guide_articles
   SET spotlight_type = 'grand',
       updated_at     = NOW()
 WHERE column_slug    = 'grands-greatest'
   AND spotlight_type IS NULL;

UPDATE guide_articles
   SET spotlight_type = 'teacher',
       updated_at     = NOW()
 WHERE column_slug    = 'teacher-of-month'
   AND spotlight_type IS NULL;

UPDATE guide_articles
   SET spotlight_type = 'mom',
       updated_at     = NOW()
 WHERE column_slug    = 'mom-to-mom'
   AND spotlight_type IS NULL;
