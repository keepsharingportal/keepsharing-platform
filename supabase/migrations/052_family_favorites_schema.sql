-- ─────────────────────────────────────────────────────────────────────────────
-- 052: Family Favorites ecosystem schema
-- Annual community recognition program — nominations, voting, winners, sponsors.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ff_seasons ────────────────────────────────────────────────────────────────
-- One row per annual Family Favorites cycle. Only one can be `is_active = true`.

CREATE TABLE IF NOT EXISTS ff_seasons (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year                  INTEGER NOT NULL,
  name                  TEXT    NOT NULL,         -- "2026 River Region Parents Family Favorites"
  tagline               TEXT,                     -- "Chosen by the community. Celebrated by the city."
  status                TEXT    NOT NULL DEFAULT 'planning'
    CONSTRAINT ff_seasons_status_check
    CHECK (status IN (
      'planning',           -- admin configuring the season, not visible
      'nominations',        -- community nomination window is open
      'finalist-review',    -- editorial team reviewing nominations
      'voting',             -- community voting window is open
      'announcing',         -- winners being revealed
      'complete'            -- season archived
    )),
  nomination_opens_at   TIMESTAMPTZ,
  nomination_closes_at  TIMESTAMPTZ,
  finalist_announced_at TIMESTAMPTZ,
  voting_opens_at       TIMESTAMPTZ,
  voting_closes_at      TIMESTAMPTZ,
  winners_announced_at  TIMESTAMPTZ,
  print_issue_date      DATE,
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year)
);

-- Enforce single active season
CREATE UNIQUE INDEX IF NOT EXISTS ff_seasons_one_active_idx
  ON ff_seasons (is_active) WHERE is_active = true;

COMMENT ON TABLE ff_seasons IS
  'One row per annual Family Favorites cycle. '
  'Only one season can be is_active=true at a time (enforced by unique partial index). '
  'Status drives what the public page shows.';

-- ── ff_categories ─────────────────────────────────────────────────────────────
-- Award categories — global, not per-season. Same categories used each year.
-- A category can be deactivated without deleting historical data.

