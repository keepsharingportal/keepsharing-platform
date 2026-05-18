-- Migration 076: Soft delete (trash) for articles
-- Adds a deleted_at timestamp so operators can send articles to a trash bin
-- and recover them, instead of permanently deleting from the edit screen.
-- All public + admin listing queries should filter `deleted_at IS NULL`.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index for the common "live articles" case — keeps existing
-- listing queries fast once they add the WHERE clause.
CREATE INDEX IF NOT EXISTS idx_guide_articles_alive
  ON guide_articles (published, published_at DESC)
  WHERE deleted_at IS NULL;

-- And a small index for the trash view itself (most recently trashed first).
CREATE INDEX IF NOT EXISTS idx_guide_articles_trashed
  ON guide_articles (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
