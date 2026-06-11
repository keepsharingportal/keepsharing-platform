-- ── Google Search Console — query + page metrics nightly sync ───────────────
--
-- Editorial intelligence Plausible can't give. Surfaces the actual search
-- queries that land readers on each article — directly informs which topics
-- to commission more of, which headlines aren't pulling their weight, and
-- which articles have indexing problems.
--
-- This migration adds:
--   search_console_integrations — one row per connected property
--                                 (OAuth refresh token, last-sync stamp).
--   search_console_queries      — daily query × page rows, top 1000/day.
--                                 90-day retention.
--   search_console_pages_daily  — daily per-page rollup so trend graphs
--                                 + per-article views are cheap to query.
--
-- Surfacing:
--   /admin/integrations/search-console — connect, sync now, sync log
--   /admin/analytics/acquisition       — Top organic queries panel
--   /admin/articles/[id]/edit          — Per-article query list
--
-- API used: Google Search Console search-analytics endpoint
-- (developers.google.com/webmaster-tools/v1/searchanalytics/query)

CREATE TABLE IF NOT EXISTS search_console_integrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'sc-domain:riverregionparents.com' or 'https://www.riverregionparents.com/'
  property_url             TEXT NOT NULL,
  refresh_token            TEXT NOT NULL,
  access_token             TEXT NULL,                  -- short-lived, refreshed on demand
  access_token_expires_at  TIMESTAMPTZ NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_by             UUID NULL,                  -- admin_users.id
  last_sync_at             TIMESTAMPTZ NULL,
  last_sync_status         TEXT NULL,                  -- 'success' | 'error'
  last_sync_error          TEXT NULL,
  last_sync_query_count    INT NULL,
  last_sync_page_count     INT NULL,
  UNIQUE (property_url)
);

-- Query × page × day rollup. Top 1000 rows per day per property pulled
-- nightly. Old rows expire on day 91 via the cleanup query in the sync job.
CREATE TABLE IF NOT EXISTS search_console_queries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id     UUID NOT NULL REFERENCES search_console_integrations(id) ON DELETE CASCADE,
  query              TEXT NOT NULL,
  page               TEXT NOT NULL,
  day                DATE NOT NULL,
  clicks             INT NOT NULL DEFAULT 0,
  impressions        INT NOT NULL DEFAULT 0,
  position           NUMERIC(6, 2) NOT NULL DEFAULT 0,
  -- Match a page back to a guide_article when the slug is identifiable.
  -- Populated by the sync job using URL → article lookup; nullable so old
  -- rows from before an article move don't break.
  article_id         UUID NULL,
  UNIQUE (integration_id, query, page, day)
);

CREATE INDEX IF NOT EXISTS idx_sc_queries_day
  ON search_console_queries (day DESC);
CREATE INDEX IF NOT EXISTS idx_sc_queries_page
  ON search_console_queries (page, day DESC);
CREATE INDEX IF NOT EXISTS idx_sc_queries_article
  ON search_console_queries (article_id, day DESC)
  WHERE article_id IS NOT NULL;

-- Daily per-page rollup. One row per (page, day). Useful for trend graphs
-- without scanning the larger queries table.
CREATE TABLE IF NOT EXISTS search_console_pages_daily (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id     UUID NOT NULL REFERENCES search_console_integrations(id) ON DELETE CASCADE,
  page               TEXT NOT NULL,
  day                DATE NOT NULL,
  clicks             INT NOT NULL DEFAULT 0,
  impressions        INT NOT NULL DEFAULT 0,
  position           NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ctr                NUMERIC(6, 4) NOT NULL DEFAULT 0,
  article_id         UUID NULL,
  UNIQUE (integration_id, page, day)
);

CREATE INDEX IF NOT EXISTS idx_sc_pages_daily_day
  ON search_console_pages_daily (day DESC);
CREATE INDEX IF NOT EXISTS idx_sc_pages_daily_article
  ON search_console_pages_daily (article_id, day DESC)
  WHERE article_id IS NOT NULL;

-- Per-run sync log. Same shape as facebook_sync_log so the admin log
-- viewer is consistent across integrations.
CREATE TABLE IF NOT EXISTS search_console_sync_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID NULL REFERENCES search_console_integrations(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ NULL,
  status          TEXT NULL,                          -- 'success' | 'error'
  query_count     INT NULL,
  page_count      INT NULL,
  error           TEXT NULL,
  triggered_by    TEXT NULL                            -- 'cron' | 'manual:<admin_id>'
);

CREATE INDEX IF NOT EXISTS idx_sc_sync_log_recent
  ON search_console_sync_log (started_at DESC);

ALTER TABLE search_console_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_queries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_pages_daily  ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_sync_log     ENABLE ROW LEVEL SECURITY;
-- Service-role only; admin reads + writes via service-role API.

COMMENT ON TABLE search_console_integrations IS
  'Google Search Console OAuth + sync state. One row per connected property.';
COMMENT ON TABLE search_console_queries IS
  'Daily query × page rows from the Search Console search-analytics endpoint. 90-day retention.';
COMMENT ON TABLE search_console_pages_daily IS
  'Daily per-page rollup. Used for trend graphs and per-article query summaries.';
