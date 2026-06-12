-- ── Fifty-Plus content taxonomy + Video Hub seeds ────────────────────────
--
-- Three changes to support the new River Region 50+ template:
--
--   1. video_url on guide_articles — the 50+ homepage has a top-nav
--      "Videos" surface that pulls articles flagged with a video URL.
--      Cheaper + simpler than a separate videos table for v1; if the
--      Video Hub grows beyond one URL per article we'll split it then.
--
--   2. New column_slug values seeded for the 50+ template's homepage
--      blocks. We don't enforce them in a FK because guide_articles
--      column_slug is free-text (lots of legacy slugs), but we record
--      them in a lookup table the admin Section selector reads.
--
--   3. video_thumbnail_url + video_duration_seconds for the Video Hub
--      tile rendering (don't make Next/Image try to oEmbed YouTube
--      every render — store the thumbnail explicitly).

-- ── 1. Article video fields ──────────────────────────────────────────────
ALTER TABLE guide_articles
  -- The canonical video URL (YouTube, Vimeo, or direct .mp4). When set,
  -- the article surfaces in the 50+ Video Hub + a video player renders
  -- above the article body. NULL = no video.
  ADD COLUMN IF NOT EXISTS video_url               TEXT NULL,
  -- Thumbnail image for the video. Falls back to hero_image_url if NULL.
  ADD COLUMN IF NOT EXISTS video_thumbnail_url     TEXT NULL,
  -- Duration in seconds — shown as "12:34" on tiles. NULL = hidden.
  ADD COLUMN IF NOT EXISTS video_duration_seconds  INTEGER NULL;

COMMENT ON COLUMN guide_articles.video_url IS
  'Canonical video URL (YouTube/Vimeo/direct). When set, article appears in the 50+ Video Hub.';

CREATE INDEX IF NOT EXISTS idx_guide_articles_video
  ON guide_articles (brand_slug, published_at DESC)
  WHERE video_url IS NOT NULL AND published = true;

-- ── 2. Section / column_slug lookup ──────────────────────────────────────
-- A tiny lookup table the admin Section selector + the 50+ homepage
-- queries read from. Free-text column_slug stays the storage on
-- guide_articles, but admin code only OFFERS these as choices for 50+
-- brands. Adding/removing entries is a config change, not a code change.
CREATE TABLE IF NOT EXISTS fifty_plus_sections (
  slug          TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  description   TEXT NULL,
  -- Where this section surfaces. 'homepage_block' = dedicated block on
  -- the 50+ home (Local Tails, Neighbor of the Week). 'nav_page' = top
  -- nav item (Escape & Explore, Wellness). 'both' = surfaces in both.
  surface       TEXT NOT NULL CHECK (surface IN ('homepage_block', 'nav_page', 'both')),
  -- Display priority for the admin Section picker; lower = higher.
  display_order INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO fifty_plus_sections (slug, display_name, description, surface, display_order) VALUES
  ('escape-and-explore',    'Escape & Explore',    'Day trips, hidden trails, weekend getaways.',                'both',           10),
  ('wellness',              'Wellness That Works', 'Smart, simple ways to feel your best at 50+.',                'both',           20),
  ('local-tails',           'Local Tails',         'Pet stories from around the River Region.',                  'homepage_block', 30),
  ('neighbor-of-the-week',  'Neighbor of the Week','Community spotlights — the people who make this place home.','homepage_block', 40),
  ('food-worth-sharing',    'Food Worth Sharing',  'Local eats, big flavor.',                                    'nav_page',       50),
  ('purpose-and-connection','Purpose & Connection','Find your people. Make a difference.',                       'nav_page',       60),
  ('legacy-and-impact',     'Legacy & Impact',     'Building a stronger River Region together.',                 'nav_page',       70),
  ('arts-and-culture',      'Arts & Culture',      'Galleries, music, theater, the makers and makers-tables.',   'nav_page',       80),
  ('active-living',         'Active Living',       'Walking groups, pickleball, low-impact fitness.',            'nav_page',       90),
  ('expert-advice',         'Expert Advice',       'Q&A with local pros on health, money, home.',                'nav_page',      100)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE fifty_plus_sections IS
  'Editorial sections the 50+ template admin offers for column_slug. Lookup only — guide_articles.column_slug is still free-text.';

-- ── 3. Brand seed for the legacy magazine_issues (if the table exists) ──
-- The 50+ template surfaces "Read the Current Issue" — point it at rr50plus
-- so the existing market filter works.
DO $$ BEGIN
  UPDATE magazine_issues SET market = 'rr50plus' WHERE market = 'boom';
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
