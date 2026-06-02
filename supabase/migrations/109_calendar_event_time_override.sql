-- Migration 109: calendar_events.display_time_override
--
-- The schema models one start_time + one end_time per event row, but
-- real-world community events often have multiple showtimes the same
-- day ("10 AM & 1 PM"), wall-clock notes ("Doors at 6:30"), or drop-in
-- windows ("Anytime 10 AM – 4 PM") that don't fit a single time range.
-- Recurring events with multiple showtimes per day (a Capri matinee
-- that runs at both 10 AM and 1 PM on Wed/Thu) hit this directly.
--
-- Rather than over-modeling (separate occurrences table, JSON array of
-- showtimes, etc.), we add a single optional override string. When the
-- editor sets it, the public side displays this string verbatim
-- instead of auto-formatting start_time/end_time. Empty / null →
-- existing behavior (auto-format).

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS display_time_override TEXT;

COMMENT ON COLUMN calendar_events.display_time_override IS
  'Optional plain-text override for how the event time renders to the public. When set, replaces the auto-computed "10:00 AM – 1:00 PM" / "All day". Examples: "10 AM & 1 PM", "Doors at 6:30", "Drop in anytime 10–4".';
