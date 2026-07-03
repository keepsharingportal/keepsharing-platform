-- 215_birthday_hero_subtitle.sql
--
-- The birthday-bash vertical row's subtitle currently reads "The
-- Ultimate Birthday Planning Portal" (or similar early copy) — which
-- duplicated the eyebrow pill above the title. The pill was removed
-- from the hero component; the subtitle gets swapped to a real value
-- proposition line editors can iterate on later at
-- /admin/verticals/birthday-bash/edit.
--
-- Idempotent — only replaces the specific early-copy strings, so
-- editorial overrides survive re-runs.

BEGIN;

UPDATE verticals
   SET subtitle   = 'Plan Your Child''s Next Birthday Celebration',
       updated_at = NOW()
 WHERE slug       = 'birthday-bash'
   AND (
        subtitle IS NULL
     OR subtitle IN (
          'The Ultimate Birthday Planning Portal',
          'The Ultimate Planning Portal',
          'Every venue, vendor, theme and tip for planning your kid''s birthday in the River Region. Local moms have tested every one.'
        )
   );

COMMIT;
