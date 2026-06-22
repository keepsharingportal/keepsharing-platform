-- 210_advertiser_onboarding_token.sql
--
-- Tokenized magic-link auth for the onboarding wizard.
-- An admin (or future self-serve signup form) generates a UUID token
-- that's emailed to the business owner. The token is the credential
-- for the public /advertise/edit/[token] wizard route — they can
-- bookmark the URL and return any time before expiration.
--
-- expires_at: NULL means never expires (default for admin-issued links
-- since the editor is often building the listing themselves before
-- the business takes over). Self-serve signups will set this to
-- something like +90 days.

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS onboarding_token             UUID,
  ADD COLUMN IF NOT EXISTS onboarding_token_issued_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_token_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_status            TEXT DEFAULT 'admin_managed';
                                                     -- 'admin_managed' (default — admin runs the wizard)
                                                     -- 'invited'       (admin sent the magic link, awaiting first edit)
                                                     -- 'self_signup'   (came in via /advertise/get-started)
                                                     -- 'in_progress'   (token used at least once)
                                                     -- 'submitted'     (business saved & exited; ready for review/publish)

CREATE UNIQUE INDEX IF NOT EXISTS idx_advertiser_accounts_onboarding_token
  ON advertiser_accounts (onboarding_token)
  WHERE onboarding_token IS NOT NULL;
