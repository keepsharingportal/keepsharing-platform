-- Migration 212: driver-suggested route edits can now include NEW stops
--
-- Extends circulation_route_suggestions with a new_stops JSONB array so
-- drivers can propose adding a stop in the same submission as a
-- reorder. Admin approval then:
--   1. Creates each entry in circulation_stops (real UUIDs)
--   2. Substitutes the driver-picked positions into the stop_order
--   3. Applies the reorder via existing sort_order logic
--
-- new_stops entries have this shape:
--   [
--     {
--       "temp_id":    "temp-abc123",       -- driver-generated so client can reference in stop_order
--       "name":       "Ace Hardware",
--       "address":    "123 Main St",
--       "city":       "Millbrook",
--       "zip":        "36054",
--       "notes":      "Ask for Bob at the counter",
--       "quantities": {"rrp": 20, "boom": 10}
--     }
--   ]
--
-- The stop_order array uses the temp_id string wherever the new stop
-- should sit, so the driver can place it anywhere in their reorder.

ALTER TABLE circulation_route_suggestions
  ADD COLUMN IF NOT EXISTS new_stops JSONB NOT NULL DEFAULT '[]'::jsonb;

-- These columns were referenced by the API code (writes and reads) but
-- never added to the schema after migration 113. Add them idempotently
-- here so the code that has been silently failing starts to work.
ALTER TABLE circulation_route_suggestions
  ADD COLUMN IF NOT EXISTS stop_order JSONB NULL;
ALTER TABLE circulation_route_suggestions
  ADD COLUMN IF NOT EXISTS note       TEXT  NULL;
ALTER TABLE circulation_route_suggestions
  ADD COLUMN IF NOT EXISTS admin_note TEXT  NULL;

COMMENT ON COLUMN circulation_route_suggestions.new_stops IS
  'Array of new stops the driver wants added, with temp_id references matched in stop_order. Admin approval creates real stops and rewrites stop_order to use the new UUIDs.';
COMMENT ON COLUMN circulation_route_suggestions.stop_order IS
  'JSONB array of stop UUIDs (existing) and/or temp_ids (new stops from new_stops[]) in the driver''s proposed order.';
COMMENT ON COLUMN circulation_route_suggestions.note IS
  'Optional free-text explanation from the driver — "why this order?"';
COMMENT ON COLUMN circulation_route_suggestions.admin_note IS
  'Optional admin note attached when rejecting a suggestion (surfaced to the driver in the decline email).';
