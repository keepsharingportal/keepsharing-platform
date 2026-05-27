-- Migration 091: Four-tier admin role + invite/last-login tracking
--
-- Phase 3 of the admin build-out. Adds the missing senior-staff tier
-- between Super and Publisher, and the bookkeeping columns the user
-- management UI needs (last seen, who invited whom, when).
--
-- Role tiers (most → least powerful):
--   super     — platform owner. Manages billing, settings, every brand,
--               and can create/edit/demote any other admin including
--               other supers. Typically 1–2 humans.
--   admin     — senior staff with cross-brand reach but no billing.
--               Can create + manage publishers and editors, cannot
--               touch super or admin rows.
--   publisher — runs one or more specific brands end-to-end (content,
--               distribution, events).
--   editor    — content-only on one or more brands. No settings access.
--
-- The role hierarchy is enforced in app code (src/lib/admin/permissions.ts),
-- not as a DB rule, so we can layer in finer-grained capabilities later
-- without re-running migrations.

ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_chk;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_chk
  CHECK (role IN ('super','admin','publisher','editor'));

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_last_login
  ON admin_users (last_login_at DESC NULLS LAST)
  WHERE status = 'active';
