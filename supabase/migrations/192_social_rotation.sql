-- ── Migration 192 — Social rotation engine ─────────────────────────────
--
-- The continuous-engagement layer. Every publishable content item
-- (article, event, guide, game, CTA) auto-enters a recycle queue.
-- Cron dispatches scheduled posts per platform with platform-specific
-- AI-generated copy + per-platform image crops.
--
-- Tables:
--   1. social_schedules — per-(brand, content type) cadence rules
--   2. social_queue     — every queued post item (one row per
--                         scheduled fire — recycles create new rows)
--   3. social_post_outputs — audit log of what actually went out per
--                            platform (success / failure / engagement)

-- ── 1. Cadence rules ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Per-brand scoping. NULL = applies to all brands (rarely useful;
  -- typically each brand has its own schedule per content type).
  brand_slug          TEXT,

  -- The content type this schedule applies to.
  -- 'article'  : guide_articles publishes
  -- 'event'    : calendar_events (rampup to date)
  -- 'guide'    : evergreen guide pages
  -- 'game'     : brain_games
  -- 'cta'      : recurring CTAs (newsletter signup, advertiser callout)
  -- 'school-bit': school_bits items
  -- 'column'   : column hub pages
  content_type        TEXT NOT NULL,

  -- The platforms this schedule fires on.
  platforms           TEXT[] NOT NULL DEFAULT ARRAY['facebook','instagram']::TEXT[],

  -- Recycle pattern — when does the same content fire again?
  -- Array of offsets in days from initial post. Empty array = no recycle.
  -- Example: [0, 30, 90] = post on publish + day 30 + day 90.
  recycle_offsets_days INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],

  -- For evergreen content (guides, games), a recurring rotation cadence
  -- in days. Example: 30 = guide gets reposted every 30 days perpetually.
  rotation_days       INTEGER,

  -- For time-anchored content (events), ramp pattern leading up to the date.
  -- Array of days BEFORE the event when posts fire.
  -- Example: [14, 7, 3, 1] = posts 14, 7, 3, and 1 day before event date.
  ramp_days_before    INTEGER[],

  -- Quiet hours — local time window where dispatch holds posts back.
  -- TEXT in 'HH:MM-HH:MM' format. NULL = always allowed.
  quiet_hours_local   TEXT,

  -- Posts per day cap to prevent flooding the audience.
  max_posts_per_day   INTEGER NOT NULL DEFAULT 4,

  -- Editor controls.
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  paused_until        TIMESTAMPTZ,   -- pause toggle
  paused_reason       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_social_schedules_brand_type
  ON social_schedules (COALESCE(brand_slug, '_global'), content_type);


-- ── 2. The dispatch queue ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_queue (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage to source content. source_kind + source_id together
  -- identify the row in its native table.
  source_kind         TEXT NOT NULL,   -- matches social_schedules.content_type
  source_id           TEXT NOT NULL,   -- guide_articles.id, calendar_events.id, etc.
  brand_slug          TEXT,            -- inherited from source for filtering

  -- Scheduled fire window
  scheduled_for       TIMESTAMPTZ NOT NULL,

  -- Status flow: pending → ready → dispatching → completed
  --                              ↘ failed   ↗
  -- Editor can also set 'rejected' / 'paused'.
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'dispatching', 'completed', 'failed', 'rejected', 'paused')),

  -- Per-platform captions (AI-generated). Editor reviews + can edit.
  -- Shape: { facebook: { caption, image_url? }, instagram: {...}, ... }
  captions            JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Which platforms this row should fire on (subset of the schedule's
  -- platforms; editor can prune per item).
  platforms           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Editor lifecycle
  needs_review        BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,

  -- Source-of-fire — which recycle index produced this row.
  -- 0 = initial post; 1 = first recycle; etc.
  recycle_index       INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_queue_status_when
  ON social_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_queue_source
  ON social_queue (source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_social_queue_brand
  ON social_queue (brand_slug);


-- ── 3. Per-platform dispatch outputs ───────────────────────────────────
-- One row per (queue item, platform) attempt. Lets us track which
-- platforms succeeded + which failed.
CREATE TABLE IF NOT EXISTS social_post_outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id   UUID NOT NULL REFERENCES social_queue(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,        -- 'facebook' | 'instagram' | 'twitter' | 'pinterest'
  status          TEXT NOT NULL,        -- 'success' | 'failed'
  platform_post_id TEXT,                -- The platform's post ID (for engagement lookup later)
  permalink       TEXT,                 -- Direct URL to the post
  error_text      TEXT,                 -- When status='failed'
  posted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Engagement metrics, populated by a follow-up cron that hits the
  -- platform's insight API.
  impressions     INTEGER,
  clicks          INTEGER,
  reactions       INTEGER,
  shares          INTEGER,
  comments        INTEGER,
  engagement_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_social_post_outputs_queue
  ON social_post_outputs (queue_item_id);
CREATE INDEX IF NOT EXISTS idx_social_post_outputs_platform_status
  ON social_post_outputs (platform, status);


-- ── 4. Default schedules — seed once, editor can tune later ────────────
-- Use NULL brand_slug for these defaults; per-brand entries override.
INSERT INTO social_schedules (brand_slug, content_type, platforms, recycle_offsets_days, rotation_days, ramp_days_before, quiet_hours_local, max_posts_per_day)
VALUES
  (NULL, 'article',     ARRAY['facebook','instagram']::TEXT[], ARRAY[0, 30, 90]::INTEGER[], NULL,      NULL,                       '22:00-07:00', 6),
  (NULL, 'guide',       ARRAY['facebook','instagram','pinterest']::TEXT[], ARRAY[0]::INTEGER[],         30,        NULL,                       '22:00-07:00', 4),
  (NULL, 'event',       ARRAY['facebook','instagram']::TEXT[], ARRAY[0]::INTEGER[],         NULL,      ARRAY[14,7,3,1]::INTEGER[], '22:00-07:00', 6),
  (NULL, 'school-bit',  ARRAY['facebook']::TEXT[],             ARRAY[0, 14]::INTEGER[],     NULL,      NULL,                       '22:00-07:00', 6),
  (NULL, 'column',      ARRAY['facebook','instagram']::TEXT[], ARRAY[0]::INTEGER[],         60,        NULL,                       '22:00-07:00', 4),
  (NULL, 'game',        ARRAY['facebook']::TEXT[],             ARRAY[0]::INTEGER[],         14,        NULL,                       '22:00-07:00', 4),
  (NULL, 'cta',         ARRAY['facebook','instagram']::TEXT[], ARRAY[0]::INTEGER[],         7,         NULL,                       '22:00-07:00', 2)
ON CONFLICT DO NOTHING;
