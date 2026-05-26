-- Migration 083: Switch prize structure from monthly $50 to weekly 3 × $10
-- Adds week_iso + slot, loosens the monthly constraint, drops the prize default.
-- Safe to apply whether or not 082 has already been applied.

ALTER TABLE game_winners
  ADD COLUMN IF NOT EXISTS week_iso CHAR(8),                  -- YYYY-Www (e.g., 2026-W21)
  ADD COLUMN IF NOT EXISTS slot     SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE game_winners ALTER COLUMN month_iso DROP NOT NULL;
ALTER TABLE game_winners ALTER COLUMN prize_amount SET DEFAULT 10.00;

-- Replace monthly uniqueness with weekly+slot uniqueness
ALTER TABLE game_winners DROP CONSTRAINT IF EXISTS game_winners_market_month_iso_key;

CREATE UNIQUE INDEX IF NOT EXISTS game_winners_market_week_slot_key
  ON game_winners (market, week_iso, slot)
  WHERE week_iso IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_winners_week_recent
  ON game_winners (market, week_iso DESC, slot);
