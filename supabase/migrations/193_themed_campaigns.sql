-- ── Migration 193 — Themed editorial campaigns ──────────────────────────
--
-- A "themed campaign" is a coordinated editorial + marketing push
-- around a theme for one month, scoped to one brand:
--   - July 2026 "Big Birthday Issue" for RRP
--   - August 2026 "Back to School" for RRP / MBP / AOP / ESP / GPP
--   - October 2026 "Halloween + Fall Fun"
--   - November 2026 "Gratitude + Holiday Prep"
--   - etc.
--
-- A campaign carries:
--   - Theme title + month + brand + an editor-written or AI-generated brief
--   - Target SEO keywords for the campaign
--   - Linked articles (with role: cover/feature/supporting/cta)
--   - Linked sponsors (advertiser_account_id + placement type)
--   - A public landing page at /campaigns/[slug]
--   - Auto-enqueued social rotation queue items
--
-- Optional linkage to magazine_issues — a campaign can map to a print
-- issue but doesn't have to. The campaign layer is broader (covers
-- web + social + email + sponsor packages); the magazine_issue is the
-- single flipbook artifact.

CREATE TABLE IF NOT EXISTS themed_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Brand scoping. One campaign per brand per month per theme.
  brand_slug           TEXT NOT NULL,

  -- URL-safe identifier. Used for /campaigns/[slug] landing.
  slug                 TEXT NOT NULL,

  -- Human-readable title shown on the landing page + admin.
  theme_title          TEXT NOT NULL,

  -- Month the campaign is themed for. First day of month.
  month                DATE NOT NULL,

  -- Editorial brief — what's the angle + what gets covered + tone.
  -- Editor-written or AI-generated via the assist endpoint.
  brief                TEXT,

  -- AI-generated content plan (JSONB): suggested articles, keywords,
  -- sponsor categories. Persists so we can regenerate without losing
  -- the editor's edits.
  ai_brief             JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Target SEO keywords for the campaign — flow into pillar matching
  -- + sub-area enrichment during the campaign.
  target_keywords      TEXT[] NOT NULL DEFAULT '{}',

  -- Status flow: planning → active → published → archived
  status               TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'published', 'archived')),

  -- Optional linkage to a print magazine_issue.
  magazine_issue_id    UUID REFERENCES magazine_issues(id) ON DELETE SET NULL,

  -- Cover image for the public landing page + social cards.
  cover_image_url      TEXT,
  hero_tagline         TEXT,

  -- Public landing page on/off.
  public_landing_active BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle.
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           TEXT,
  last_edited_by       TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_themed_campaigns_brand_slug
  ON themed_campaigns (brand_slug, slug);
CREATE INDEX IF NOT EXISTS idx_themed_campaigns_brand_month
  ON themed_campaigns (brand_slug, month DESC);
CREATE INDEX IF NOT EXISTS idx_themed_campaigns_status
  ON themed_campaigns (status);


-- ── Linked articles (the editorial side of the campaign) ─────────────
CREATE TABLE IF NOT EXISTS themed_campaign_articles (
  campaign_id     UUID NOT NULL REFERENCES themed_campaigns(id) ON DELETE CASCADE,
  article_id      UUID NOT NULL REFERENCES guide_articles(id) ON DELETE CASCADE,
  -- Role within the campaign:
  --   cover      = the showcase / hero piece
  --   feature    = major editorial coverage
  --   supporting = related coverage
  --   cta        = CTA-only ("submit your party photos")
  role            TEXT NOT NULL DEFAULT 'supporting'
    CHECK (role IN ('cover', 'feature', 'supporting', 'cta')),
  display_order   INTEGER NOT NULL DEFAULT 0,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_articles_campaign
  ON themed_campaign_articles (campaign_id, display_order);


-- ── Linked sponsors (the revenue side) ───────────────────────────────
CREATE TABLE IF NOT EXISTS themed_campaign_sponsors (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id              UUID NOT NULL REFERENCES themed_campaigns(id) ON DELETE CASCADE,
  advertiser_account_id    UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  -- Free-text sponsor name when the advertiser isn't in advertiser_accounts yet.
  sponsor_name             TEXT,
  -- Type of placement (cover sponsor, section sponsor, etc.).
  placement_type           TEXT NOT NULL DEFAULT 'section-sponsor'
    CHECK (placement_type IN ('cover-sponsor', 'section-sponsor', 'feature-sponsor', 'directory-listing', 'social-shoutout')),
  -- Deal value for revenue tracking.
  deal_value_cents         INTEGER,
  notes                    TEXT,
  added_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_sponsors_campaign
  ON themed_campaign_sponsors (campaign_id);


COMMENT ON TABLE themed_campaigns IS
  'Coordinated editorial + marketing campaign around a monthly theme. Spans web articles, social rotation, sponsor packages, and an optional public landing page. Edited at /admin/campaigns/[id].';


-- ── Default social schedule for campaign sources ───────────────────────
-- Campaigns get a frequent rotation through the issue month — the
-- landing page reappears in feeds every 5 days so audiences see it
-- multiple times as the theme matures.
INSERT INTO social_schedules (brand_slug, content_type, platforms, recycle_offsets_days, rotation_days, ramp_days_before, quiet_hours_local, max_posts_per_day)
SELECT NULL, 'campaign', ARRAY['facebook','instagram']::TEXT[], ARRAY[0]::INTEGER[], 5, NULL, '22:00-07:00', 4
WHERE NOT EXISTS (
  SELECT 1 FROM social_schedules WHERE content_type = 'campaign' AND brand_slug IS NULL
);
