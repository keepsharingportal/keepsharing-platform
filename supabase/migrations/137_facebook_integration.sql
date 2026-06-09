-- ── Facebook Marketing integration ──────────────────────────────────────────
--
-- Pulls campaign performance from Meta's Marketing API into our DB so the
-- advertiser report can show spend / impressions / clicks / leads per
-- advertiser. River Region Parents runs the ads from its own ad account
-- on behalf of clients — one system-user token covers all advertisers,
-- no per-client OAuth.
--
-- Attribution model: campaigns in Ads Manager are named with a leading
-- "[advertiser-slug] ..." prefix. Sync parses the bracketed slug and
-- looks it up against advertiser_accounts.slug to bind a campaign to
-- an advertiser. Operators can manually override the mapping when the
-- name doesn't follow the convention (legacy campaigns, multi-client
-- promos, etc.).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Integration credentials — one row per market
-- ─────────────────────────────────────────────────────────────────────────
-- The system-user access token + which ad account it points at. Token is
-- sensitive but not catastrophic (read-only scope), so we store as plain
-- text and rely on admin-only access at the API layer. Rotate by pasting
-- a new token; old row is replaced.

CREATE TABLE IF NOT EXISTS facebook_integrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market                   TEXT NOT NULL UNIQUE,
  access_token             TEXT NOT NULL,
  ad_account_id            TEXT NOT NULL,         -- e.g. 'act_1234567890'
  ad_account_name          TEXT,                  -- cached for display
  business_id              TEXT,                  -- optional
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at             TIMESTAMPTZ,
  last_sync_status         TEXT,                  -- 'ok' | 'error' | 'partial'
  last_sync_error          TEXT,
  last_sync_campaign_count INT,
  last_sync_metric_count   INT,
  is_active                BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE facebook_integrations IS
  'One row per market. Holds the system-user access token + ad account id used by the nightly sync.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Campaigns — mirror of campaigns in the ad account
-- ─────────────────────────────────────────────────────────────────────────
-- Sync upserts on fb_campaign_id. parsed_slug is what we extracted from
-- the name; advertiser_id is the resolved binding. advertiser_mapping_source
-- distinguishes auto vs manual so future syncs don't trample manual picks.

CREATE TABLE IF NOT EXISTS facebook_campaigns (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_campaign_id            TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  status                    TEXT,                 -- 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  effective_status          TEXT,
  objective                 TEXT,
  advertiser_id             UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  advertiser_mapping_source TEXT NOT NULL DEFAULT 'auto'
    CHECK (advertiser_mapping_source IN ('auto', 'manual', 'unmapped')),
  parsed_slug               TEXT,                 -- what we extracted from [...] in the name
  first_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_advertiser ON facebook_campaigns (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_status     ON facebook_campaigns (effective_status);

COMMENT ON COLUMN facebook_campaigns.advertiser_mapping_source IS
  'auto = bound via [slug] parse on each sync. manual = operator override; sync preserves it. unmapped = no slug found, awaiting manual pick.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Daily metrics — one row per (campaign, day)
-- ─────────────────────────────────────────────────────────────────────────
-- Daily granularity (not monthly) so the advertiser report's date picker
-- can slice arbitrarily — full month, "Mother's Day week", custom range.
-- Sync upserts on (fb_campaign_id, day) so re-running yesterday's sync
-- is safe and updates any restated numbers.
--
-- Storage: 50 active campaigns × 365 days = 18k rows/year. Trivial.

CREATE TABLE IF NOT EXISTS facebook_campaign_metrics_daily (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_campaign_id  TEXT NOT NULL,
  day             DATE NOT NULL,
  spend           NUMERIC(12, 2),
  impressions     BIGINT,
  reach           BIGINT,
  clicks          BIGINT,                       -- all clicks
  link_clicks     BIGINT,                       -- specifically outbound link clicks (more meaningful)
  results         BIGINT,                       -- depends on objective: leads, conversions, etc.
  cost_per_result NUMERIC(12, 4),
  ctr             NUMERIC(8, 4),                -- as percentage (e.g. 2.3500 = 2.35%)
  cpc             NUMERIC(8, 4),
  cpm             NUMERIC(10, 4),
  frequency       NUMERIC(8, 4),
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (fb_campaign_id, day)
);

CREATE INDEX IF NOT EXISTS idx_fb_metrics_day          ON facebook_campaign_metrics_daily (day DESC);
CREATE INDEX IF NOT EXISTS idx_fb_metrics_campaign_day ON facebook_campaign_metrics_daily (fb_campaign_id, day DESC);

COMMENT ON TABLE facebook_campaign_metrics_daily IS
  'Daily Meta Marketing insights per campaign. Upserted by the nightly sync; safe to re-run.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Sync log — one row per sync run for diagnostics
-- ─────────────────────────────────────────────────────────────────────────
-- Cheap insurance: when "why didn't Pam's report update" comes up, look here
-- before chasing the API. Rotation policy is left to a TTL job; for now,
-- low row volume (1/day) means we can keep all of it.

CREATE TABLE IF NOT EXISTS facebook_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT,                          -- 'ok' | 'error' | 'partial'
  campaign_count  INT,
  metric_count    INT,
  error           TEXT,
  triggered_by    TEXT                           -- 'cron' | 'manual'
);

CREATE INDEX IF NOT EXISTS idx_fb_sync_log_recent ON facebook_sync_log (started_at DESC);
