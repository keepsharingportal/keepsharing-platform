-- 216_seed_education_matters_superintendents.sql
--
-- Move the Education Matters superintendents into the editor-managed
-- seo_authors table so bios + headshots + titles can be updated at
-- /admin/seo/authors without a code push.
--
-- One row per superintendent (4 districts). The Education Matters
-- layout looks these up by author_slug (matched via districts.ts's
-- superintendentAuthorSlug field) and prefers the DB row over the
-- code-embedded fallback.
--
-- Pike Road's Dr. Jason Goodwin has real bio content. The three
-- others carry placeholder rows the editor updates in the admin
-- as soon as we get their names + bios.
--
-- Idempotent — INSERT ... ON CONFLICT DO NOTHING preserves any
-- edits the admin has already made.

INSERT INTO seo_authors (author_slug, display_name, bio, job_title, primary_brand_slug)
VALUES
  (
    'jason-goodwin',
    'Dr. Jason Goodwin',
    'Dr. Jason Goodwin is the Superintendent of Pike Road Schools and has dedicated his career to serving students as a teacher, coach, principal, and district leader. He believes great schools are built on strong relationships, high expectations, and a shared commitment to excellence, with every decision focused on what is best for students.',
    'Superintendent, Pike Road Schools',
    'rrp'
  ),
  (
    'montgomery-superintendent',
    'Superintendent Name',
    'Placeholder bio — update at /admin/seo/authors/montgomery-superintendent once we have the Montgomery Public Schools superintendent''s real bio and headshot.',
    'Superintendent, Montgomery Public Schools',
    'rrp'
  ),
  (
    'elmore-superintendent',
    'Superintendent Name',
    'Placeholder bio — update at /admin/seo/authors/elmore-superintendent once we have the Elmore County Schools superintendent''s real bio and headshot.',
    'Superintendent, Elmore County Schools',
    'rrp'
  ),
  (
    'autauga-superintendent',
    'Superintendent Name',
    'Placeholder bio — update at /admin/seo/authors/autauga-superintendent once we have the Autauga County Schools superintendent''s real bio and headshot.',
    'Superintendent, Autauga County Schools',
    'rrp'
  )
ON CONFLICT (author_slug) DO NOTHING;
