-- KeepSharing Platform — Migration 012
-- Family / Newcomer Guide: articles, categories, and listings
-- Three-tier listing system: free | enhanced | featured
-- Multi-guide ready via guide_slug ('newcomer-guide', 'summer-fun', 'birthday', etc.)

-- ── guide_categories ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guide_categories (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug                  TEXT NOT NULL,           -- 'newcomer-guide', 'summer-fun', etc.
  publication_id              UUID REFERENCES publications(id),
  slug                        TEXT NOT NULL,           -- URL-safe e.g. 'pediatricians'
  name                        TEXT NOT NULL,
  description                 TEXT,
  display_order               INT NOT NULL DEFAULT 0,
  icon_name                   TEXT,                    -- lucide-react icon name
  section_sponsor_advertiser_id UUID REFERENCES advertisers(id),
  show_in_print               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guide_slug, publication_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_gc_guide_pub ON guide_categories(guide_slug, publication_id);
CREATE INDEX IF NOT EXISTS idx_gc_order     ON guide_categories(guide_slug, display_order);

-- ── guide_articles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guide_articles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug                  TEXT NOT NULL,
  publication_id              UUID REFERENCES publications(id),
  slug                        TEXT NOT NULL,           -- URL slug, globally unique per guide_slug
  title                       TEXT NOT NULL,
  excerpt                     TEXT,
  body                        TEXT,                    -- markdown
  hero_image_url              TEXT,
  author_name                 TEXT NOT NULL DEFAULT 'River Region Parents',
  author_byline               TEXT,
  section_sponsor_advertiser_id UUID REFERENCES advertisers(id),
  priority                    TEXT NOT NULL DEFAULT 'p1'
                                CHECK (priority IN ('p0','p1','p2')),
  display_order               INT NOT NULL DEFAULT 0,
  published                   BOOLEAN NOT NULL DEFAULT FALSE,
  published_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guide_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_ga_guide_pub     ON guide_articles(guide_slug, publication_id);
CREATE INDEX IF NOT EXISTS idx_ga_published     ON guide_articles(guide_slug, published, display_order);

-- ── guide_listings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guide_listings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id                 UUID NOT NULL REFERENCES guide_categories(id) ON DELETE CASCADE,
  slug                        TEXT NOT NULL UNIQUE,    -- URL slug for /newcomer-guide/listings/[slug]
  business_name               TEXT NOT NULL,
  address                     TEXT,
  city                        TEXT,
  zip                         TEXT,
  phone                       TEXT,
  website                     TEXT,
  email                       TEXT,
  description                 TEXT,                    -- 1-2 sentence description
  editorial_blurb             TEXT,                    -- "What families say" line — featured tier only
  listing_tier                TEXT NOT NULL DEFAULT 'free'
                                CHECK (listing_tier IN ('free','enhanced','featured')),
  accepting_new_patients      BOOLEAN,
  hours_summary               TEXT,
  logo_url                    TEXT,
  cover_image_url             TEXT,
  gallery_image_urls          TEXT[] DEFAULT '{}',
  google_maps_url             TEXT,
  categories                  TEXT[] DEFAULT '{}',     -- additional category tags
  display_order               INT NOT NULL DEFAULT 0,
  advertiser_id               UUID REFERENCES advertisers(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gl_category   ON guide_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_gl_tier       ON guide_listings(listing_tier);
CREATE INDEX IF NOT EXISTS idx_gl_zip        ON guide_listings(zip);
CREATE INDEX IF NOT EXISTS idx_gl_patients   ON guide_listings(accepting_new_patients);
CREATE INDEX IF NOT EXISTS idx_gl_order      ON guide_listings(category_id, listing_tier, display_order);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_articles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_listings   ENABLE ROW LEVEL SECURITY;

-- Public read access (these are public-facing pages)
CREATE POLICY "Public reads guide_categories" ON guide_categories FOR SELECT USING (true);
CREATE POLICY "Public reads guide_articles"   ON guide_articles   FOR SELECT USING (published = true);
CREATE POLICY "Public reads guide_listings"   ON guide_listings   FOR SELECT USING (true);

-- Super admin (service role bypasses RLS; this policy covers browser-auth admin sessions)
CREATE POLICY "Super admin guide_categories" ON guide_categories FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
CREATE POLICY "Super admin guide_articles"   ON guide_articles   FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
CREATE POLICY "Super admin guide_listings"   ON guide_listings   FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
