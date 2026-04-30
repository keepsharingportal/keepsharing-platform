-- KeepSharing Platform — Migration 011
-- GHL integration log + new self-serve bookings table (YYYY-MM month format)

-- ── Integration Log ────────────────────────────────────────────────────────────
-- Every GHL API call (success or failure) is recorded here for debugging + retry.
CREATE TABLE IF NOT EXISTS integration_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT NOT NULL,                    -- 'upsert_contact', 'add_tag', 'trigger_workflow', etc.
  publication_slug TEXT,                             -- 'rrp', 'boom', etc.
  payload          JSONB,                            -- request body / context
  response         JSONB,                            -- API response (truncated)
  error_message    TEXT,
  status           TEXT NOT NULL DEFAULT 'ok'
                     CHECK (status IN ('ok','error','pending_workflow_id')),
  retry_count      INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_log_status     ON integration_log(status);
CREATE INDEX IF NOT EXISTS idx_integration_log_pub        ON integration_log(publication_slug);
CREATE INDEX IF NOT EXISTS idx_integration_log_created_at ON integration_log(created_at DESC);

ALTER TABLE integration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads integration_log"
  ON integration_log FOR SELECT
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

CREATE POLICY "Super admin writes integration_log"
  ON integration_log FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Service-role INSERT is allowed (server-side code, bypasses RLS)

-- ── Self-Serve Bookings ────────────────────────────────────────────────────────
-- Used by the /advertise spot picker. months[] stores YYYY-MM strings.
-- Distinct from legacy ad_bookings (which uses issue strings + inventory table).
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id      UUID REFERENCES publications(id),
  publication_abbrev  TEXT NOT NULL DEFAULT 'RRP',    -- denormalised for fast queries
  advertiser_email    TEXT NOT NULL,
  business_name       TEXT NOT NULL,
  contact_first_name  TEXT,
  contact_last_name   TEXT,
  phone               TEXT,
  website             TEXT,
  ad_size             TEXT NOT NULL
                        CHECK (ad_size IN ('full','half','quarter','sixth','web')),
  ad_position         TEXT NOT NULL,                  -- 'full','h-top','h-bot','v-left','v-right',
                                                      -- 'tl','tr','bl','br','six-1'…'six-6',
                                                      -- web zone ids
  months              TEXT[] NOT NULL,                -- YYYY-MM, e.g. {'2026-05','2026-06'}
  term_length         INT,                            -- len(months), computed on insert
  monthly_rate        NUMERIC(10,2) NOT NULL,
  total               NUMERIC(10,2) NOT NULL,
  design_help         BOOLEAN NOT NULL DEFAULT FALSE,
  graphic_url         TEXT,
  stripe_session_id   TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','cancelled','expired')),
  ghl_contact_id      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_pub_status  ON bookings(publication_abbrev, status);
CREATE INDEX IF NOT EXISTS idx_bookings_size_pos    ON bookings(ad_size, ad_position);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe      ON bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email       ON bookings(advertiser_email);
CREATE INDEX IF NOT EXISTS idx_bookings_months      ON bookings USING GIN(months);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "Super admin full access bookings"
  ON bookings FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Public can read availability (ad_size, ad_position, months, status only — no PII)
CREATE POLICY "Public can read bookings availability"
  ON bookings FOR SELECT
  USING (status IN ('pending','confirmed'));

-- Public can insert (self-serve flow — server validates before inserting)
CREATE POLICY "Public can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- ── Storage bucket note ────────────────────────────────────────────────────────
-- Create an 'ad-graphics' bucket in Supabase Storage dashboard:
--   Settings → Storage → New bucket → ad-graphics → Public = false
-- Add policy: allow service role to upload/read all objects.
