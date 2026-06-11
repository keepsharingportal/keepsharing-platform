-- ── 2FA recovery codes ──────────────────────────────────────────────────────
--
-- When a user loses their authenticator device, the only recovery path
-- today is asking a super-admin to reset their MFA via /admin/users.
-- That's fine for a single missing device, but it's a problem when:
--   - The super-admin has lost their own device
--   - The super-admin is on PTO when an editor needs admin access
--   - It's 2am and a campaign needs publishing
--
-- This adds single-use recovery codes generated at enrollment. The user
-- saves them somewhere safe (1Password, paper, etc.). On the MFA
-- challenge page, "Use a recovery code" path validates one of them,
-- clears their MFA factors (forcing re-enrollment), and lets them
-- continue into admin to set up a new TOTP factor.
--
-- Codes are stored as bcrypt-style salted SHA-256 hashes — we can verify
-- a user's submitted code but can't recover the plaintext if our DB is
-- compromised. They're consumed (deleted from the array) on use so each
-- code is single-use.

ALTER TABLE admin_users
  -- Array of hashed codes. Each element is a hex-encoded SHA-256 hash of
  -- "code:salt". The salt is stored alongside as a separate column so we
  -- can validate without re-deriving it from the user record.
  ADD COLUMN IF NOT EXISTS mfa_recovery_codes_hashed TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mfa_recovery_codes_salt   TEXT NULL,
  -- Bookkeeping — when codes were generated, when the most recent code
  -- was used. Lets us nudge "you have 1 recovery code left, regenerate."
  ADD COLUMN IF NOT EXISTS mfa_recovery_codes_generated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS mfa_recovery_code_last_used_at  TIMESTAMPTZ NULL;

COMMENT ON COLUMN admin_users.mfa_recovery_codes_hashed IS
  'Single-use 2FA recovery codes, salted-hashed. Consumed (popped from array) on use.';
