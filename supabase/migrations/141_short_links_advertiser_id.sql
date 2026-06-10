-- ── short_links.advertiser_id ───────────────────────────────────────────────
--
-- Direct advertiser binding for short links that aren't tied to an
-- ad_placement (Facebook campaign URLs, social posts, magazine print
-- promos for the advertiser brand-wide rather than a specific ad). The
-- existing ad_placement_id column (migration 123) handles per-ad CTAs;
-- this column handles the rest.
--
-- Backfill: any link with a non-null ad_placement_id inherits the
-- advertiser from that placement so historical rows roll into the
-- advertiser report automatically.

ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS advertiser_id UUID
    REFERENCES advertiser_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_short_links_advertiser
  ON short_links (advertiser_id) WHERE advertiser_id IS NOT NULL;

-- One-time backfill: pull advertiser_id through the ad_placement join.
-- ad_placements names its FK 'advertiser_account_id', not 'advertiser_id' —
-- both point at advertiser_accounts(id). Skipped if the link already has an
-- advertiser explicitly assigned, or if there's no ad_placement to pull
-- from. Safe to re-run.
UPDATE short_links sl
   SET advertiser_id = ap.advertiser_account_id
  FROM ad_placements ap
 WHERE sl.ad_placement_id     IS NOT NULL
   AND sl.advertiser_id       IS NULL
   AND ap.id                  =  sl.ad_placement_id
   AND ap.advertiser_account_id IS NOT NULL;

COMMENT ON COLUMN short_links.advertiser_id IS
  'Directly binds a short link to an advertiser. Used by the advertiser monthly report to aggregate clicks across QR codes, Facebook URLs, print promos, etc.';
