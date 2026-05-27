-- Migration 090: Admin users (multi-tenant access control)
--
-- Phase 2 of the events build-out and the foundation for the rest of the
-- multi-market admin. Establishes who can sign into /admin/* and which
-- markets they're allowed to see.
--
--   role='super'     → access to every market (publications.slug), including
--                       a synthetic 'all' view that aggregates across markets.
--   role='publisher' → access limited to allowed_markets (TEXT[]). A Publisher
--                       with one market sees just that brand; with multiple
--                       sees a brand switcher.
--   role='editor'    → same scoping rules as publisher, intended for write
--                       access without billing/settings (enforced in app code).
--
-- Auth model: rows are keyed on auth.users.id (Supabase auth). Email is kept
-- for display + safety (an account email change keeps the link). The
-- chokepoint sits in src/middleware.ts — pages and API routes read the
-- decoded context from request headers instead of querying this table on
-- every render.
--
-- This is intentionally a single table with TEXT[] of markets. A future
-- join-table refactor (per-market roles) can layer on without breaking the
-- header shape, since the middleware will just stay the authority on what
-- shows up in headers.

CREATE TABLE IF NOT EXISTS admin_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- nullable so a row can be pre-provisioned by email before first login
  email            TEXT NOT NULL,
  full_name        TEXT,
  role             TEXT NOT NULL DEFAULT 'publisher', -- 'super' | 'publisher' | 'editor'
  allowed_markets  TEXT[] NOT NULL DEFAULT '{}',      -- publication slugs from publications.slug; ignored when role='super'
  status           TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'suspended'
  notes            TEXT,                              -- internal notes
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_chk CHECK (role IN ('super','publisher','editor')),
  CONSTRAINT admin_users_status_chk CHECK (status IN ('active','suspended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_users_email_lower
  ON admin_users (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_users_user_id
  ON admin_users (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_role
  ON admin_users (role, status);

CREATE OR REPLACE FUNCTION touch_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION touch_admin_users_updated_at();

-- ── Seed the super admin ────────────────────────────────────────────────────
-- jade31994@gmail.com is the platform owner. user_id auto-links on first
-- middleware lookup once they're signed in via Supabase auth (the middleware
-- backfills user_id from email).
INSERT INTO admin_users (email, full_name, role, allowed_markets, status)
VALUES ('jade31994@gmail.com', 'Jason Watson', 'super', '{}', 'active')
ON CONFLICT (LOWER(email)) DO NOTHING;

-- ── Market scoping on calendar_events ───────────────────────────────────────
-- All other admin-scoped tables (school_bits, schools, community_organizations,
-- trusted_event_sources) already have a market column. calendar_events does
-- not — backfill every existing row to 'rrp' since that's where the platform
-- started.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'rrp';

CREATE INDEX IF NOT EXISTS idx_calendar_events_market_alive
  ON calendar_events (market, status, start_date)
  WHERE deleted_at IS NULL;