CREATE TABLE IF NOT EXISTS ff_categories (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  group_name      TEXT    NOT NULL, -- "Family Health & Wellness", "Education & Childcare", etc.
  group_slug      TEXT    NOT NULL, -- kebab-case of group_name
  description     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  finalist_limit  INTEGER NOT NULL DEFAULT 5,   -- max finalists per category
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ff_categories_group_idx
  ON ff_categories (group_slug, display_order);

COMMENT ON TABLE ff_categories IS
  'Award categories. Global — same set used across all seasons. '
  'Deactivate to hide from a season without deleting history. '
  'finalist_limit controls how many nominations the editorial team promotes.';

-- ── ff_nominations ────────────────────────────────────────────────────────────
-- Community-submitted nominations during the nomination window.

CREATE TABLE IF NOT EXISTS ff_nominations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id         UUID NOT NULL REFERENCES ff_seasons(id)    ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES ff_categories(id) ON DELETE CASCADE,

  -- Business info (what is being nominated)
  business_name     TEXT NOT NULL,
  business_website  TEXT,
  business_phone    TEXT,
  business_location TEXT,
  nominee_reason    TEXT,     -- "Why do you love them?" — optional but encouraged

  -- Nominator info (who submitted this)
  nominator_name    TEXT NOT NULL,
  nominator_email   TEXT NOT NULL,
  nominator_phone   TEXT,

  -- Moderation
  status            TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT ff_nominations_status_check
    CHECK (status IN (
      'pending',      -- submitted, not yet reviewed
      'approved',     -- reviewed, visible in finalists pool
      'finalist',     -- selected as finalist — appears on voting ballot
      'winner',       -- won their category
      'rejected',     -- removed (duplicate, fake, inappropriate)
      'duplicate'     -- same business was nominated multiple times — merged
    )),
  moderator_notes   TEXT,    -- internal notes
  vote_count        INTEGER NOT NULL DEFAULT 0, -- cached from ff_votes

  -- Fraud detection
  submitter_ip      INET,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ff_nominations_season_cat_idx
  ON ff_nominations (season_id, category_id, status);
CREATE INDEX IF NOT EXISTS ff_nominations_email_idx
  ON ff_nominations (nominator_email);
CREATE INDEX IF NOT EXISTS ff_nominations_business_idx
  ON ff_nominations (season_id, lower(business_name));

COMMENT ON TABLE ff_nominations IS
  'Community-submitted nominations. '
  'One business may be nominated many times per category — editorial team deduplicates. '
  'vote_count is a cached aggregate updated when votes are cast.';

-- ── ff_votes ──────────────────────────────────────────────────────────────────
-- Votes cast during the community voting window.
-- One valid vote per email per category per season.

CREATE TABLE IF NOT EXISTS ff_votes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id       UUID NOT NULL REFERENCES ff_seasons(id)       ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES ff_categories(id)    ON DELETE CASCADE,
  nomination_id   UUID NOT NULL REFERENCES ff_nominations(id)   ON DELETE CASCADE,

  voter_name      TEXT NOT NULL,
  voter_email     TEXT NOT NULL,
  voter_ip        INET,

  is_valid        BOOLEAN NOT NULL DEFAULT true,
  invalidation_reason TEXT,    -- set when operator flags as suspicious

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce one valid vote per voter email per category per season
CREATE UNIQUE INDEX IF NOT EXISTS ff_votes_one_per_voter_idx
  ON ff_votes (season_id, category_id, lower(voter_email))
  WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS ff_votes_nomination_idx ON ff_votes (nomination_id);
CREATE INDEX IF NOT EXISTS ff_votes_ip_idx         ON ff_votes (voter_ip, season_id);

COMMENT ON TABLE ff_votes IS
  'Community votes cast during the voting window. '
  'Unique partial index enforces one valid vote per email per category per season. '
  'Operators can invalidate suspicious votes (is_valid=false) without deleting them.';

-- ── ff_category_sponsors ─────────────────────────────────────────────────────
-- Sponsor placements for Family Favorites. Sponsors amplify — they do not select winners.

CREATE TABLE IF NOT EXISTS ff_category_sponsors (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id             UUID NOT NULL REFERENCES ff_seasons(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES ff_categories(id),    -- NULL = ecosystem-level sponsor
  advertiser_account_id TEXT,    -- references advertiser_accounts.id
  tier                  TEXT NOT NULL DEFAULT 'category'
    CONSTRAINT ff_sponsors_tier_check
    CHECK (tier IN (
      'category',         -- sponsor of a specific award category
      'voting-week',      -- cross-category sponsor during voting window
      'finalist-feature', -- featured in finalist announcement content
      'print',            -- print winners issue sponsor
      'ecosystem'         -- overall Family Favorites presenting sponsor
    )),
  display_name          TEXT NOT NULL,
  website_url           TEXT,
  logo_url              TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ff_category_sponsors_season_idx
  ON ff_category_sponsors (season_id, tier, is_active);

COMMENT ON TABLE ff_category_sponsors IS
  'Sponsor placements for Family Favorites. '
  'Sponsors appear alongside categories/voting — they never influence winner selection. '
  'category_id=NULL means ecosystem-level (all categories) sponsor.';

-- ── ff_winners ────────────────────────────────────────────────────────────────
-- Official winners — set by operator after vote counting and editorial review.

CREATE TABLE IF NOT EXISTS ff_winners (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id             UUID NOT NULL REFERENCES ff_seasons(id)       ON DELETE CASCADE,
  category_id           UUID NOT NULL REFERENCES ff_categories(id)    ON DELETE CASCADE,
  nomination_id         UUID NOT NULL REFERENCES ff_nominations(id),

  place                 INTEGER NOT NULL CHECK (place IN (1, 2, 3)),  -- 1st, 2nd, or 3rd
  vote_count_final      INTEGER,    -- final validated vote count

  badge_url             TEXT,       -- digital winner badge image URL
  featured_in_print     BOOLEAN NOT NULL DEFAULT false,
  listing_boost_applied BOOLEAN NOT NULL DEFAULT false,  -- guide listing promotion applied
  social_graphic_url    TEXT,       -- generated social sharing graphic

  announced_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (season_id, category_id, place)
);

COMMENT ON TABLE ff_winners IS
  'Official Family Favorites winners per season and category. '
  'One row per place (1st/2nd/3rd) per category per season. '
  'badge_url and social_graphic_url are set after design team creates winner assets. '
  'listing_boost_applied tracks whether the guide listing has been promoted.';

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORY SEED DATA
-- 30 categories across 7 groups. Active by default.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO ff_categories (name, slug, group_name, group_slug, description, display_order) VALUES

-- GROUP 1: Family Health & Wellness
('Best Pediatric Practice',               'best-pediatric-practice',       'Family Health & Wellness', 'family-health-wellness', 'The pediatric practice River Region families trust most for their children''s care.',                               10),
('Best Pediatric Dentist',                'best-pediatric-dentist',        'Family Health & Wellness', 'family-health-wellness', 'The dental practice families love to bring their kids to — kind, patient, and trusted.',                            20),
('Best Children''s Mental Health Provider','best-childrens-mental-health',  'Family Health & Wellness', 'family-health-wellness', 'Therapists, counselors, and behavioral health providers serving River Region children and families.',               30),
('Best Mom Wellness Experience',          'best-mom-wellness',             'Family Health & Wellness', 'family-health-wellness', 'The spa, studio, yoga, or wellness destination that River Region moms return to again and again.',                  40),

-- GROUP 2: Education & Childcare
('Best Childcare Center',                 'best-childcare-center',         'Education & Childcare',    'education-childcare',    'The childcare center families trust with their youngest — safe, nurturing, and exceptional.',                         110),
('Best Preschool or Pre-K Program',       'best-preschool-prek',           'Education & Childcare',    'education-childcare',    'The early learning program where River Region children begin their education journey.',                               120),
('Best After-School Program',             'best-after-school-program',     'Education & Childcare',    'education-childcare',    'The after-school program families rely on for enrichment, care, and growth.',                                        130),
('Best Private School',                   'best-private-school',           'Education & Childcare',    'education-childcare',    'The private or parochial school that River Region families recommend to every new family.',                           140),
('Best Tutoring or Learning Center',      'best-tutoring-center',          'Education & Childcare',    'education-childcare',    'The tutoring service or learning center helping River Region students reach their potential.',                        150),

-- GROUP 3: Summer & Camps
('Best Summer Day Camp',                  'best-summer-day-camp',          'Summer & Camps',           'summer-camps',           'The day camp River Region families register for first — fun, structured, and trusted.',                               210),
('Best Specialty Camp',                   'best-specialty-camp',           'Summer & Camps',           'summer-camps',           'The themed or specialty camp — arts, sports, STEM, performing arts — that becomes a family tradition.',               220),
('Best Youth Sports Program',             'best-youth-sports',             'Summer & Camps',           'summer-camps',           'The league, team, or training program where River Region kids discover their love of the game.',                      230),
('Best Summer Activity',                  'best-summer-activity',          'Summer & Camps',           'summer-camps',           'The summer destination or experience that becomes a family highlight every year.',                                    240),

-- GROUP 4: Food & Dining
('Best Family Restaurant',                'best-family-restaurant',        'Food & Dining',            'food-dining',            'The local restaurant where River Region families celebrate, gather, and keep coming back.',                            310),
('Best Birthday Cake or Custom Bakery',   'best-birthday-cake-bakery',     'Food & Dining',            'food-dining',            'The baker behind River Region''s most celebrated birthday cakes and custom treats.',                                  320),
('Best Family Café or Coffee Shop',       'best-family-cafe',              'Food & Dining',            'food-dining',            'The café or coffee shop welcoming to families — relaxed, delicious, and community-spirited.',                         330),
('Best Ice Cream or Treat Shop',          'best-ice-cream-treats',         'Food & Dining',            'food-dining',            'The ice cream parlor, shaved ice stand, or treat shop that makes summer sweeter.',                                    340),

-- GROUP 5: Birthday Parties & Celebrations
('Best Birthday Party Venue',             'best-birthday-party-venue',     'Birthday Parties & Celebrations', 'birthday-parties', 'The venue that makes River Region birthdays unforgettable.',                                                         410),
('Best Birthday Entertainment or Performer','best-birthday-entertainment', 'Birthday Parties & Celebrations', 'birthday-parties', 'The face painter, magician, character, or entertainer that transforms any birthday party.',                          420),
('Best Party Planner or Event Coordinator','best-party-planner',           'Birthday Parties & Celebrations', 'birthday-parties', 'The planner behind the most beautiful, stress-free celebrations in the River Region.',                               430),

-- GROUP 6: Shopping & Services
('Best Children''s Boutique',             'best-childrens-boutique',       'Shopping & Services',      'shopping-services',      'The local children''s clothing or gift boutique River Region families love to browse and buy from.',                  510),
('Best Family Photographer',              'best-family-photographer',      'Shopping & Services',      'shopping-services',      'The photographer who captures River Region families'' most treasured moments.',                                        520),
('Best Family-Owned Local Business',      'best-family-owned-business',    'Shopping & Services',      'shopping-services',      'The family-owned business that embodies River Region community values — trusted, local, essential.',                   530),
('Best Family Home Services',             'best-family-home-services',     'Shopping & Services',      'shopping-services',      'The contractor, cleaning service, or home professional River Region families trust and recommend.',                    540),

-- GROUP 7: Local Life & Community
('Best Family Activity or Attraction',    'best-family-attraction',        'Local Life & Community',   'local-life-community',   'The attraction, museum, or venue where River Region families spend weekend time together.',                             610),
('Best Splash Pad, Pool, or Water Experience','best-water-experience',     'Local Life & Community',   'local-life-community',   'The splash pad, pool, or water destination that defines River Region summers.',                                        620),
('Best Outdoor Family Experience',        'best-outdoor-experience',       'Local Life & Community',   'local-life-community',   'The park, trail, nature center, or outdoor adventure where families connect with the River Region.',                   630),
('Best Fitness or Wellness Space',        'best-fitness-wellness-space',   'Local Life & Community',   'local-life-community',   'The gym, studio, or wellness space that welcomes the whole family.',                                                  640),
('Best Farmers Market or Local Food Experience','best-farmers-market',     'Local Life & Community',   'local-life-community',   'The market or local food source that connects River Region families with where their food comes from.',               650),
('Best Family-Friendly Community Event', 'best-community-event',          'Local Life & Community',   'local-life-community',   'The annual event, festival, or gathering that River Region families look forward to all year.',                        660)

ON CONFLICT (slug) DO NOTHING;
