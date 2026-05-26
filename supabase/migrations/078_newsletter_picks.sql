-- Migration 078: Newsletter picks
-- Tracks which calendar events were featured in each weekly newsletter.
-- Drives the /admin/newsletter/pick-events workflow and prevents repeated
-- picks week over week (a featured event from last week is dimmed/excluded
-- by default this week).

CREATE TABLE IF NOT EXISTS newsletter_picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date      DATE NOT NULL,                     -- Thursday the newsletter goes out
  market          TEXT NOT NULL DEFAULT 'rrp',
  event_id        UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  display_order   INT DEFAULT 0,
  custom_blurb    TEXT,                              -- Override description for this newsletter
  custom_headline TEXT,                              -- Override title for this newsletter
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (issue_date, market, event_id)              -- An event can only be picked once per issue
);

CREATE INDEX IF NOT EXISTS idx_newsletter_picks_issue
  ON newsletter_picks (market, issue_date);

CREATE INDEX IF NOT EXISTS idx_newsletter_picks_event_recent
  ON newsletter_picks (event_id, issue_date DESC);
