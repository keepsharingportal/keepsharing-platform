-- Migration 097: Intentionally empty.
--
-- This file originally tried to create article_views + view_count, but
-- those already exist from migration 071 (analytics_foundation) using
-- column name `viewed_at` instead of `occurred_at`. The schema we need
-- was already in place — the article view tracking, the dedup RPC, and
-- the denormalized counter on guide_articles all came from 071.
--
-- Nothing to do here. Keeping the file so the migration history stays
-- continuous (no gap at 097).

SELECT 1;
