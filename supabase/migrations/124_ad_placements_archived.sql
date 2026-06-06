-- Migration 124: ad_placements.archived_at
--
-- Same pattern trending_items uses (migration 117). Lets the editor
-- "delete" an ad without losing the historical record — the row stays
-- in the DB but disappears from the public site and from the default
-- /admin/ads list. Restorable in one click.
--
-- Why: every ad is tied to a customer. Hard-deleting loses the renewal
-- history, the click stats, and the "YMCA ran 4 ads with us" sales
-- context. Soft archive preserves all of that while still letting the
-- slot become Empty (and the sales placeholder render) on the public
-- site.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_ad_placements_archived
  ON ad_placements (archived_at) WHERE archived_at IS NOT NULL;
