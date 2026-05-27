-- Migration 094: Short links for print → digital tracking.
--
-- Every QR code in the magazine points to /go/<shortcode> instead of a raw
-- URL. The redirect appends UTM parameters automatically so the proxy's
-- first-touch attribution captures "this visit came from the May 2026
-- magazine via a QR code on the Play Ball ad."
--
-- Staff mints shortcodes in /admin/content/short-links. The shortcode is
-- what appears under the QR in print (e.g., "riverregionparents.com/go/playball").
-- Clean for print, trackable for analytics.

CREATE TABLE IF NOT EXISTS short_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcode     TEXT NOT NULL,                -- the /go/<this> part
  destination   TEXT NOT NULL,                -- full path like /calendar/events/play-ball-2026-05-30
  -- UTM fields — auto-appended to the destination on redirect. Staff picks
  -- these when creating the link; defaults cover the 90% case (magazine QR).
  utm_source    TEXT NOT NULL DEFAULT 'magazine',
  utm_medium    TEXT NOT NULL DEFAULT 'qr',
  utm_campaign  TEXT,                         -- e.g., 'may2026', 'summer-guide-2026'
  utm_content   TEXT,                         -- optional label: 'play-ball-ad', 'cover-qr'
  -- Bookkeeping
  label         TEXT,                         -- human note: "Play Ball May 2026 QR"
  click_count   INT NOT NULL DEFAULT 0,
  market        TEXT NOT NULL DEFAULT 'rrp',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_short_links_code
  ON short_links (LOWER(shortcode))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_short_links_active
  ON short_links (is_active, shortcode);

-- Bump click count atomically on each redirect
CREATE OR REPLACE FUNCTION increment_short_link_click(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE short_links SET click_count = click_count + 1 WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
