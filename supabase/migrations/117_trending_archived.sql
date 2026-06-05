-- Migration 117: trending_items.archived_at
--
-- Adds a soft-archive timestamp to trending_items. Items get auto-archived
-- 30 days after their end_at when the admin loads /admin/trending. Archived
-- rows stay in the table (so the admin can restore them) but are hidden from
-- the default list view and never serve to the public homepage.

ALTER TABLE trending_items
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_trending_items_archived
  ON trending_items (archived_at) WHERE archived_at IS NOT NULL;
