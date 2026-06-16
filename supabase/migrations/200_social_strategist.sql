-- 200_social_strategist.sql
--
-- The AI Social Media Manager foundation.
--
-- TABLES
--   social_plan          — one row per (brand, week). The strategist
--                          writes one of these every Sunday for the
--                          following Mon-Sun. Editor approves it
--                          (status: 'draft' → 'approved' → 'pushed').
--   social_plan_slot     — individual posts in a plan. One per
--                          (plan, day-of-week, slot). source_kind +
--                          source_id link back to the content pool.
--                          Captions, platforms, scheduled_for, and
--                          GHL post ID after dispatch.
--   social_performance   — engagement metrics pulled from FB/IG
--                          Insights. Powers the auto-bias loop.
--   quote_bank           — editor-submitted quotes for the strategist
--                          to surface. Author + brand + tone.
--   curated_videos       — editor-curated YouTube/Vimeo videos for
--                          social use (recipes, tutorials, etc).
--   community_spotlights — local people/businesses worth featuring.

-- ── social_plan ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_plan (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT NOT NULL,
  week_start   DATE NOT NULL,                  -- Monday of the plan week
  status       TEXT NOT NULL DEFAULT 'draft'   -- draft → approved → pushed → completed
               CHECK (status IN ('draft','approved','pushed','completed','archived')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at  TIMESTAMPTZ,
  approved_by  UUID,                            -- admin_users.id
  pushed_at    TIMESTAMPTZ,
  notes        TEXT,                            -- editor notes during review
  UNIQUE (brand_slug, week_start)
);

CREATE INDEX IF NOT EXISTS idx_social_plan_brand_week
  ON social_plan (brand_slug, week_start DESC);

-- ── social_plan_slot ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_plan_slot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES social_plan(id) ON DELETE CASCADE,
  day_of_week     INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mon..6=Sun
  slot            TEXT NOT NULL CHECK (slot IN ('morning','midday','afternoon','evening')),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  source_kind     TEXT NOT NULL CHECK (source_kind IN ('article','school_bit','event','quote','spotlight','video','custom')),
  source_id       UUID,                                   -- nullable for 'custom' graphics
  custom_caption  TEXT,                                   -- for ad-hoc 'custom' posts
  custom_image    TEXT,                                   -- url for ad-hoc 'custom' posts
  platforms       TEXT[] NOT NULL DEFAULT ARRAY['facebook','instagram'],
  fb_caption      TEXT,                                   -- AI-generated, editor-editable
  ig_caption      TEXT,                                   -- AI-generated, editor-editable
  image_url       TEXT,                                   -- final cropped/composed image
  tone            TEXT,                                   -- which voice tone was used
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','dispatched','posted','failed','skipped')),
  ghl_post_id     TEXT,                                   -- returned by GHL Social Planner API
  ghl_error       TEXT,                                   -- if the push to GHL failed
  urgency         TEXT NOT NULL DEFAULT 'normal'
                  CHECK (urgency IN ('normal','urgent')), -- 'urgent' = injected mid-week
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_plan_slot_plan_day  ON social_plan_slot (plan_id, day_of_week, slot);
CREATE INDEX IF NOT EXISTS idx_social_plan_slot_scheduled ON social_plan_slot (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_plan_slot_status    ON social_plan_slot (status);

-- ── social_performance ─────────────────────────────────────────
-- One row per posted slot, updated daily by an Insights cron.
-- Powers the strategist's "what's working" bias.
CREATE TABLE IF NOT EXISTS social_performance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       UUID NOT NULL REFERENCES social_plan_slot(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,                  -- 'facebook' | 'instagram' | ...
  brand_slug    TEXT NOT NULL,
  source_kind   TEXT NOT NULL,                  -- denormalized for fast aggregation
  tone          TEXT,                           -- denormalized
  day_of_week   INT  NOT NULL,                  -- denormalized
  slot          TEXT NOT NULL,                  -- denormalized
  impressions   INT  NOT NULL DEFAULT 0,
  reach         INT  NOT NULL DEFAULT 0,
  reactions     INT  NOT NULL DEFAULT 0,
  comments      INT  NOT NULL DEFAULT 0,
  shares        INT  NOT NULL DEFAULT 0,
  clicks        INT  NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,  -- computed: (reactions+comments+shares)/reach
  posted_at     TIMESTAMPTZ NOT NULL,
  refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (slot_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_perf_brand_kind_tone
  ON social_performance (brand_slug, source_kind, tone);
CREATE INDEX IF NOT EXISTS idx_social_perf_brand_dow_slot
  ON social_performance (brand_slug, day_of_week, slot);

-- ── quote_bank ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_bank (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT,                            -- NULL = available to all brands
  quote        TEXT NOT NULL,
  attribution  TEXT,                            -- "— Maya Angelou", "— Dr. Beth Long", etc.
  tone_hint    TEXT,                            -- 'inspiring' | 'funny' | ...
  topics       TEXT[] DEFAULT ARRAY[]::TEXT[],
  image_url    TEXT,                            -- optional pre-made quote card
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  times_used   INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID
);

CREATE INDEX IF NOT EXISTS idx_quote_bank_active_brand
  ON quote_bank (is_active, brand_slug);

-- ── curated_videos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curated_videos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT,                            -- NULL = available to all brands
  title        TEXT NOT NULL,
  description  TEXT,
  video_url    TEXT NOT NULL,                   -- YouTube/Vimeo
  thumbnail    TEXT,
  category     TEXT,                            -- 'recipe' | 'tutorial' | 'tip' | ...
  duration_sec INT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  times_used   INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID
);

CREATE INDEX IF NOT EXISTS idx_curated_videos_active_brand
  ON curated_videos (is_active, brand_slug);

-- ── community_spotlights ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_spotlights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug   TEXT,
  spotlight_type TEXT NOT NULL CHECK (spotlight_type IN ('business','person','student','volunteer','school','event')),
  name         TEXT NOT NULL,
  blurb        TEXT NOT NULL,                   -- ~2-3 sentences for the caption seed
  image_url    TEXT,
  link_url     TEXT,                            -- optional related page
  tone_hint    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  times_used   INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID
);

CREATE INDEX IF NOT EXISTS idx_community_spotlights_active_brand
  ON community_spotlights (is_active, brand_slug);

-- ── COMMENTS ────────────────────────────────────────────────────
COMMENT ON TABLE social_plan IS
  'Weekly content plan generated by the AI strategist. One per (brand, week). Editor approves it Monday morning, then it pushes to GHL.';
COMMENT ON TABLE social_plan_slot IS
  'Individual posts within a weekly plan. source_kind + source_id link to the content pool. ghl_post_id records the dispatch.';
COMMENT ON TABLE social_performance IS
  'Engagement metrics per posted slot. Refreshed daily by an Insights cron. Read by the strategist to bias future picks.';
COMMENT ON TABLE quote_bank IS
  'Editor-curated quotes for the strategist to surface. brand_slug NULL = syndication-eligible across all brands.';
COMMENT ON TABLE curated_videos IS
  'Editor-curated YouTube/Vimeo URLs for social use (recipes, tutorials, tips). brand_slug NULL = available everywhere.';
COMMENT ON TABLE community_spotlights IS
  'Local people, businesses, students, schools worth featuring. The strategist rotates these into the plan.';
