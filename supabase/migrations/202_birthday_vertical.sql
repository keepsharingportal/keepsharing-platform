-- 202_birthday_vertical.sql
--
-- Data layer for "The Big Birthday Bash" — the Ultimate Planning Portal
-- replacing the generic /birthday-party-guide template. Tables here
-- power the editor-managed blocks on that page; existing tables
-- (guide_listings, guide_articles, weekly_polls, ad_placements) cover
-- the rest.
--
-- All tables are brand-scoped so other publications (Auburn Opelika
-- Parents, Mobile Bay, etc.) can stand up their own birthday portals
-- with their own freebies/themes/printables when ready.

-- ── birthday_themes ────────────────────────────────────────────
-- The "Trending Themes" gallery. Editor curates 6-9; page filters by
-- age band + indoor/outdoor.
CREATE TABLE IF NOT EXISTS birthday_themes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug    TEXT,                              -- NULL = visible on every brand's portal
  name          TEXT NOT NULL,                     -- "Dinosaur Dig", "Glow in the Dark"
  blurb         TEXT NOT NULL,                     -- 1-line description
  image_url     TEXT,
  min_age       INT  NOT NULL DEFAULT 2,
  max_age       INT  NOT NULL DEFAULT 14,
  is_indoor     BOOLEAN NOT NULL DEFAULT TRUE,
  is_outdoor    BOOLEAN NOT NULL DEFAULT TRUE,
  budget_tier   TEXT CHECK (budget_tier IN ('budget','mid','premium', NULL)),
  vendor_ids    UUID[] DEFAULT ARRAY[]::UUID[],    -- advertiser_accounts.id list of fitting vendors
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_birthday_themes_active_brand
  ON birthday_themes (is_active, brand_slug, display_order);

-- ── birthday_budget_tiers ──────────────────────────────────────
-- The "Plan by Budget" recommendations — the killer feature. Editor
-- defines 3 tiers per brand (or universal); each has a price ceiling,
-- guest count, and a list of vendor picks for venue/cake/decor/etc.
CREATE TABLE IF NOT EXISTS birthday_budget_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT,
  tier_key        TEXT NOT NULL,                   -- 'backyard' | 'sweet-spot' | 'showstopper'
  name            TEXT NOT NULL,                   -- "The Backyard Birthday"
  price_ceiling   INT  NOT NULL,                   -- 150, 400, 1000+
  guest_count     TEXT NOT NULL,                   -- "8-10 kids"
  pitch           TEXT NOT NULL,                   -- 1-sentence "what this gets you"
  picks           JSONB NOT NULL DEFAULT '[]',     -- [{role:"venue",vendor_id:uuid,note:"..."}, ...]
  hero_image_url  TEXT,
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_slug, tier_key)
);
CREATE INDEX IF NOT EXISTS idx_birthday_budget_tiers_brand
  ON birthday_budget_tiers (is_active, brand_slug, display_order);

-- ── birthday_freebies ──────────────────────────────────────────
-- The "20+ River Region birthday freebies" list — lead-magnet SEO
-- darling. Editor maintains; page renders sorted by category, search
-- accessible.
CREATE TABLE IF NOT EXISTS birthday_freebies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT,
  business     TEXT NOT NULL,                      -- "Bruster's Ice Cream"
  category     TEXT NOT NULL,                      -- 'food','dessert','entertainment','retail'
  offer        TEXT NOT NULL,                      -- "Free baby cone for kids under 40 lbs"
  details      TEXT,                               -- fine print, ID requirements
  website      TEXT,
  age_limit    INT,                                -- 12 = "kids under 12 free"
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,     -- editor confirmed in last 90 days
  verified_at  TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_birthday_freebies_active_brand
  ON birthday_freebies (is_active, brand_slug, category);

