-- Migration 222: Make (market, week_iso, slot) a usable ON CONFLICT target
--
-- 083 created the weekly uniqueness as a PARTIAL unique index:
--   CREATE UNIQUE INDEX ... ON game_winners (market, week_iso, slot)
--     WHERE week_iso IS NOT NULL;
--
-- Postgres will not infer a partial index from a bare `ON CONFLICT (a, b, c)` —
-- the statement has to repeat the index predicate, and PostgREST (which is what
-- supabase-js .upsert() speaks) has no way to send one. So the weekly draw's
-- upsert in src/lib/games/draw.ts fails with 42P10 "there is no unique or
-- exclusion constraint matching the ON CONFLICT specification" — verified
-- against the live database. The draw would have written nothing and the cron
-- would have 500'd on the first week that had entries.
--
-- Dropping the predicate fixes inference and loses nothing: NULLs are distinct
-- in a unique index by default, so the legacy monthly rows (week_iso IS NULL)
-- are still free to coexist exactly as they were under the partial version.

DROP INDEX IF EXISTS game_winners_market_week_slot_key;

CREATE UNIQUE INDEX IF NOT EXISTS game_winners_market_week_slot_key
  ON game_winners (market, week_iso, slot);

-- Verify:
--   SELECT indexdef FROM pg_indexes
--    WHERE tablename = 'game_winners' AND indexname = 'game_winners_market_week_slot_key';
--   -- expect NO trailing "WHERE (week_iso IS NOT NULL)"
