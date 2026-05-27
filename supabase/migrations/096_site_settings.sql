-- Migration 096: Site settings (key-value store).
--
-- Lightweight configuration that staff can toggle from the admin without
-- a code deploy. First use case: maintenance mode — a Super Admin flips
-- a switch, the public site shows a branded "We'll be right back" page,
-- admin stays fully functional so staff can fix whatever needs fixing,
-- then flip it back when done.

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the maintenance flag off
INSERT INTO site_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
