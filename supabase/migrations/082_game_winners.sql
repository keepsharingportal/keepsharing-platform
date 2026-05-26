-- Migration 082: Monthly $50 drawing winners
-- When an admin clicks "Draw winner" in /admin/games we persist the result here
-- so the public hub can show "Last month's winner: Sarah T."

CREATE TABLE IF NOT EXISTS game_winners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_iso     CHAR(7) NOT NULL,                       -- YYYY-MM
  market        TEXT NOT NULL DEFAULT 'rrp',
  score_id      UUID REFERENCES game_scores(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_initial  CHAR(1),
  email         TEXT,                                    -- snapshot for outreach
  prize_amount  NUMERIC(10,2) DEFAULT 50.00,
  drawn_at      TIMESTAMPTZ DEFAULT NOW(),
  drawn_by      TEXT,                                    -- operator email
  announced_at  TIMESTAMPTZ,                             -- set when admin marks announced
  UNIQUE (market, month_iso)                             -- one winner per month per market
);

CREATE INDEX IF NOT EXISTS idx_game_winners_recent
  ON game_winners (market, month_iso DESC);
