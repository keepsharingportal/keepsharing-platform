-- Migration 123: short_links.ad_placement_id
--
-- Ties a short_link row to an ad_placement so each ad CTA can be
-- click-tracked through the existing /go/<shortcode> redirect (same
-- pipeline that powers magazine QR codes — UTM-appended, increments
-- click_count, rolls into the same reports).
--
-- One short_link per ad is the common case, but the schema doesn't
-- enforce it — the editor could mint multiple (e.g., one for the print
-- ad, one for the digital ad) and they'll all attribute to the same
-- ad_placement_id.
--
-- Pre-095 deploys that haven't gotten the advertiser_account_id column
-- yet are fine — these are independent FK columns.

ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS ad_placement_id UUID REFERENCES ad_placements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_short_links_ad_placement
  ON short_links (ad_placement_id) WHERE ad_placement_id IS NOT NULL;
