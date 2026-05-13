-- ─────────────────────────────────────────────────────────────────────────────
-- 062: Audience Engagement Foundation
--
-- Two tables for the Audience Growth & Engagement Engine:
--
-- engagement_signals  — anonymous event tracking for reader/audience actions.
--   No user accounts required. Session-level, privacy-safe signals.
--   Wired in future phases as pages grow (guide views, event saves, etc.).
--   Empty at launch but schema is ready for wiring.
--
-- engagement_campaigns — operator-managed engagement initiatives.
--   Tracks growth ideas from concept through completion.
--   Immediately useful as an operator planning tool.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── engagement_signals ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_signals (

  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Signal classification ────────────────────────────────────────────────
  signal_type      TEXT        NOT NULL,
  -- Audience actions — wired in as pages + features grow:
  -- 'newsletter_signup'    — reader signed up for newsletter
  -- 'guide_view'           — reader browsed a guide page
  -- 'guide_follow'         — reader tapped "follow this guide" (future)
  -- 'event_save'           — reader saved an event (future)
  -- 'school_follow'        — reader followed a school (future)
  -- 'business_favorite'    — reader favorited a local business (future)
  -- 'nomination_submitted' — nomination form completed
  -- 'birthday_submitted'   — birthday submission form completed
  -- 'family_favorites_vote'— Family Favorites voting action
  -- 'reminder_requested'   — reader requested event/seasonal alert (future)
  -- 'social_share'         — content shared from a reader action (future)
  -- 'return_visit'         — same session_id seen again (future)
  -- 'category_click'       — reader clicked into a category section (future)
  -- 'lead_magnet_download' — reader downloaded a guide PDF or resource (future)

  -- ── Source context ───────────────────────────────────────────────────────
  publication        TEXT,
  source_page        TEXT,                -- page path where signal occurred
  source_category    TEXT,                -- guide category slug if applicable
  source_guide_slug  TEXT,                -- guide slug if applicable
  source_school      TEXT,                -- school name if applicable
  submission_type    TEXT,                -- community_submission type if applicable

  -- ── Anonymous session ────────────────────────────────────────────────────
  session_id         TEXT,                -- anonymous; no user account
  ip_region          TEXT,                -- rough geography (city/county), optional

  -- ── Flexible metadata ────────────────────────────────────────────────────
  metadata           JSONB,               -- extra context varies by signal_type

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Constraints
ALTER TABLE engagement_signals
  ADD CONSTRAINT engagement_signals_type_check
  CHECK (signal_type IN (
    'newsletter_signup', 'guide_view', 'guide_follow', 'event_save',
    'school_follow', 'business_favorite', 'nomination_submitted',
    'birthday_submitted', 'family_favorites_vote', 'reminder_requested',
    'social_share', 'return_visit', 'category_click', 'lead_magnet_download'
  ));

-- Indexes (optimized for dashboard queries and time-series analysis)
CREATE INDEX IF NOT EXISTS engagement_signals_type_idx
  ON engagement_signals (signal_type, created_at DESC);

CREATE INDEX IF NOT EXISTS engagement_signals_guide_idx
  ON engagement_signals (source_guide_slug, created_at DESC)
  WHERE source_guide_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS engagement_signals_category_idx
  ON engagement_signals (source_category, created_at DESC)
  WHERE source_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS engagement_signals_pub_idx
  ON engagement_signals (publication, created_at DESC)
  WHERE publication IS NOT NULL;

CREATE INDEX IF NOT EXISTS engagement_signals_date_idx
  ON engagement_signals (created_at DESC);

COMMENT ON TABLE engagement_signals IS
  'Anonymous audience interaction events. No user accounts required. '
  'Session-level tracking only. Empty at launch — wired as public pages grow. '
  'Each signal_type gets wired in when the corresponding public feature ships.';

-- ── engagement_campaigns ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engagement_campaigns (

  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Identity ─────────────────────────────────────────────────────────────
  name             TEXT        NOT NULL,
  campaign_type    TEXT        NOT NULL DEFAULT 'participation',
  -- 'participation' | 'newsletter' | 'seasonal' | 'sponsor' | 'content' | 'retention'

  -- ── Targeting ────────────────────────────────────────────────────────────
  publication      TEXT,
  target_category  TEXT,
  target_guide_slug TEXT,
  target_school    TEXT,

  -- ── Planning ─────────────────────────────────────────────────────────────
  status           TEXT        NOT NULL DEFAULT 'idea',
  -- 'idea' → 'planned' → 'active' → 'complete' | 'paused'
  goal             TEXT,                -- free text: what are we trying to achieve?
  notes            TEXT,
  start_date       DATE,
  end_date         DATE,
  owner            TEXT,                -- operator name responsible

  -- ── Results (operator-filled after campaign) ──────────────────────────────
  result_notes     TEXT,

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- Constraints
ALTER TABLE engagement_campaigns
  ADD CONSTRAINT engagement_campaigns_type_check
  CHECK (campaign_type IN (
    'participation', 'newsletter', 'seasonal', 'sponsor', 'content', 'retention'
  ));

ALTER TABLE engagement_campaigns
  ADD CONSTRAINT engagement_campaigns_status_check
  CHECK (status IN (
    'idea', 'planned', 'active', 'complete', 'paused'
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS engagement_campaigns_status_idx
  ON engagement_campaigns (status, created_at DESC);

CREATE INDEX IF NOT EXISTS engagement_campaigns_type_idx
  ON engagement_campaigns (campaign_type);

-- updated_at trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE TRIGGER engagement_campaigns_updated_at
      BEFORE UPDATE ON engagement_campaigns
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

COMMENT ON TABLE engagement_campaigns IS
  'Operator-planned audience engagement initiatives. '
  'Tracks growth ideas from concept through completion. '
  'Covers participation pushes, newsletter growth, seasonal campaigns, '
  'sponsor alignment opportunities, and retention efforts.';
