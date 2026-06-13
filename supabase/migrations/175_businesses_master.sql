-- ── businesses — single master table for every real business ─────────────────
--
-- Before this migration, business profile data was scattered across:
--   - circulation_stops     (name, address, socials, logo)
--   - guide_listings        (via advertiser_accounts join, plus guide_data JSONB)
--   - advertiser_accounts   (business_name, contact info)
-- That meant updating an Instagram handle for River Region Ballet required
-- touching three tables. With many businesses across markets, drift was
-- guaranteed.
--
-- The new architecture: `businesses` owns the canonical profile. Each of
-- the three child tables gets a `business_id` FK pointing here. Once
-- backfilled (via /api/admin/businesses/backfill) the duplicate columns
-- on the child tables can be deprecated in a follow-up migration.
--
-- Soft-delete via archived_at (same pattern as advertiser_accounts). Use
-- merged_into_id when a business is detected as a duplicate of another —
-- preserves history while pointing queries at the canonical row.

CREATE TABLE IF NOT EXISTS businesses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ───────────────────────────────────────────────────────────
  name            TEXT        NOT NULL,
  -- Lowercase + punctuation-stripped name, used for matching. Indexed.
  normalized_name TEXT        NOT NULL,

  -- ── Location ───────────────────────────────────────────────────────────
  address         TEXT,
  city            TEXT,
  state           TEXT        DEFAULT 'AL',
  zip             TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,

  -- ── Contact ────────────────────────────────────────────────────────────
  contact_name    TEXT,
  phone           TEXT,
  email           TEXT,

  -- ── Online presence ────────────────────────────────────────────────────
  website         TEXT,
  instagram       TEXT,
  facebook        TEXT,
  tiktok          TEXT,

  -- ── Brand assets ───────────────────────────────────────────────────────
  logo_path       TEXT,
  description     TEXT,
  -- Free-form tags; the admin Business profile page renders them as chips.
  categories      TEXT[]      NOT NULL DEFAULT '{}',

  -- ── Lifecycle ──────────────────────────────────────────────────────────
  archived_at     TIMESTAMPTZ,
  -- Duplicate handling. When set, this row should be treated as merged
  -- into the canonical one — the admin Businesses page surfaces these as
  -- 'redirected' so the editor can clean up child-table FKs.
  merged_into_id  UUID        REFERENCES businesses(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_normalized_name
  ON businesses (normalized_name);
CREATE INDEX IF NOT EXISTS idx_businesses_active
  ON businesses (created_at DESC)
  WHERE archived_at IS NULL AND merged_into_id IS NULL;

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS businesses_service ON businesses;
CREATE POLICY businesses_service ON businesses FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS businesses_admin ON businesses;
CREATE POLICY businesses_admin   ON businesses FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── updated_at touch trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION businesses_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_touch_updated_at_trg ON businesses;
CREATE TRIGGER businesses_touch_updated_at_trg
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION businesses_touch_updated_at();

-- ── FK columns on the three child tables ─────────────────────────────────
-- All nullable so existing rows aren't broken until the backfill walks
-- them. After backfill, /admin/businesses surfaces any null-FK rows so
-- editorial can decide whether to link or archive them.

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
