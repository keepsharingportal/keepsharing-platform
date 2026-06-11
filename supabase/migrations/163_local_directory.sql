-- ── Local business + expert directory ─────────────────────────────────────
--
-- A discoverable, brand-scoped directory of local businesses AND experts
-- (pediatricians, music teachers, accountants, school counselors, etc).
-- Independent of advertiser_accounts — a listing here does NOT require the
-- business to be paying for ad placements. When an advertiser DOES exist
-- with a matching name + city, the listing links to it and inherits
-- "Featured" treatment.
--
-- Architecture decisions:
--   - Brand-scoped: every listing has brand_slug; readers on the AOP
--     domain see Auburn-Opelika businesses, not Mobile Bay ones. Matches
--     migration 161's pattern on guide_articles.
--   - Flat categories with array-of-slugs on each listing. Hierarchies
--     get unwieldy fast for a community-curated directory and the search
--     UI works fine without them.
--   - Public submissions land in directory_suggestions for admin review
--     (with optional AI draft of description from the submitter's notes
--     via the AI integration's 'drafting' task kind).
--   - Photos start as a single hero_image_url; gallery JSONB array is
--     added when needed.
--   - Reviews / ratings: deferred to v2 — Yelp-grade moderation is a
--     dedicated engineering effort. v1 is a curated directory, not UGC.

CREATE TABLE IF NOT EXISTS directory_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT NOT NULL DEFAULT 'rrp',
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NULL,
  -- Icon emoji for the index page tile (e.g. '🍎', '🦷', '🎵'). Cheap +
  -- works without an icon system.
  emoji        TEXT NULL,
  -- Sort order on the index page. NULL = alphabetical.
  display_order INT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID NULL,
  UNIQUE (brand_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_directory_categories_brand
  ON directory_categories (brand_slug, is_active, display_order NULLS LAST, name);

CREATE TABLE IF NOT EXISTS directory_listings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug           TEXT NOT NULL DEFAULT 'rrp',
  -- 'business' is the default; 'expert' is a person (pediatrician,
  -- counselor, etc.) where the headline + photo is the human, not the
  -- practice. Both render with the same template, but the detail page
  -- emphasizes credentials + headshot for experts.
  kind                 TEXT NOT NULL DEFAULT 'business' CHECK (kind IN ('business', 'expert')),
  -- Slug used in the URL: /directory/<slug>. Unique per brand so two
  -- brands can each have a "smith-family-dental" listing.
  slug                 TEXT NOT NULL,
  name                 TEXT NOT NULL,
  -- One-liner shown on the index card. AI-drafted from the submission
  -- when present.
  summary              TEXT NULL,
  -- Full description shown on the detail page.
  description          TEXT NULL,
  -- Categories this listing belongs to (matches directory_categories.slug).
  -- Array because most listings fit more than one — a pediatric dentist is
  -- both 'dentistry' and 'kids-health'.
  category_slugs       TEXT[] NOT NULL DEFAULT '{}',
  -- Contact + location.
  address              TEXT NULL,
  city                 TEXT NULL,
  state                TEXT NULL,
  zip                  TEXT NULL,
  phone                TEXT NULL,
  website              TEXT NULL,
  email                TEXT NULL,
  -- Free-form hours. JSON would over-engineer a v1 — most listings just
  -- say "Mon-Fri 9-5" or "By appointment."
  hours                TEXT NULL,
  -- Photo. Future: gallery JSONB.
  hero_image_url       TEXT NULL,
  -- Featured treatment: paid placement OR editor-curated. Surfaces at the
  -- top of category pages + the directory index.
  is_featured          BOOLEAN NOT NULL DEFAULT FALSE,
  -- When this listing maps to an existing advertiser_accounts row, the
  -- directory entry inherits Featured + can show paid-ad creative. Set
  -- by editor when the link is confirmed.
  advertiser_account_id UUID NULL,
  -- Workflow.
  status               TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'archived')),
  -- Editorial bookkeeping.
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID NULL,                                -- admin_users.id
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at         TIMESTAMPTZ NULL,
  -- Engagement.
  view_count           INT NOT NULL DEFAULT 0,
  click_count          INT NOT NULL DEFAULT 0,
  UNIQUE (brand_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_directory_listings_brand
  ON directory_listings (brand_slug, status, is_featured DESC, name);
-- GIN on category_slugs so "show me everything in <category>" is a clean
-- index scan even as the directory grows.
CREATE INDEX IF NOT EXISTS idx_directory_listings_categories
  ON directory_listings USING GIN (category_slugs);
-- Trigram-like search via pg_trgm would be ideal; without that extension
-- a simple title-prefix index covers the common case.
CREATE INDEX IF NOT EXISTS idx_directory_listings_name
  ON directory_listings (brand_slug, name);

CREATE TABLE IF NOT EXISTS directory_suggestions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug           TEXT NOT NULL DEFAULT 'rrp',
  -- The submitter's account. Email is verified before submission counts
  -- (magic-link style, same pattern as contributors).
  submitter_name       TEXT NULL,
  submitter_email      TEXT NOT NULL,
  -- Free-form notes from the submitter. AI drafts the structured listing
  -- (summary, description, category guesses) from this when /api/admin/
  -- directory/suggestions/[id]/draft is hit.
  notes                TEXT NOT NULL,
  -- Optional structured hints from the submitter (name, website, etc).
  -- Stored as JSON so we don't have to enumerate every field; the admin
  -- review UI surfaces whatever was provided.
  submitted_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- AI-drafted listing values, generated on demand by the admin reviewer.
  ai_draft             JSONB NULL,
  ai_draft_generated_at TIMESTAMPTZ NULL,
  -- Workflow.
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'duplicate')),
  rejected_reason      TEXT NULL,
  /** Set when the suggestion becomes a directory_listings row. */
  resulting_listing_id UUID NULL REFERENCES directory_listings(id) ON DELETE SET NULL,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ NULL,
  reviewed_by          UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_directory_suggestions_pending
  ON directory_suggestions (brand_slug, submitted_at DESC) WHERE status = 'pending';

