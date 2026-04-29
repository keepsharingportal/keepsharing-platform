-- Summer Fun Guide v2: extended fields for richer filtering, geocoding, and tier system

-- New boolean fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS before_after_care      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_needs_friendly  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS faith_based             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drop_in_available       BOOLEAN NOT NULL DEFAULT FALSE;

-- New text / detail fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS camp_director_name TEXT,
  ADD COLUMN IF NOT EXISTS discount_code      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url      TEXT,
  ADD COLUMN IF NOT EXISTS virtual_tour_url   TEXT;

-- Geocoding fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS latitude    DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS longitude   DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ;

-- Listing tier (replaces using featured/advertiser booleans for tier logic)
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS listing_tier TEXT
    NOT NULL DEFAULT 'community'
    CHECK (listing_tier IN ('community', 'enhanced', 'advertiser'));

-- Expand registration_status to include opening-soon
ALTER TABLE summer_fun_guide
  DROP CONSTRAINT IF EXISTS summer_fun_guide_registration_status_check;
ALTER TABLE summer_fun_guide
  ADD CONSTRAINT summer_fun_guide_registration_status_check
    CHECK (registration_status IN ('open', 'waitlist', 'full', 'opening-soon', 'tbd'));

-- Backfill listing_tier from existing booleans
UPDATE summer_fun_guide SET listing_tier = 'advertiser' WHERE advertiser = TRUE;
UPDATE summer_fun_guide SET listing_tier = 'enhanced'   WHERE advertiser = FALSE AND featured = TRUE;
-- community is the default, no UPDATE needed

-- Indexes for new filter columns
CREATE INDEX IF NOT EXISTS idx_sfg_tier           ON summer_fun_guide(listing_tier);
CREATE INDEX IF NOT EXISTS idx_sfg_before_after   ON summer_fun_guide(before_after_care);
CREATE INDEX IF NOT EXISTS idx_sfg_financial_aid  ON summer_fun_guide(financial_aid_available);
CREATE INDEX IF NOT EXISTS idx_sfg_coords         ON summer_fun_guide(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sfg_reg_status     ON summer_fun_guide(registration_status);
