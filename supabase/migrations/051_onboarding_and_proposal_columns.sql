-- ─────────────────────────────────────────────────────────────────────────────
-- 051: Onboarding operations and proposal tracking columns
-- Supports: /admin/advertisers/onboarding and /admin/advertisers/proposals
-- These are Jason-side operational columns separate from partner-facing
-- onboarding_progress (which the partner portal writes to).
-- ─────────────────────────────────────────────────────────────────────────────

-- Internal ops checklist (Jason checks these off during activation)
-- Stores: { photo_received: true, description_approved: false, ... }
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS ops_checklist JSONB NOT NULL DEFAULT '{}';

-- Target go-live date — set during onboarding
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS go_live_target DATE;

-- Jason's private proposal strategy notes (never shown to partner)
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS proposal_notes TEXT;

-- Timestamps for proposal pipeline tracking
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMPTZ;

-- Index for fast lifecycle_stage queries (used by both new pages)
CREATE INDEX IF NOT EXISTS advertiser_accounts_lifecycle_stage_idx
  ON advertiser_accounts (lifecycle_stage);

-- Index for onboarding queue (sorted by when onboarding started)
CREATE INDEX IF NOT EXISTS advertiser_accounts_onboarding_idx
  ON advertiser_accounts (lifecycle_stage, onboarding_started_at)
  WHERE lifecycle_stage = 'onboarding';

-- Comments
COMMENT ON COLUMN advertiser_accounts.ops_checklist IS
  'Internal Jason-side activation checklist. '
  'Keys: photo_received, description_drafted, description_approved, '
  'contact_verified, listing_created, listing_badge_applied, listing_go_live_set, '
  'ghl_tagged, ghl_renewal_set, ghl_agreement_uploaded, '
  'print_ad_received, print_ad_approved, newsletter_slot_booked, '
  'social_brief_done, social_creative_approved, '
  'sponsor_name_confirmed, sponsor_db_set, sponsor_renewal_set, sponsor_kickoff_done. '
  'Separate from partner-facing onboarding_progress.';

COMMENT ON COLUMN advertiser_accounts.go_live_target IS
  'Target go-live date set during onboarding. Tracks against actual published_at.';

COMMENT ON COLUMN advertiser_accounts.proposal_notes IS
  'Jason private strategy notes for proposal preparation. '
  'Never customer-facing. Used in /admin/advertisers/proposals context panel.';

COMMENT ON COLUMN advertiser_accounts.last_contact_at IS
  'Last time Jason contacted this account. '
  'Used to surface stale consultations and follow-up timing.';

COMMENT ON COLUMN advertiser_accounts.consultation_date IS
  'Date of the strategy call. Marks transition from lead → consultation stage.';
