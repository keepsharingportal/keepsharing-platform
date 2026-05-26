-- Migration 084: AI content generation review queue
--
-- The /admin/games/queue page reads from this table. AI-generated items land
-- here as 'pending'; the operator reviews each one and either approves
-- (copied into game_content with weight=1) or rejects (kept here for audit).
--
-- Manual entries from the existing editor still go straight into game_content
-- without using this table — proposals are only for the AI-generation path.

CREATE TABLE IF NOT EXISTS game_content_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type     TEXT NOT NULL,
  difficulty    TEXT NOT NULL,
  theme         TEXT,                                       -- optional generator hint, kept for context
  payload       JSONB NOT NULL,                             -- same shape as game_content.payload
  source        TEXT NOT NULL DEFAULT 'ai',                 -- 'ai' | 'manual' (future-proof)
  model         TEXT,                                       -- e.g., 'claude-opus-4-7'
  status        TEXT NOT NULL DEFAULT 'pending',            -- 'pending' | 'approved' | 'rejected'
  notes         TEXT,                                       -- model_notes from generation OR rejection reason
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   TEXT,                                       -- operator email
  approved_content_id UUID REFERENCES game_content(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gcp_status_recent
  ON game_content_proposals (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gcp_game_difficulty
  ON game_content_proposals (game_type, difficulty, status);
