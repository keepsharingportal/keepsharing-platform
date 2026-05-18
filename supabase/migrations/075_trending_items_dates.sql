-- Migration 075: Add date-based scheduling to trending_items
-- Lets each trending bar item have an explicit shelf life so stale entries
-- (e.g. "Mother's Day Weekend Events") drop off automatically instead of
-- requiring a manual is_active flip.

ALTER TABLE trending_items
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at   TIMESTAMPTZ;

-- Backfill: deactivate the obviously-stale Mother's Day item so the homepage
-- query stops returning it the moment this migration runs. Operators can pick
-- proper start_at/end_at values for the rest from the admin UI.
UPDATE trending_items
   SET is_active = false,
       end_at    = '2026-05-11T23:59:59-05:00'
 WHERE label ILIKE '%mother%day%'
   AND end_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trending_items_active_window
  ON trending_items (is_active, display_order)
  WHERE is_active = true;
