-- Migration 116: Circulation Phase C additions
--
-- Mostly net-new schema for the community resources directory + a few
-- columns to track Phase C features (driver tools, geocoding history).

-- ── Community resources directory ───────────────────────────────────────
-- Shown on the public map as a secondary layer — local non-pickup community
-- resources (libraries, parks, family services). Per-region just like
-- everything else in circulation_*.
CREATE TABLE IF NOT EXISTS circulation_resources (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market       TEXT        NOT NULL DEFAULT 'rrp',
  name         TEXT        NOT NULL,
  category     TEXT        NULL,     -- Health | Education | Family | Community | etc.
  description  TEXT        NULL,
  address      TEXT        NULL,
  city         TEXT        NULL,
  phone        TEXT        NULL,
  website      TEXT        NULL,
  email        TEXT        NULL,
  lat          DOUBLE PRECISION NULL,
  lng          DOUBLE PRECISION NULL,
  logo_url     TEXT        NULL,
  photo_url    TEXT        NULL,
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_circulation_resources_market
  ON circulation_resources (market, sort_order, name)
  WHERE active = TRUE;

DROP TRIGGER IF EXISTS trg_circ_resources_updated_at ON circulation_resources;
CREATE TRIGGER trg_circ_resources_updated_at BEFORE UPDATE ON circulation_resources
  FOR EACH ROW EXECUTE FUNCTION circulation_touch_updated_at();

-- ── Circulation publications (master record for each magazine) ─────────
-- Per-publication metadata for the distribution system — print_total,
-- holdback, brand color, website, Issuu URL. Distinct from the existing
-- `publications` table (which migration 011 uses for ad bookings, with a
-- different schema).
CREATE TABLE IF NOT EXISTS circulation_publications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name  TEXT        NOT NULL,   -- 'rrp' | 'boom' | ...
  name        TEXT        NOT NULL,   -- 'River Region Parents'
  abbrev      TEXT        NOT NULL,   -- 'RRP'
  color_hex   TEXT        NOT NULL DEFAULT '#1A5FA8',
  logo_url    TEXT        NULL,
  print_total INTEGER     NOT NULL DEFAULT 5000,
  holdback    INTEGER     NOT NULL DEFAULT 50,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  website     TEXT        NULL,
  issuu_url   TEXT        NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_circulation_publications_short_name
  ON circulation_publications (short_name);

-- Seed RRP + Boom if not already there.
INSERT INTO circulation_publications (short_name, name, abbrev, color_hex, print_total, holdback, sort_order)
SELECT * FROM (VALUES
  ('rrp',  'River Region Parents', 'RRP',  '#1A5FA8', 5000, 50, 1),
  ('boom', 'River Region Boom',    'Boom', '#B45309', 3800, 50, 2)
) AS d (short_name, name, abbrev, color_hex, print_total, holdback, sort_order)
ON CONFLICT (short_name) DO NOTHING;

-- ── Geocoding history (for the geocoder UI) ─────────────────────────────
-- Tracks every batch geocode run so the admin can see when stops were
-- last geocoded and what the provider/result was.
CREATE TABLE IF NOT EXISTS circulation_geocode_runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market        TEXT        NOT NULL DEFAULT 'rrp',
  provider      TEXT        NOT NULL DEFAULT 'osm', -- 'osm' | 'google'
  requested_by  UUID        NULL REFERENCES auth.users(id),
  stops_total   INTEGER     NOT NULL DEFAULT 0,
  stops_success INTEGER     NOT NULL DEFAULT 0,
  stops_failed  INTEGER     NOT NULL DEFAULT 0,
  error         TEXT        NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_circulation_geocode_runs_market
  ON circulation_geocode_runs (market, started_at DESC);