-- ── birthday_printables ────────────────────────────────────────
-- Downloadable printable templates: invitations, thank-you notes,
-- goody bag tags, party schedules, banners. Editor uploads file URL.
CREATE TABLE IF NOT EXISTS birthday_printables (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT,
  name         TEXT NOT NULL,                      -- "Super Hero Invites"
  category     TEXT NOT NULL CHECK (category IN ('invitation','thank-you','tag','schedule','banner','sign')),
  description  TEXT,
  file_url     TEXT NOT NULL,                      -- PDF/PNG asset URL
  preview_url  TEXT,                               -- thumbnail
  is_premium   BOOLEAN NOT NULL DEFAULT FALSE,     -- requires email capture
  download_count INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_birthday_printables_active_brand
  ON birthday_printables (is_active, brand_slug, category, display_order);

-- ── birthday_real_parties ──────────────────────────────────────
-- "Real River Region Parties" UGC photo wall. Local moms submit
-- party photos; editor approves before they go live on the wall.
CREATE TABLE IF NOT EXISTS birthday_real_parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT NOT NULL DEFAULT 'rrp',
  submitter_name  TEXT,                            -- mom's first name
  submitter_email TEXT,                            -- for follow-up only, not displayed
  child_name      TEXT,                            -- "Eli"
  child_age       INT,                             -- 4
  party_theme     TEXT,                            -- "Dinosaur Dig"
  venue           TEXT,                            -- "Snapology" — could later become FK to advertiser_accounts
  vendor_credits  TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ["Snapology", "Bruster's"]
  caption         TEXT NOT NULL,                   -- mom's words
  photo_url       TEXT NOT NULL,
  party_month     INT,                             -- 1-12
  party_year      INT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  display_order   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_birthday_real_parties_status_brand
  ON birthday_real_parties (status, brand_slug, display_order DESC);

-- ── birthday_mom_tips ──────────────────────────────────────────
-- "Mom-to-Mom Tips" — short quoted advice from local moms. Like
-- quote_bank but birthday-specific, with attribution.
CREATE TABLE IF NOT EXISTS birthday_mom_tips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug    TEXT,
  tip           TEXT NOT NULL,
  mom_name      TEXT NOT NULL,                    -- "Sarah, Pike Road mom of 3"
  topic         TEXT,                              -- 'budget' | 'venue' | 'guest-list' | 'food' | ...
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_birthday_mom_tips_active_brand
  ON birthday_mom_tips (is_active, brand_slug, display_order);

-- ── birthday_planning_subscribers ──────────────────────────────
-- Email captures from the planning timeline + freebies CTAs. Drives
-- a drip: 6-week, 4-week, 2-week, week-of reminders + freebie PDF
-- on signup.
CREATE TABLE IF NOT EXISTS birthday_planning_subscribers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug     TEXT NOT NULL DEFAULT 'rrp',
  email          TEXT NOT NULL,
  child_first_name TEXT,
  party_date     DATE,                             -- so drips fire at the right intervals
  source         TEXT,                             -- 'timeline-checklist' | 'freebies' | 'newsletter'
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_slug, email, source)
);
CREATE INDEX IF NOT EXISTS idx_birthday_subscribers_party_date
  ON birthday_planning_subscribers (party_date) WHERE is_active = TRUE;

-- ── COMMENTS ───────────────────────────────────────────────────
COMMENT ON TABLE birthday_themes IS
  'Trending Themes gallery on /birthday-party-guide. Editor-curated 6-9 themes with age range, indoor/outdoor flag, suggested local vendors.';
COMMENT ON TABLE birthday_budget_tiers IS
  'Three-tier "Plan by Budget" recommendations — the differentiator vs generic guides. Each tier has a price ceiling + real local vendor picks. JSONB picks holds [{role,vendor_id,note}].';
COMMENT ON TABLE birthday_freebies IS
  'Local birthday freebie offers — businesses that give kids free stuff on their birthday. Lead magnet + local SEO.';
COMMENT ON TABLE birthday_printables IS
  'Downloadable invitation/thank-you/banner templates. is_premium = email capture required before download.';
COMMENT ON TABLE birthday_real_parties IS
  'UGC photo wall from local moms. Editor-moderated submissions; status flips to approved before public display.';
COMMENT ON TABLE birthday_mom_tips IS
  'Short quoted birthday advice from local moms — populates the Mom-to-Mom Tips block.';
COMMENT ON TABLE birthday_planning_subscribers IS
  'Email captures from timeline + freebies + newsletter CTAs. party_date enables time-anchored drips (6wk/4wk/2wk/week-of).';
