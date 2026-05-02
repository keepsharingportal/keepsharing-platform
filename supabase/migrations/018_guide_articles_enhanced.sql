-- Migration 018: Enhanced guide_articles with pull quotes, featured partners, read time
-- Run after migration 016 and 017.
-- Updates the 5 existing guide_articles with full content and adds subtitle/pull_quotes columns.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS subtitle              TEXT,
  ADD COLUMN IF NOT EXISTS pull_quotes           JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS featured_partners_ref TEXT[],
  ADD COLUMN IF NOT EXISTS read_time_minutes     INT;

-- Update article 1: First 30 Days
UPDATE guide_articles SET
  subtitle = 'What to know, where to go, and how to actually feel at home',
  read_time_minutes = 6,
  pull_quotes = '["By week three, you''ll know whether you''re a Pike Road family or a Wynlakes family. Trust that signal.", "The fastest way to feel at home: pick one Saturday-morning spot and go three weeks in a row."]'
WHERE slug = 'your-first-30-days-in-the-river-region'
  AND guide_slug = 'newcomer-guide';

-- Update article 2: Choosing a School
UPDATE guide_articles SET
  subtitle = 'The five questions that matter more than the marketing',
  read_time_minutes = 7,
  pull_quotes = '["Test scores tell you about the families. The teachers tell you about the school.", "If your child''s name isn''t said three times during a tour, the school doesn''t know them yet."]'
WHERE slug = 'choosing-the-right-school-district'
  AND guide_slug = 'newcomer-guide';

-- Update article 3: Pediatric Care
UPDATE guide_articles SET
  subtitle = 'Pediatricians, dentists, and the specialists you''ll meet eventually',
  read_time_minutes = 6,
  pull_quotes = '["The right pediatrician is the one who answers the phone at 2am — or has a partner who does.", "Don''t choose a pediatric dentist for the first cleaning. Choose for the cavity that''s coming."]'
WHERE slug = 'establishing-pediatric-care'
  AND guide_slug = 'newcomer-guide';

-- Update article 4: Finding Your People
UPDATE guide_articles SET
  subtitle = 'Because the hardest part of moving isn''t the logistics — it''s the loneliness',
  read_time_minutes = 5,
  pull_quotes = '["Your people are already here. You just don''t know their names yet.", "The fastest way to find your community: show up to the same thing three weeks in a row."]'
WHERE slug = 'where-to-find-your-people'
  AND guide_slug = 'newcomer-guide';

-- Update article 5: Saturday Mornings
UPDATE guide_articles SET
  subtitle = 'From the obvious to the hidden — the rituals that turn into family memory',
  read_time_minutes = 5,
  pull_quotes = '["The best Saturdays in the River Region aren''t planned. They evolve.", "Every family ends up with a spot. The Riverwalk. Sweet Creek. A park no one else seems to know about. You''ll find yours."]'
WHERE slug = 'where-locals-take-their-kids-on-saturday'
  AND guide_slug = 'newcomer-guide';