ALTER TABLE directory_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_suggestions ENABLE ROW LEVEL SECURITY;

-- Seed: a handful of common categories for RRP so the public index has
-- content the moment editorial flips a few listings to published.
-- Editorial extends or replaces these in /admin/directory/categories.
INSERT INTO directory_categories (brand_slug, slug, name, description, emoji, display_order) VALUES
  ('rrp', 'pediatric-care',        'Pediatric Care',        'Pediatricians, pediatric dentists, kid-friendly specialists.', '🩺', 1),
  ('rrp', 'family-restaurants',    'Family Restaurants',    'Places that actually welcome kids without sighing.',           '🍽️', 2),
  ('rrp', 'kids-activities',       'Kids Activities',       'Music, sports, art, dance, tutoring.',                          '⚽', 3),
  ('rrp', 'family-services',       'Family Services',       'Photographers, financial planners, attorneys, accountants.',    '📋', 4),
  ('rrp', 'home-services',         'Home Services',         'Cleaners, contractors, lawn care, pest control.',               '🏡', 5),
  ('rrp', 'after-school-care',     'After-School Care',     'Aftercare programs, tutoring centers, homework help.',          '📚', 6),
  ('rrp', 'birthday-party-venues', 'Birthday Party Venues', 'Where to host the next one without going broke.',               '🎉', 7),
  ('rrp', 'family-fitness',        'Family Fitness',        'Gyms, pools, yoga studios with family classes.',                '🧘', 8)
ON CONFLICT (brand_slug, slug) DO NOTHING;

COMMENT ON TABLE directory_categories IS
  'Flat (non-hierarchical) categories per brand. One listing can belong to many.';
COMMENT ON TABLE directory_listings IS
  'Local businesses + experts. Independent of advertiser_accounts; optional link via advertiser_account_id.';
COMMENT ON TABLE directory_suggestions IS
  'Community-submitted listing suggestions. AI drafts proposed values on admin review.';

-- Atomic view counter so the detail page can bump views without a
-- read-modify-write race.
CREATE OR REPLACE FUNCTION increment_directory_view(p_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE directory_listings SET view_count = view_count + 1 WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION increment_directory_click(p_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE directory_listings SET click_count = click_count + 1 WHERE id = p_id;
$$;
