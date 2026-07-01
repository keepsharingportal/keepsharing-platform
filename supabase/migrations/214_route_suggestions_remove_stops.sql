-- Migration 214: driver-suggested route edits can now REMOVE stops
--
-- Extends circulation_route_suggestions with a remove_stop_ids UUID
-- array. Drivers mark existing stops for removal in the Edit Route UI;
-- on admin approval the stops are deactivated (active=false) so they
-- disappear from every driver route and the public map while
-- preserving delivery history.
--
-- Deactivate rather than DELETE because delivery_stops FK-reference the
-- stop. Admin can restore later via Routes & Stops.

ALTER TABLE circulation_route_suggestions
  ADD COLUMN IF NOT EXISTS remove_stop_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN circulation_route_suggestions.remove_stop_ids IS
  'Array of stop UUIDs the driver wants removed from the route. Admin approval sets circulation_stops.active=false for each and removes them from stop_order before applying the reorder.';
