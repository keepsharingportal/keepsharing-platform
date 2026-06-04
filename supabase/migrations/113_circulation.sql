-- Migration 113: Circulation (physical magazine distribution)
--
-- Ports the schema of the standalone PHP "Distribution Portal" that ran at
-- drivers.keepsharing.com into our multi-tenant Supabase + Next.js stack.
-- Every table is market-scoped (rrp, boom, aop, mbp, esp, gpp) so future
-- city launches don't need a second deployment — they just get rows under
-- their own market slug.
--
-- Naming convention: every table is prefixed `circulation_` so it never
-- collides with the editorial `community_submissions` / `guide_articles`
-- ecosystem. The admin section that drives this lives at /admin/circulation
-- (labeled "Distribution Routes" in the sidebar).
--
-- Tables in this migration:
--   circulation_routes              — named delivery routes per market
--   circulation_stops               — individual delivery locations with GPS
--   circulation_drivers             — driver-specific properties on auth users
--   circulation_driver_routes       — many-to-many driver↔route assignments
--   circulation_deliveries          — monthly delivery records per route+driver
--   circulation_delivery_stops      — per-stop checklist + driver notes/flags
--   circulation_change_requests     — driver-submitted stop edits awaiting review
--   circulation_location_requests   — public location-request submissions
--   circulation_route_suggestions   — driver-suggested route order changes
--   circulation_route_snapshots     — route order history (restore points)
--   circulation_email_templates     — editable subject/body for 7 automated emails
--   circulation_route_schedules     — per-route delivery + invoice schedule
--
-- The standalone portal stored stops + per-publication quantities in
-- separate tables. We collapse that into a single JSONB column on
-- circulation_stops because per-pub qty is small, append-only data that
-- never needs to be queried independently of its stop.

-- ─────────────────────────────────────────────────────────────────────────────
-- Routes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_routes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market      TEXT        NOT NULL DEFAULT 'rrp',
  name        TEXT        NOT NULL,
  city        TEXT        NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  notes       TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_routes_market
  ON circulation_routes (market, sort_order, name);

