-- Migration 038: Listing badges + send-message capture + newsletter subscribers

-- ── Badge fields on advertiser_accounts ──
ALTER TABLE advertiser_accounts
ADD COLUMN IF NOT EXISTS has_military_discount BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_veteran_owned       BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_woman_owned         BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_minority_owned      BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_locally_owned       BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_messages       BOOLEAN DEFAULT true;

-- ── Listing messages (parents → advertisers) ──
CREATE TABLE IF NOT EXISTS listing_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  guide_type_slug       TEXT,
  parent_name           TEXT NOT NULL,
  parent_email          TEXT NOT NULL,
  parent_phone          TEXT,
  message               TEXT NOT NULL,
  source_url            TEXT,
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  status                TEXT DEFAULT 'new', -- new / read / replied / archived
  read_at               TIMESTAMPTZ,
  replied_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_messages_advertiser
  ON listing_messages(advertiser_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_messages_status
  ON listing_messages(status, created_at DESC);

-- ── Newsletter subscribers (if not already created by migration 026) ──
-- Migration 026 created newsletter_subscribers with a different schema.
-- We add columns idempotently without breaking the existing table.
ALTER TABLE newsletter_subscribers
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown';

-- ── Seed badge data on known businesses so badges render in dev/staging ──
DO $$
BEGIN
  UPDATE advertiser_accounts SET has_military_discount = true
  WHERE slug = 'alabama-christian-academy';

  UPDATE advertiser_accounts SET is_locally_owned = true
  WHERE slug = 'dentistry-for-children';

  UPDATE advertiser_accounts SET is_locally_owned = true, is_woman_owned = true
  WHERE business_name ILIKE '%River Region Parents%';
END $$;
