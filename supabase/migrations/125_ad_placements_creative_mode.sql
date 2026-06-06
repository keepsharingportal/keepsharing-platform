-- Migration 125: ad_placements.creative_mode
--
-- Two creative formats are now supported per ad row:
--
--   'composed' (default)
--     The platform formats the ad — eyebrow, headline, description,
--     CTA label, CTA link, image. Best for local advertisers who want
--     consistent typography and don't have a designer.
--
--   'image'
--     The advertiser delivers a finished image (built by their agency
--     or our in-house designer). We render it full-bleed at the slot's
--     natural dimensions, clickable to ad_link. No text composition.
--     Best for corporate / agency advertisers who want full creative
--     control.
--
-- Both modes use the same row; switching is just toggling this column.
-- All the composed-mode fields stay on the row even in image mode so
-- the editor can flip back without re-entering everything.
--
-- Locked to 'composed' on a small set of placement types where the
-- format doesn't make sense (newsletter sponsor block, footer partner
-- logo strip, page sponsor banner). That's a UI-level guard — the DB
-- doesn't enforce it.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS creative_mode TEXT NOT NULL DEFAULT 'composed'
    CHECK (creative_mode IN ('composed', 'image'));

CREATE INDEX IF NOT EXISTS idx_ad_placements_creative_mode
  ON ad_placements (creative_mode) WHERE creative_mode = 'image';
