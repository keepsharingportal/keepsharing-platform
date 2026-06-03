-- Migration 111: extend nav_visibility for renames, new-tab toggle, and
--               admin-added custom menu items
--
-- The original nav_visibility table (mig 108) only stored a hidden flag
-- against a code-catalog key. Editors now want to:
--   - Rename catalog items (override the label)
--   - Override the destination URL on a catalog item
--   - Mark items as "open in new tab"
--   - Add custom items that don't exist in the code catalog at all
--     (e.g., a "Print Edition" link added straight from admin)
--
-- One row per nav key. For catalog overrides the key matches the
-- catalog item key (e.g. 'header.guides.family-resource'); for custom
-- items the admin generates a key prefixed 'custom.' so it can't
-- collide with catalog keys.

ALTER TABLE nav_visibility
  ADD COLUMN IF NOT EXISTS label_override   TEXT,
  ADD COLUMN IF NOT EXISTS href_override    TEXT,
  ADD COLUMN IF NOT EXISTS open_in_new_tab  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_custom        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_key       TEXT,
  ADD COLUMN IF NOT EXISTS sort_order       INTEGER;

-- hidden was NOT NULL DEFAULT TRUE originally — for override-only rows
-- (where the admin is renaming an item but keeping it visible) we need
-- to be able to write hidden=FALSE. The DEFAULT changes to FALSE so a
-- naive INSERT without hidden produces a visible row.
ALTER TABLE nav_visibility
  ALTER COLUMN hidden SET DEFAULT FALSE;

COMMENT ON COLUMN nav_visibility.label_override  IS 'Override the catalog item label. NULL = use catalog default.';
COMMENT ON COLUMN nav_visibility.href_override   IS 'Override the catalog item destination URL. NULL = use catalog default.';
COMMENT ON COLUMN nav_visibility.open_in_new_tab IS 'When true, the renderer adds target="_blank" rel="noreferrer" to the link.';
COMMENT ON COLUMN nav_visibility.is_custom       IS 'True for admin-added items that have no catalog counterpart. label and href required when true.';
COMMENT ON COLUMN nav_visibility.parent_key      IS 'For custom items: the key of the parent group dropdown they nest under (e.g. header.guides.dropdown). NULL = top-level.';
COMMENT ON COLUMN nav_visibility.sort_order      IS 'Manual ordering within a group. Lower numbers first. NULL = catalog-defined order or appended at end for custom items.';
