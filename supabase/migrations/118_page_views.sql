-- Migration 118: page_views
--
-- Lightweight first-party pageview log used to drive the auto-trending
-- portion of the homepage trending bar. The /api/analytics/track route
-- dedups same-session repeat hits within a 30-min window before insert,
-- so this table holds one row per real visit.
--
-- Storage profile: at 50k visits/month, each row is ~80 bytes → < 4 MB/mo.
-- The (viewed_at, path) index keeps the trending rollup fast at any size.
--
-- RLS: locked down. Anon role cannot read (so we don't leak a "most
-- popular pages" map to scrapers). The /api/analytics/track route uses
-- the service-role client to insert; the homepage uses the same client
-- to aggregate. No public policies are added — service role bypasses RLS.

CREATE TABLE IF NOT EXISTS page_views (
  id            BIGSERIAL PRIMARY KEY,
  path          TEXT NOT NULL,
  article_id    UUID NULL,
  -- sha-256 of (ip + day-bucket + user-agent), truncated. Lets us dedupe
  -- repeat visits without storing PII or anything that survives a day.
  session_hash  TEXT NOT NULL,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary access pattern: "give me the top paths in the last 7 days."
CREATE INDEX IF NOT EXISTS idx_page_views_recent
  ON page_views (viewed_at DESC, path);

-- Per-session lookup for the 30-min dedup probe.
CREATE INDEX IF NOT EXISTS idx_page_views_session_path
  ON page_views (session_hash, path, viewed_at DESC);

-- For per-article popularity views (used later by article admin).
CREATE INDEX IF NOT EXISTS idx_page_views_article
  ON page_views (article_id, viewed_at DESC) WHERE article_id IS NOT NULL;

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- ── Auto-trending rollup ─────────────────────────────────────────────────
-- Top 20 paths by unique visitor count in the last 7 days. The homepage
-- selects from this view to fill the trending bar after pinned items.
--
-- SECURITY INVOKER means the view honors the querying role's RLS on
-- page_views (anon is denied → view also denies anon). Service-role
-- bypasses RLS so the homepage can read it freely.

CREATE OR REPLACE VIEW trending_paths_7d
  WITH (security_invoker = true)
AS
SELECT
  path,
  COUNT(DISTINCT session_hash)::int AS unique_views,
  MAX(viewed_at)                    AS last_view
FROM page_views
WHERE viewed_at > NOW() - INTERVAL '7 days'
GROUP BY path
ORDER BY unique_views DESC, last_view DESC
LIMIT 20;
