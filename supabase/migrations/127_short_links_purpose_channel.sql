-- ── Tracked links — richer categorization for finding + measuring ─────────
--
-- short_links has organically grown two distinct use cases:
--   1. Printed QR codes in the magazine                        (existing)
--   2. Tracked CTA buttons on internal on-site ad placements   (existing)
-- ...and the editor now wants a third:
--   3. External campaign links for off-site distribution        (Facebook ads,
--      Instagram, email blasts, landing-page traffic, etc.)
--
-- All three share the same redirect + UTM mechanism — they only differ in
-- intent (printable QR vs. on-site ad CTA vs. external campaign URL) and
-- in where the link physically lives. Splitting them into separate tables
-- would duplicate the redirect plumbing. Instead we add two thin
-- discriminator columns and let the admin UI partition the view.
--
-- Backwards compatibility:
--   - Defaults make existing INSERTs continue to work unchanged.
--   - Backfill statements stamp the right purpose+channel on existing rows
--     so the new filter chips immediately show the correct counts on
--     first load.
--   - `last_clicked_at` defaults to NULL. /go/[shortcode] starts stamping
--     it on every click; old rows just won't have a value until the next
--     click comes through.

-- purpose — the WHAT: qr (printable), ad (on-site CTA), campaign (external).
-- Default 'qr' matches the original use case of this table; new rows from
-- the QR form continue working without code changes. The tracked-link
-- API for ad placements explicitly overrides to 'ad'.
ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'qr'
    CHECK (purpose IN ('qr', 'ad', 'campaign'));

-- channel — the WHERE: print, on_site, facebook, instagram, tiktok,
-- email, landing_page, other. Free text under a soft contract so we can
-- add new platforms without a migration. Nullable: a row that's not
-- earmarked for a specific channel just doesn't get filtered on that
-- axis.
ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS channel TEXT NULL;

-- last_clicked_at — for the "Most recently clicked" sort and for
-- spotting stale shortcodes. Stamped by /go/[shortcode] on every hit.
ALTER TABLE short_links
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ NULL;

-- Backfill: existing rows minted by /admin/ads/[id]/edit are ad-link
-- rows. Stamp purpose+channel on them so the new filters group them
-- correctly on first load. Everything else stays at the column default
-- ('qr' + NULL channel) which is correct for legacy QR codes.
UPDATE short_links
   SET purpose = 'ad',
       channel = COALESCE(channel, 'on_site')
 WHERE ad_placement_id IS NOT NULL
   AND purpose = 'qr';   -- only touch rows that haven't been re-classified

-- Legacy QR rows: stamp channel='print' so they aren't lumped in with
-- channel-less rows in the admin filter. Skip rows that already have
-- a channel set (forward-compat in case a partial backfill ran).
UPDATE short_links
   SET channel = 'print'
 WHERE ad_placement_id IS NULL
   AND channel IS NULL
   AND purpose = 'qr';

-- Indexes for the new filter axes. Partial on purpose='qr' (the largest
-- expected partition once campaign links are in production) so the
-- index payload stays small.
CREATE INDEX IF NOT EXISTS short_links_purpose_idx
  ON short_links (purpose);
CREATE INDEX IF NOT EXISTS short_links_channel_idx
  ON short_links (channel)
  WHERE channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS short_links_last_clicked_idx
  ON short_links (last_clicked_at DESC NULLS LAST);
