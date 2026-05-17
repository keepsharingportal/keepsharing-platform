-- 073_student_spotlight_fields.sql
--
-- Until now, "School Bits" articles parsed school name and region out of
-- the body text and editorial_notes via regex. That's fragile and makes
-- the public site impossible to filter cleanly. This adds proper columns
-- so individual student spotlights can be submitted, filtered, and
-- routed by school + region without parser tricks.

alter table public.guide_articles
  add column if not exists school_name   text,
  add column if not exists school_region text;

comment on column public.guide_articles.school_name is
  'Name of the school the spotlight is from (e.g. "Macon East Academy"). Free-text but kept consistent via the submission form dropdown.';

comment on column public.guide_articles.school_region is
  'School region for filtering: montgomery-county, autauga-prattville, pike-road, elmore-county, private-schools, other. Mirrors the existing editorial_notes "School region: X" tagging but as a proper column.';

create index if not exists idx_guide_articles_school_region
  on public.guide_articles (school_region)
  where school_region is not null;

create index if not exists idx_guide_articles_school_name
  on public.guide_articles (school_name)
  where school_name is not null;

-- Backfill from the existing editorial_notes "School region: X" pattern
-- so historical school-bits articles get the region column populated.
update public.guide_articles
   set school_region = lower(substring(editorial_notes from 'School region:\s*([a-zA-Z-]+)'))
 where school_region is null
   and editorial_notes ~* 'School region:\s*[a-zA-Z-]+';
