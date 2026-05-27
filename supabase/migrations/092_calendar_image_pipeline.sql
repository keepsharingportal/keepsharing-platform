-- Migration 092: Calendar event image pipeline (school-bits parity)
--
-- Brings event images up to the same quality as School Bits:
--   - Sharp attention-crop auto-centers on the subject (instead of
--     center-cropping faces off in cards).
--   - Manual 9-point gravity picker lets editors override when the
--     attention strategy misses.
--   - Re-crop runs from a saved high-res original — no re-upload needed.
--
-- New columns on calendar_events:
--   image_orig_path   — path inside the private originals bucket. Without
--                       this we can't re-crop, so attempting to re-crop a
--                       legacy event (uploaded before this migration) is
--                       gracefully blocked in the UI.
--   image_width  /
--   image_height      — natural-aspect dimensions of the WEB variant. The
--                       public detail page reads these to reserve layout
--                       space (no CLS) and to render correct sizes
--                       attributes for responsive srcset.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS image_orig_path TEXT,
  ADD COLUMN IF NOT EXISTS image_width     INTEGER,
  ADD COLUMN IF NOT EXISTS image_height    INTEGER;
