-- ── search_console_queries composite index ────────────────────────────────
--
-- Audit pointed out that the existing indexes on search_console_queries
-- cover (day DESC), (page, day DESC), (article_id, day DESC) but NOT
-- (integration_id, day DESC). The acquisition page + editorial calendar
-- both filter by integration_id and then by date range. With the dataset
-- bounded at 100k rows over 90 days the query plan still works, but the
-- composite makes it a clean index scan instead of a partial table scan.

CREATE INDEX IF NOT EXISTS idx_sc_queries_integration_day
  ON search_console_queries (integration_id, day DESC);
