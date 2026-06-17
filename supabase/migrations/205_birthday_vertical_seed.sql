-- 205_birthday_vertical_seed.sql
--
-- Seeds a 'birthday-bash' vertical row so the public portal's hero
-- becomes editor-managed via /admin/verticals/birthday-bash/edit
-- (same pattern as the FRG, School Zone, Mom Knows Best). Editor can
-- upload the hero image without touching code.
--
-- Idempotent: only inserts if the row doesn't already exist.

INSERT INTO verticals (slug, display_name, subtitle, description, kind, sponsor_label, is_active, display_order)
SELECT
  'birthday-bash',
  'The Big Birthday Bash',
  'The Ultimate Birthday Planning Portal',
  'Every venue, vendor, theme and tip for planning your kid''s birthday in the River Region. Local moms have tested every one.',
  'topic',
  'Proudly Presented By',
  TRUE,
  20
WHERE NOT EXISTS (
  SELECT 1 FROM verticals WHERE slug = 'birthday-bash'
);
