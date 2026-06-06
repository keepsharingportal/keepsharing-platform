-- Migration 122: unify section sponsors into ad_placements
--
-- column_sponsors was its own table from before ad_placements supported
-- context_slug. Now that ad_placements + context_slug + placement_type
-- = 'section_sponsor' covers the same concept, we collapse the two into
-- one system so the editor has ONE mental model:
--
--   "An ad_placements row is every paid placement on the site."
--
-- Renewal cron, lead capture, rotation logic, the slot catalog UI —
-- all of these now apply to section sponsors automatically.
--
-- We DON'T drop column_sponsors yet. Keep it for one release cycle so
-- a rollback is one-line revert. After the editor has confirmed the
-- new path works for live sponsors, we can DROP it in a later migration.
--
-- Columns added to ad_placements:
--   accent_color    — per-column brand color (Play Ball red, Mom rose, etc.)
--   logo_url        — distinct from ad_image_url; rendered as a logo, not a hero
--   sponsor_tagline — italicized tagline under the sponsor name in the banner
--
-- Existing column_sponsors rows are imported once via a DO-block guard
-- so re-running the migration is a no-op.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS accent_color    TEXT,
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_tagline TEXT;

DO $$
BEGIN
  -- Only import if no section_sponsor rows have been imported yet AND
  -- the legacy table actually has rows worth importing.
  IF NOT EXISTS (
    SELECT 1 FROM ad_placements
    WHERE placement_type = 'section_sponsor'
      AND context_type   = 'column'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'column_sponsors'
  ) THEN
    INSERT INTO ad_placements (
      placement_type, context_type, context_slug, advertiser_account_id,
      ad_eyebrow, ad_headline, ad_link, ad_cta_label,
      accent_color, logo_url, sponsor_tagline,
      starts_at, ends_at, is_active, display_priority
    )
    SELECT
      'section_sponsor',
      'column',
      column_slug,
      advertiser_id,
      COALESCE(sponsor_label, 'Sponsored by'),
      sponsor_name,
      cta_url,
      COALESCE(cta_label, 'Learn More'),
      accent_color,
      logo_url,
      sponsor_message,
      start_date::timestamptz,
      (end_date::timestamptz) + INTERVAL '1 day' - INTERVAL '1 second',
      is_active,
      100   -- highest priority so they win against any rotation pool
    FROM column_sponsors;
  END IF;
END $$;
