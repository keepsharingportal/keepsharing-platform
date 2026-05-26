-- Migration 088: Best Of Suggestions
-- Reader-submitted suggestions for upcoming "Best Of" lists on the Family
-- Resource Guide. The button on the FRG Best Of masthead routes to a small
-- form; submissions land here as `pending` for the editorial team to
-- review when planning the next list.
--
-- Intentionally minimal — no moderation tooling beyond the status column.
-- Admin can read the table directly from Supabase or via a small queue view
-- in a follow-up.

CREATE TABLE IF NOT EXISTS best_of_suggestions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  market          text        NOT NULL DEFAULT 'rrp',
  -- The category the reader is nominating in. Free text so it doesn't have
  -- to track an enum — the form provides a curated suggestion list, but
  -- "Other" allows for new ideas the team hasn't run yet.
  category        text        NOT NULL,
  -- The thing being nominated (business / place / service name).
  nominee_name    text        NOT NULL,
  -- Why it's the best. Reader-supplied free text — the actual editorial
  -- decision still goes through the team, this is just intake.
  reason          text,
  -- Optional submitter contact info. Both nullable so anonymous suggestions
  -- still go through.
  submitted_by_name  text,
  submitted_by_email text,
  -- pending | reviewed | used | dismissed
  -- pending → not yet looked at
  -- reviewed → editor saw it, no decision yet
  -- used → contributed to a published list
  -- dismissed → not pursuing (duplicate, spam, off-topic)
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'reviewed', 'used', 'dismissed')),
  reviewer_notes  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS best_of_suggestions_market_status_idx
  ON best_of_suggestions (market, status, created_at DESC);

COMMENT ON TABLE  best_of_suggestions IS 'Reader-submitted Best Of nominations from the FRG masthead CTA.';
COMMENT ON COLUMN best_of_suggestions.category IS 'Reader-picked category — free text so the form can offer "Other".';
COMMENT ON COLUMN best_of_suggestions.status   IS 'pending → not yet looked at, reviewed → editor saw it, used → made it into a published list, dismissed → not pursuing.';
