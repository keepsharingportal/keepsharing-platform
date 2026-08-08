-- 218_column_sponsorships.sql
--
-- Persistent-creative sponsorship model for Education Matters (and any
-- future editorial column that sells annual/multi-month sponsorships).
--
-- Different shape than ad_bookings (inventory-slot self-serve). Here the
-- sponsor's creative persists for a date range and every article in that
-- column during the range picks it up automatically — no per-article
-- re-entry.
--
-- Scope decision: one sponsor per column per period. UI enforces one
-- ACTIVE row per column at a time; the schema uses an exclusion
-- constraint so overlapping active rows in the same column are rejected
-- at the DB layer too.
--
-- FK → advertiser_accounts so the sponsor ties back to the master
-- Business record (per the "Business is top-level" rule). Also allowed
-- to be NULL for a first-pass entry before the advertiser row exists,
-- but the admin UI encourages picking one.

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- needed for the exclusion constraint below

CREATE TABLE IF NOT EXISTS column_sponsorships (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_slug            TEXT NOT NULL,
  advertiser_account_id  UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,

  -- Contract dates. Inclusive on both ends. UI collects month picks
  -- but stores as first-of-month → last-of-month for clean range math.
  start_month            DATE NOT NULL,
  end_month              DATE NOT NULL,

  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'ended', 'pending')),

  -- Creative fields (mirror what the per-article editor USED to collect
  -- inside spotlight_data — those columns get removed from the article
  -- editor in the same commit).
  sponsor_name           TEXT NOT NULL,
  sponsor_url            TEXT,
  sponsor_tagline        TEXT,
  sponsor_description    TEXT,
  sponsor_logo_url       TEXT,
  sponsor_image_url      TEXT,
  sponsor_button_text    TEXT,   -- null → layout defaults to "Learn More"

  notes                  TEXT,   -- internal admin notes (contract #, salesperson, etc.)
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT start_le_end CHECK (start_month <= end_month)
);

CREATE INDEX IF NOT EXISTS column_sponsorships_column_slug_idx
  ON column_sponsorships(column_slug);
CREATE INDEX IF NOT EXISTS column_sponsorships_advertiser_idx
  ON column_sponsorships(advertiser_account_id);
CREATE INDEX IF NOT EXISTS column_sponsorships_active_range_idx
  ON column_sponsorships(column_slug, start_month, end_month)
  WHERE status = 'active';

-- No two ACTIVE sponsorships for the same column can overlap in time.
-- daterange('[]') = inclusive on both ends; matches the CHECK semantics.
-- Enforced at the DB so a race in the admin UI can't create doubles.
ALTER TABLE column_sponsorships
  ADD CONSTRAINT column_sponsorships_no_overlap
  EXCLUDE USING gist (
    column_slug WITH =,
    daterange(start_month, end_month, '[]') WITH &&
  )
  WHERE (status = 'active');

-- Auto-touch updated_at
CREATE OR REPLACE FUNCTION touch_column_sponsorships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS column_sponsorships_touch ON column_sponsorships;
CREATE TRIGGER column_sponsorships_touch
  BEFORE UPDATE ON column_sponsorships
  FOR EACH ROW EXECUTE FUNCTION touch_column_sponsorships_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Layout reads with the service-role key (server-side), so no public
-- SELECT policy is needed. Admin gets full access.

ALTER TABLE column_sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_column_sponsorships" ON column_sponsorships
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_all_column_sponsorships" ON column_sponsorships
  FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
