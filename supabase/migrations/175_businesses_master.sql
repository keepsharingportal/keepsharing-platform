-- ── businesses — single master table for every real business ─────────────────
--
-- A `businesses` table exists from 001_initial_schema.sql (the original CRM
-- with owner_name + billing_*). This migration evolves it into THE canonical
-- profile so circulation_stops, guide_listings, and advertiser_accounts can
-- all FK to it — one place to edit name/address/socials/logo.
--
-- Strategy: ADD COLUMN IF NOT EXISTS so the migration works on both fresh
-- installs (table from 001 will already exist) and live databases. Legacy
-- billing_* columns are mirrored into address/city/state/zip so existing
-- data is preserved AND queryable by the new code path.

-- ── 1. Ensure the table exists (no-op if 001 already ran) ────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- ── 2. Add every column the new profile model needs ──────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address         TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city            TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state           TEXT DEFAULT 'AL';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS zip             TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lat             DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lng             DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contact_name    TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website         TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram       TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook        TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tiktok          TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_path       TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS categories      TEXT[]      NOT NULL DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS merged_into_id  UUID REFERENCES businesses(id);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 3. Mirror legacy billing_* into the new address fields ───────────────
-- Done in pgs DO block so it only runs when the legacy columns are present
-- (fresh installs won't have them).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'billing_street'
  ) THEN
    EXECUTE 'UPDATE businesses SET address = billing_street WHERE address IS NULL AND billing_street IS NOT NULL';
    EXECUTE 'UPDATE businesses SET city    = billing_city   WHERE city    IS NULL AND billing_city   IS NOT NULL';
    EXECUTE 'UPDATE businesses SET state   = billing_state  WHERE state   IS NULL AND billing_state  IS NOT NULL';
    EXECUTE 'UPDATE businesses SET zip     = billing_zip    WHERE zip     IS NULL AND billing_zip    IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'owner_name'
  ) THEN
    EXECUTE 'UPDATE businesses SET contact_name = owner_name WHERE contact_name IS NULL AND owner_name IS NOT NULL';
  END IF;
END $$;

-- ── 4. Backfill normalized_name from name, then enforce NOT NULL ─────────
-- Mirrors the JS normalizer in src/lib/businesses/normalize.ts: lowercase,
-- strip punctuation, collapse whitespace, drop legal suffixes. SQL can't
-- reproduce the full synonym map (st→saint, blvd→boulevard) but this gets
-- the column populated and indexable; the JS layer re-normalizes on writes.
UPDATE businesses
SET normalized_name = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(lower(name), '[''’]', '', 'g'),  -- strip apostrophes
      '\m(inc|llc|incorporated|corp|corporation|company|co)\.?\M', '', 'g'),  -- drop legal suffixes
    '[^a-z0-9\s]', ' ', 'g'),  -- non-alphanum → space
  '\s+', ' ', 'g'                                       -- collapse runs of whitespace
)
WHERE normalized_name IS NULL;

UPDATE businesses SET normalized_name = trim(normalized_name);
ALTER TABLE businesses ALTER COLUMN normalized_name SET NOT NULL;

-- ── 5. Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_normalized_name
  ON businesses (normalized_name);
CREATE INDEX IF NOT EXISTS idx_businesses_active
  ON businesses (created_at DESC)
  WHERE archived_at IS NULL AND merged_into_id IS NULL;

-- ── 6. RLS ───────────────────────────────────────────────────────────────
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS businesses_service ON businesses;
CREATE POLICY businesses_service ON businesses FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS businesses_admin ON businesses;
CREATE POLICY businesses_admin   ON businesses FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── 7. updated_at touch trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION businesses_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_touch_updated_at_trg ON businesses;
CREATE TRIGGER businesses_touch_updated_at_trg
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION businesses_touch_updated_at();

-- ── 8. FK columns on the three child tables ──────────────────────────────
-- All nullable so existing rows aren't broken until backfill walks them.
-- After backfill, /admin/businesses surfaces any null-FK rows so editorial
-- can link or archive them.
ALTER TABLE circulation_stops
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_circulation_stops_business
  ON circulation_stops (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE guide_listings
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_guide_listings_business
  ON guide_listings (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_business
  ON advertiser_accounts (business_id) WHERE business_id IS NOT NULL;
