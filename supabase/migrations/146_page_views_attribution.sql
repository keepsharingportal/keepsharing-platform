-- ── page_views attribution columns ──────────────────────────────────────────
--
-- The original page_views (migration 118) only captured path + session +
-- timestamp. That's enough for "top pages" but doesn't answer the more
-- valuable question: WHERE did these readers come from? — Facebook, Google,
-- direct, magazine QR, your own UTM-tagged email campaign?
--
-- This migration adds referrer + UTM columns so the Acquisition report
-- can break traffic down by source. Backfill is impossible (these were
-- never captured); only new rows have data.

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS referrer_host TEXT NULL,
  ADD COLUMN IF NOT EXISTS utm_source    TEXT NULL,
  ADD COLUMN IF NOT EXISTS utm_medium    TEXT NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign  TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_page_views_referrer
  ON page_views (referrer_host, viewed_at DESC)
  WHERE referrer_host IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_page_views_utm_source
  ON page_views (utm_source, viewed_at DESC)
  WHERE utm_source IS NOT NULL;

COMMENT ON COLUMN page_views.referrer_host IS
  'Hostname from the Referer header at the time of the visit. NULL for direct visits, type-ins, or referrer-stripped sources.';
COMMENT ON COLUMN page_views.utm_source IS
  'UTM source parameter from the landing URL — populated when the visitor arrived from a tagged campaign.';
