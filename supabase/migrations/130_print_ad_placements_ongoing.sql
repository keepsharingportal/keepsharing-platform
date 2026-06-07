-- ── Print ad placements: ongoing flag ──────────────────────────────────────
--
-- Editorial reality: most print ads run for years. They reup once and
-- then carry forward every month until somebody cancels. The original
-- design forced editors to either:
--   - check every month off in specific_months for the next 18 months,
--     OR
--   - leave specific_months empty and rely on the clone-month workflow
--     to silently carry forward (which only works because the cloner
--     ignores the column for non-expired rows)
--
-- Both are fine for seasonal sponsors who genuinely only buy 4 months
-- a year. They're cumbersome for the 80% of the book that runs
-- year-round.
--
-- New model:
--   - is_ongoing = TRUE  → 'this ad runs every month until cancelled'.
--     specific_months ignored; expires_month is the cancellation date.
--   - is_ongoing = FALSE → 'this ad only runs the specific months
--     listed in specific_months'. Used for seasonal / campaign buys.
--
-- Backfill: existing rows that have an empty or NULL specific_months
-- array get is_ongoing=TRUE (most likely an ongoing sponsor the
-- previous schema couldn't represent properly). Rows with any
-- specific_months listed stay is_ongoing=FALSE (the editor explicitly
-- picked months, so trust that signal).

ALTER TABLE print_ad_placements
  ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill: any pre-existing row that had specific months listed gets
-- flipped to is_ongoing=FALSE (preserves the seasonal-buyer semantics).
-- New rows default to TRUE per the column default — matches the common
-- 'ongoing sponsor' case.
UPDATE print_ad_placements
   SET is_ongoing = FALSE
 WHERE COALESCE(array_length(specific_months, 1), 0) > 0;

-- Partial index for the cron + clone queries that filter on ongoing.
CREATE INDEX IF NOT EXISTS idx_print_ad_placements_ongoing
  ON print_ad_placements (advertiser_account_id, expires_month)
  WHERE is_ongoing = TRUE;
