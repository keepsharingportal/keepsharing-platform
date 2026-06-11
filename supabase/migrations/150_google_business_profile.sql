-- ── Google Business Profile — post updates + insights nightly sync ─────────
--
-- Phase 1 (this migration): RRP's own GBP — post updates, view local-search
-- insights, see + reply to reviews. Improves RRP's own local discovery
-- which feeds Google search referrals (compounds with migration 149's GSC).
--
-- Phase 2 (deferred — separate migration): advertiser-side multi-tenant
-- "post to my GBP from KeepSharing" upsell. The advertiser_gbp_integrations
-- table will hold per-advertiser refresh tokens.
--
-- Auth: shares the Google OAuth client (GOOGLE_OAUTH_CLIENT_ID/SECRET) with
-- the Search Console integration. The user mints a refresh token via OAuth
-- Playground with the business.manage scope and pastes it here.
--
-- API used: My Business Account Management API + Business Information API
-- + Business Profile Performance API.
-- docs: developers.google.com/my-business

CREATE TABLE IF NOT EXISTS google_business_integrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One row per (account_id, location_id) — most regional publications
  -- manage exactly one location, so a unique constraint keeps the dataset
  -- clean.
  account_id               TEXT NOT NULL,                -- accounts/{accountId}
  location_id              TEXT NOT NULL,                -- locations/{locationId}
  location_name            TEXT NULL,                    -- human-readable label for the admin UI
  refresh_token            TEXT NOT NULL,
  access_token             TEXT NULL,
  access_token_expires_at  TIMESTAMPTZ NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_by             UUID NULL,                    -- admin_users.id
  last_sync_at             TIMESTAMPTZ NULL,
  last_sync_status         TEXT NULL,
  last_sync_error          TEXT NULL,
  UNIQUE (account_id, location_id)
);

-- Daily insights — calls / direction requests / website clicks / search
-- views. One row per (location, day, metric).
CREATE TABLE IF NOT EXISTS google_business_insights_daily (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID NOT NULL REFERENCES google_business_integrations(id) ON DELETE CASCADE,
  day                 DATE NOT NULL,
  -- Metric kinds match GBP performance API
  -- (BUSINESS_IMPRESSIONS_MOBILE_SEARCH, BUSINESS_DIRECTION_REQUESTS, etc.)
  metric              TEXT NOT NULL,
  value               INT NOT NULL DEFAULT 0,
  UNIQUE (integration_id, day, metric)
);

CREATE INDEX IF NOT EXISTS idx_gbp_insights_day
  ON google_business_insights_daily (day DESC);

-- Posts authored from the admin (calls posts.create on the GBP API).
-- Tracked here so the admin can see what was posted + delete from one
-- place; insights for posts are not stored (the API's not consistent).
CREATE TABLE IF NOT EXISTS google_business_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id      UUID NOT NULL REFERENCES google_business_integrations(id) ON DELETE CASCADE,
  gbp_post_name       TEXT NULL,                          -- accounts/X/locations/Y/localPosts/Z
  summary             TEXT NOT NULL,                       -- post body the admin wrote
  cta_label           TEXT NULL,                           -- e.g. 'LEARN_MORE'
  cta_url             TEXT NULL,
  media_url           TEXT NULL,                           -- image URL pulled from RRP storage
  status              TEXT NOT NULL DEFAULT 'pending',     -- pending | live | error | deleted
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID NULL,                           -- admin_users.id
  published_at        TIMESTAMPTZ NULL,
  error               TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_gbp_posts_created
  ON google_business_posts (integration_id, created_at DESC);

-- Per-run sync log (same shape as GSC/Facebook sync logs).
CREATE TABLE IF NOT EXISTS google_business_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID NULL REFERENCES google_business_integrations(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ NULL,
  status          TEXT NULL,
  insight_count   INT NULL,
  error           TEXT NULL,
  triggered_by    TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_gbp_sync_log_recent
  ON google_business_sync_log (started_at DESC);

ALTER TABLE google_business_integrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_insights_daily  ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_sync_log        ENABLE ROW LEVEL SECURITY;
-- Service-role only.

COMMENT ON TABLE google_business_integrations IS
  'Google Business Profile OAuth + sync state. Phase 1: RRP-managed; Phase 2 will add advertiser-side multi-tenant.';
COMMENT ON TABLE google_business_insights_daily IS
  'Daily local-search performance metrics from the GBP Performance API.';
COMMENT ON TABLE google_business_posts IS
  'Posts authored from /admin/integrations/google-business. Stored locally for the admin log; live state is GBP.';