-- ─────────────────────────────────────────────────────────────────────────────
-- Stops
-- ─────────────────────────────────────────────────────────────────────────────
-- `quantities` is a JSONB like {"rrp": 25, "boom": 10} — per-publication
-- copy counts. Total copies for a route = SUM across all its stops.
CREATE TABLE IF NOT EXISTS circulation_stops (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market               TEXT        NOT NULL DEFAULT 'rrp',
  route_id             UUID        NOT NULL REFERENCES circulation_routes(id) ON DELETE CASCADE,
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  name                 TEXT        NOT NULL,
  address              TEXT        NULL,
  city                 TEXT        NULL,
  zip                  TEXT        NULL,
  notes                TEXT        NULL,
  contact_name         TEXT        NULL,
  contact_phone        TEXT        NULL,
  contact_email        TEXT        NULL,
  -- Advertiser flags — drive the featured-stop styling on the public map.
  is_pickup            BOOLEAN     NOT NULL DEFAULT FALSE,
  is_advertiser        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured          BOOLEAN     NOT NULL DEFAULT FALSE,
  ad_level             TEXT        NOT NULL DEFAULT '',  -- '' | 'gold' | 'platinum'
  logo_path            TEXT        NULL,
  website              TEXT        NULL,
  instagram            TEXT        NULL,
  facebook             TEXT        NULL,
  tiktok               TEXT        NULL,
  -- Geocoding
  lat                  DOUBLE PRECISION NULL,
  lng                  DOUBLE PRECISION NULL,
  -- Active = whether to render in the driver's checklist this month.
  active               BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Not delivering = stop is paused (e.g. on a holiday). Stays visible
  -- with a yellow marker, just doesn't count toward the route total.
  not_delivering       BOOLEAN     NOT NULL DEFAULT FALSE,
  not_delivering_note  TEXT        NULL,
  -- {"rrp": 25, "boom": 10} — copies of each publication.
  quantities           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_stops_route
  ON circulation_stops (route_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_circulation_stops_market
  ON circulation_stops (market) WHERE active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drivers
-- ─────────────────────────────────────────────────────────────────────────────
-- A driver is a Supabase auth user with a row here. Distinct from
-- admin_users — drivers never see the admin chrome, they only see
-- /distribution/[market]/driver. Bookkeepers and editors keep their
-- admin_users rows.
CREATE TABLE IF NOT EXISTS circulation_drivers (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  market         TEXT        NOT NULL DEFAULT 'rrp',
  full_name      TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT        NULL,
  rate_per_stop  NUMERIC(8,2) NOT NULL DEFAULT 0,
  -- can_view_all → driver can see every route as read-only (training mode)
  can_view_all   BOOLEAN     NOT NULL DEFAULT FALSE,
  notes          TEXT        NULL,
  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_circulation_drivers_email
  ON circulation_drivers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_circulation_drivers_market
  ON circulation_drivers (market) WHERE active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Driver ↔ Route assignments (composite PK, no surrogate id)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_driver_routes (
  driver_id  UUID NOT NULL REFERENCES circulation_drivers(user_id) ON DELETE CASCADE,
  route_id   UUID NOT NULL REFERENCES circulation_routes(id)       ON DELETE CASCADE,
  PRIMARY KEY (driver_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_circulation_driver_routes_route
  ON circulation_driver_routes (route_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Deliveries — monthly cycle. One row per driver+route+month.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market          TEXT        NOT NULL DEFAULT 'rrp',
  route_id        UUID        NOT NULL REFERENCES circulation_routes(id),
  driver_id       UUID        NOT NULL REFERENCES circulation_drivers(user_id),
  month           TEXT        NOT NULL,  -- YYYY-MM
  status          TEXT        NOT NULL DEFAULT 'draft', -- draft|submitted|reviewed|paid
  stops_completed INTEGER     NOT NULL DEFAULT 0,
  -- pay_calculated = sum of (rate_per_stop × stops_completed). Editable
  -- by the admin in the deliveries view (e.g. fuel bonus, partial pay).
  pay_calculated  NUMERIC(10,2) NOT NULL DEFAULT 0,
  pay_adjustment  NUMERIC(10,2) NOT NULL DEFAULT 0,
  pay_adjustment_note TEXT NULL,
  driver_notes    TEXT        NULL,
  submitted_at    TIMESTAMPTZ NULL,
  reviewed_at     TIMESTAMPTZ NULL,
  paid_at         TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_id, driver_id, month)
);

CREATE INDEX IF NOT EXISTS idx_circulation_deliveries_market_month
  ON circulation_deliveries (market, month DESC);

CREATE INDEX IF NOT EXISTS idx_circulation_deliveries_driver
  ON circulation_deliveries (driver_id, month DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Delivery stops — per-stop check-offs + notes + flags
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_delivery_stops (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID        NOT NULL REFERENCES circulation_deliveries(id) ON DELETE CASCADE,
  stop_id     UUID        NOT NULL REFERENCES circulation_stops(id),
  checked     BOOLEAN     NOT NULL DEFAULT FALSE,
  checked_at  TIMESTAMPTZ NULL,
  notes       TEXT        NULL,
  -- Flag types from the PHP portal: closed | wrong_address | wrong_qty | new_stop | other
  flag        TEXT        NULL,
  flag_note   TEXT        NULL,
  UNIQUE (delivery_id, stop_id)
);

CREATE INDEX IF NOT EXISTS idx_circulation_delivery_stops_delivery
  ON circulation_delivery_stops (delivery_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Driver change requests — edits to a stop the admin must approve
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_change_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market      TEXT        NOT NULL DEFAULT 'rrp',
  stop_id     UUID        NULL REFERENCES circulation_stops(id),
  route_id    UUID        NOT NULL REFERENCES circulation_routes(id),
  driver_id   UUID        NOT NULL REFERENCES circulation_drivers(user_id),
  -- edit | close | new | qty | move
  type        TEXT        NOT NULL,
  field_name  TEXT        NULL,
  old_value   TEXT        NULL,
  new_value   TEXT        NULL,
  notes       TEXT        NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID        NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_change_requests_status
  ON circulation_change_requests (market, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Public location requests (someone wants their business on the map)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_location_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market        TEXT        NOT NULL DEFAULT 'rrp',
  business_name TEXT        NOT NULL,
  address       TEXT        NULL,
  contact_name  TEXT        NULL,
  contact_phone TEXT        NULL,
  contact_email TEXT        NULL,
  publications  TEXT        NULL,  -- comma-separated short names
  notes         TEXT        NULL,
  status        TEXT        NOT NULL DEFAULT 'pending', -- pending|approved|rejected|added
  reviewed_by   UUID        NULL REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_location_requests_status
  ON circulation_location_requests (market, status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Route order suggestions — driver proposes a new stop order
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_route_suggestions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID        NOT NULL REFERENCES circulation_routes(id) ON DELETE CASCADE,
  driver_id   UUID        NOT NULL REFERENCES circulation_drivers(user_id),
  -- Array of stop_ids in the proposed order.
  suggestion  JSONB       NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  reviewed_by UUID        NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Route snapshots — restore points for stop order ("Before May edits")
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_route_snapshots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id   UUID        NOT NULL REFERENCES circulation_routes(id) ON DELETE CASCADE,
  snapshot   JSONB       NOT NULL,
  label      TEXT        NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Email templates — the 7 automated emails the PHP portal sent. Editable
-- in admin once the Email Center UI ships; until then, defaults are seeded.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_email_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market       TEXT        NOT NULL DEFAULT 'rrp',
  key          TEXT        NOT NULL, -- driver_welcome | invoice_confirmation | etc.
  name         TEXT        NOT NULL,
  subject      TEXT        NOT NULL,
  body_html    TEXT        NOT NULL,
  -- auto = triggered by an event | manual = admin clicks Send | scheduled = day-of-month
  trigger_type TEXT        NOT NULL DEFAULT 'auto',
  send_day     INTEGER     NOT NULL DEFAULT 1,
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  description  TEXT        NULL,
  UNIQUE (market, key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-route schedule settings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS circulation_route_schedules (
  route_id           UUID    PRIMARY KEY REFERENCES circulation_routes(id) ON DELETE CASCADE,
  delivery_start_day INTEGER NOT NULL DEFAULT 1,   -- day of month "on our way" emails go out
  archive_day        INTEGER NOT NULL DEFAULT 20,  -- day delivery invoices archive
  late_submit_days   INTEGER NOT NULL DEFAULT 10   -- days past month-end driver can still submit
);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers for the tables that need them
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION circulation_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_circ_routes_updated_at      ON circulation_routes;
DROP TRIGGER IF EXISTS trg_circ_stops_updated_at       ON circulation_stops;
DROP TRIGGER IF EXISTS trg_circ_drivers_updated_at     ON circulation_drivers;
DROP TRIGGER IF EXISTS trg_circ_deliveries_updated_at  ON circulation_deliveries;

CREATE TRIGGER trg_circ_routes_updated_at      BEFORE UPDATE ON circulation_routes     FOR EACH ROW EXECUTE FUNCTION circulation_touch_updated_at();
CREATE TRIGGER trg_circ_stops_updated_at       BEFORE UPDATE ON circulation_stops      FOR EACH ROW EXECUTE FUNCTION circulation_touch_updated_at();
CREATE TRIGGER trg_circ_drivers_updated_at     BEFORE UPDATE ON circulation_drivers    FOR EACH ROW EXECUTE FUNCTION circulation_touch_updated_at();
CREATE TRIGGER trg_circ_deliveries_updated_at  BEFORE UPDATE ON circulation_deliveries FOR EACH ROW EXECUTE FUNCTION circulation_touch_updated_at();
