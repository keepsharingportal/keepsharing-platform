-- Migration 112: magazine_issues table
--
-- One row per published print issue. The current month's issue drives
-- the "Read Digital Edition" block on the homepage; older issues feed
-- a "Recent Issues" carousel below it (matches the KC Parent layout).
--
-- Per-market — when River Region Boom and the other markets come
-- online they each get their own current issue without colliding.
--
-- is_current: TRUE for the issue that should render at the top of the
-- homepage. Only one row per market is allowed to be current; setting
-- a new one true should set the previous one false (the admin POST
-- handles that atomically).

CREATE TABLE IF NOT EXISTS magazine_issues (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market        TEXT        NOT NULL DEFAULT 'rrp',
  -- Display label shown above the cover ("May 2026 Issue").
  label         TEXT        NOT NULL,
  -- Short tagline shown under the title.
  tagline       TEXT        NULL,
  -- Issue month — used for sort + grouping. YYYY-MM-DD (first of month).
  issue_month   DATE        NOT NULL,
  -- Public URL of the cover image (Supabase Storage or external).
  cover_url     TEXT        NULL,
  -- Issuu flipbook URL.
  issuu_url     TEXT        NOT NULL,
  -- Marks the issue that drives the "This Month" homepage block.
  is_current    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Soft sort override (lower first). NULL = sort by issue_month desc.
  sort_order    INTEGER     NULL,
  published_at  TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magazine_issues_market_month
  ON magazine_issues (market, issue_month DESC);

-- Partial unique index — only ONE row per market can be is_current=true.
-- The admin handler flips the previous current to false in the same
-- transaction when setting a new one.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_magazine_issues_current_per_market
  ON magazine_issues (market)
  WHERE is_current = TRUE;
