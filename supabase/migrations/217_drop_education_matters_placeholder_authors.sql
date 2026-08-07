-- 217_drop_education_matters_placeholder_authors.sql
--
-- Migration 216 seeded 4 placeholder seo_authors rows so the layout had
-- SOMETHING to render before the real superintendent bios landed. The
-- editor has since:
--   - created real rows for Montgomery (zickeyous-byrd) and Elmore
--     (richard-dennis)
--   - edited the seeded autauga-superintendent row in place to hold
--     Lyman Woodfin's real content (kept as-is; slug is admin-only)
--   - already had the real Pike Road row (jason-goodwin, from 216)
--
-- districts.ts now points at the correct author slugs. Drop the two
-- stale placeholder rows (montgomery-superintendent, elmore-superintendent)
-- so the admin authors list only shows real people.
--
-- Safe to re-run: nothing references these slugs after districts.ts is
-- deployed, and DELETE is idempotent.

DELETE FROM seo_authors
WHERE author_slug IN (
  'montgomery-superintendent',
  'elmore-superintendent'
);
