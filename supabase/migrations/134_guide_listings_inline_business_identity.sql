-- ── guide_listings — inline business identity columns ──────────────────────
--
-- Historic state: every guide listing required a linked advertiser_accounts
-- row because all the display data (business_name, phone, address, etc.)
-- lived there. CSV-imported guide listings auto-created an
-- advertiser_account per row, polluting the CRM 'Businesses' view with
-- hundreds of directory-only entries.
--
-- New model: guide_listings carries its OWN copy of the business
-- identity fields, so a listing can stand on its own as content. The
-- advertiser_account_id FK (already nullable per migration 028)
-- becomes a pure cross-reference, populated only when a listing is
-- claimed and upgraded to a Featured/paid tier — that's the bridge
-- that creates a real CRM advertiser.
--
-- This migration:
--   1. Adds inline business identity columns to guide_listings (all
--      nullable — a listing built from scratch via admin would only
--      need business_name).
--   2. Backfills from linked advertiser_accounts so existing public
--      pages keep rendering correctly once they switch to prefer the
--      inline columns.
--   3. Leaves the FK nullable (no schema change there — already was).
--
-- Public rendering reads inline columns first, falls back to the
-- advertiser_accounts join for any row where the migration didn't
-- backfill (e.g. extremely old data with broken FKs). This keeps
-- prod stable through the transition.

ALTER TABLE guide_listings
  ADD COLUMN IF NOT EXISTS business_name      TEXT,
  ADD COLUMN IF NOT EXISTS office_phone       TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone       TEXT,
  ADD COLUMN IF NOT EXISTS website_url        TEXT,
  ADD COLUMN IF NOT EXISTS contact_email      TEXT,
  ADD COLUMN IF NOT EXISTS address            TEXT,
  ADD COLUMN IF NOT EXISTS city_state_zip     TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood       TEXT,
  ADD COLUMN IF NOT EXISTS hero_photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS card_hook          TEXT;

-- Backfill: copy every populated field from the linked advertiser_account
-- into the new inline columns. Only overwrites NULL columns so re-running
-- the migration is safe and editor-set values are preserved.
UPDATE guide_listings gl
SET
  business_name  = COALESCE(gl.business_name,  a.business_name),
  office_phone   = COALESCE(gl.office_phone,   a.office_phone),
  mobile_phone   = COALESCE(gl.mobile_phone,   a.mobile_phone),
  website_url    = COALESCE(gl.website_url,    a.website_url),
  contact_email  = COALESCE(gl.contact_email,  a.contact_email),
  address        = COALESCE(gl.address,        a.address),
  city_state_zip = COALESCE(gl.city_state_zip, a.city_state_zip),
  neighborhood   = COALESCE(gl.neighborhood,   a.neighborhood),
  hero_photo_url = COALESCE(gl.hero_photo_url, a.hero_photo_url),
  card_hook      = COALESCE(gl.card_hook,      a.card_hook)
FROM advertiser_accounts a
WHERE gl.advertiser_account_id = a.id;

-- An index on business_name supports the upcoming admin browse view
-- ('listings in this guide sorted alphabetically'). Partial since most
-- queries filter by guide_type_slug + published anyway.
CREATE INDEX IF NOT EXISTS idx_guide_listings_business_name
  ON guide_listings (business_name)
  WHERE business_name IS NOT NULL;
