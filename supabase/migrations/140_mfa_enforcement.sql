-- ── Per-user 2FA enforcement ────────────────────────────────────────────────
--
-- Two columns on admin_users that turn the soft 2FA nudge into hard
-- enforcement:
--
--   requires_mfa    — when TRUE, the server-side gate forbids any admin
--                     work until the user has a verified TOTP factor.
--                     Defaults to TRUE so EVERY new user is enforced.
--                     Set FALSE per user only as a deliberate exception.
--
--   mfa_enabled_at  — set on TOTP enrollment-verify, cleared on reset or
--                     factor removal. The gate reads this row instead of
--                     hitting Supabase Auth on every page — fast + cacheable.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS requires_mfa   BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN admin_users.requires_mfa IS
  'When TRUE (default), the admin gate forces this user through 2FA enrollment before any admin work. Set FALSE per user only as a deliberate exception.';

COMMENT ON COLUMN admin_users.mfa_enabled_at IS
  'Set when the user verifies their first TOTP factor; cleared on factor removal or admin-triggered reset. Trusted source for "is 2FA enrolled" — saves a Supabase Auth roundtrip on every admin page.';

-- Existing super admins might already have 2FA set up at the Supabase Auth
-- layer but no mfa_enabled_at stamp. We don't backfill from auth.mfa_factors
-- here because that's an admin-API call, not a SQL one. The /admin/settings/
-- security page on next visit will write the stamp if a verified factor
-- exists. Until then the gate will force re-verification (worst case: one
-- extra trip through the QR scan flow).
