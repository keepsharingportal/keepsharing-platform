-- ── School Bits engagement tracking ─────────────────────────────────────────
--
-- Adds cumulative view + click counters to school_bits so we can rank
-- bits and schools by reader interest.
--
--   view_count   = card scrolled into view in the public feed (impression)
--   click_count  = lightbox opened (high-intent — the reader chose to read)
--
-- The split matters: impressions on a busy feed inflate the leaderboard for
-- whatever's near the top that week. Clicks are the signal we sort schools by.
-- Both are useful (click-through rate = clicks / views = engagement quality)
-- so we track both.
--
-- Increments come from a public POST endpoint that runs as the anon role;
-- a GRANT explicitly allows that role to UPDATE just these two columns.
-- The endpoint also dedupes per session client-side so a scroll-up-scroll-
-- down doesn't double-count.

ALTER TABLE school_bits
  ADD COLUMN IF NOT EXISTS view_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count  integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_school_bits_click_count ON school_bits (click_count DESC);
CREATE INDEX IF NOT EXISTS idx_school_bits_view_count  ON school_bits (view_count  DESC);

COMMENT ON COLUMN school_bits.view_count IS
  'Cumulative impressions — card scrolled into view in the public feed.';
COMMENT ON COLUMN school_bits.click_count IS
  'Cumulative reader opens — clicked the card to open the lightbox.';
