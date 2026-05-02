-- Migration 030: URL slugs for guide types + rename Newcomer → Family Resource Guide

ALTER TABLE guide_types
ADD COLUMN IF NOT EXISTS url_slug TEXT,
ADD COLUMN IF NOT EXISTS pitch TEXT;

UPDATE guide_types SET url_slug = 'family-resource-guide' WHERE slug = 'newcomer';
UPDATE guide_types SET url_slug = 'private-school-guide'  WHERE slug = 'private-school';
UPDATE guide_types SET url_slug = 'summer-camp-guide'     WHERE slug = 'summer-camp';
UPDATE guide_types SET url_slug = 'childcare-guide'       WHERE slug = 'childcare';
UPDATE guide_types SET url_slug = 'healthy-kids-guide'    WHERE slug = 'healthy-kids';
UPDATE guide_types SET url_slug = 'summer-fun-guide'      WHERE slug = 'summer-fun';
UPDATE guide_types SET url_slug = 'birthday-party-guide'  WHERE slug = 'birthday-party';
UPDATE guide_types SET url_slug = 'afterschool-guide'     WHERE slug = 'afterschool';
UPDATE guide_types SET url_slug = 'special-needs-guide'   WHERE slug = 'special-needs';

-- Rename Newcomer Guide → Family Resource Guide
UPDATE guide_types SET
  display_name      = 'Family Resource Guide',
  short_description = 'For families new to the River Region — and anyone who wants to know it better',
  hub_intro_paragraph = 'Whether you''re fresh to the River Region or you''ve lived here forever, this is the guide for finding the local rhythms only insiders know. Schools, doctors, neighborhoods, where to take cousins visiting from out of town — start here.'
WHERE slug = 'newcomer';

-- Marketing pitches for GuideShowcase component
UPDATE guide_types SET pitch =
  'New here? This is your map. Schools, pediatricians, neighborhood vibes, the festivals worth driving to, the parks worth bookmarking — everything moms wish someone had told them in their first month.'
WHERE slug = 'newcomer';

UPDATE guide_types SET pitch =
  'Choosing a school is one of the biggest decisions families make. Compare every private and parochial school in the River Region side by side — tuition, mission, leadership, what makes each one distinct.'
WHERE slug = 'private-school';

UPDATE guide_types SET pitch =
  'Summer goes faster than you think. Day camps, overnight camps, themed weeks, sports specialties — start here in February so the best slots don''t fill before you choose.'
WHERE slug = 'summer-camp';

UPDATE guide_types SET pitch =
  'Finding childcare you trust takes time and good information. Compare hours, ratios, philosophies, meals, and what each center actually does best — research we''ve done so you don''t have to.'
WHERE slug = 'childcare';

UPDATE guide_types SET pitch =
  'From first dental visits to specialty referrals — pediatric care that fits your family. Providers across the River Region serving kids from birth through teens, with the details parents actually need.'
WHERE slug = 'healthy-kids';

UPDATE guide_types SET pitch =
  'When school lets out, the boredom kicks in. Festivals, classes, splash pads, art camps, sports clinics, lazy afternoon ideas — everything to keep summer feeling like summer.'
WHERE slug = 'summer-fun';

UPDATE guide_types SET pitch =
  'From toddler bashes to teen celebrations — venues, entertainers, cake artists, and party rentals that make hosting easier and the day unforgettable.'
WHERE slug = 'birthday-party';

UPDATE guide_types SET pitch =
  'After the bell rings, the real learning starts. Programs and activities that fill the afternoons with art, sports, science, music, and friendship — for kids of every age and interest.'
WHERE slug = 'afterschool';

UPDATE guide_types SET pitch =
  'A trusted directory of resources, providers, and organizations supporting families across the River Region. Real local connections, not just a list of phone numbers.'
WHERE slug = 'special-needs';
