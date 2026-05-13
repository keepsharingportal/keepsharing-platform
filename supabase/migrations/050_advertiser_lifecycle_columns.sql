-- ─────────────────────────────────────────────────────────────────────────────
-- 050: Partner lifecycle tracking — adds operational columns to advertiser_accounts
-- Supports: lifecycle stages, loyalty tiers, sponsor position tracking,
-- upgrade flagging, renewal priority windows, and retention risk signals.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Lifecycle stage ───────────────────────────────────────────────────────────
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT advertiser_lifecycle_stage_check
    CHECK (lifecycle_stage IN (
      'lead',
      'consultation',
      'proposal',
      'onboarding',
      'active',
      'upgrade-ready',
      'sponsor-qualified',
      'renewal',
      'dormant',
      'reactivation'
    ));

-- ── Loyalty tier (computed from contract_start_date; backfilled below) ────────
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT NOT NULL DEFAULT 'bronze'
    CONSTRAINT advertiser_loyalty_tier_check
    CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- ── Category Sponsor position tracking ───────────────────────────────────────
-- If this account holds a Category Sponsor position, record which one.
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS sponsor_guide_slug     TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_category_slug  TEXT;

-- Enforce: a business can only hold one sponsor position at a time
-- (multi-guide sponsorship requires a separate agreement for each guide)
-- No unique constraint here — enforced at application layer for flexibility.

-- ── Renewal priority window ───────────────────────────────────────────────────
-- Category Sponsors get a 60-day priority renewal window before their
-- position is offered to the waiting list.
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS renewal_priority_until TIMESTAMPTZ;

-- ── Operational flags ─────────────────────────────────────────────────────────
-- When Jason flagged this account for an upgrade conversation (Tier 2 → 3)
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS upgrade_flagged_at TIMESTAMPTZ;

-- When engagement / renewal signals suggest retention risk
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS at_risk_flagged_at TIMESTAMPTZ;

-- Internal ops notes — not customer-facing
ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS ops_notes TEXT;

-- ── Loyalty tier compute function ─────────────────────────────────────────────
-- bronze:   0–12 months
-- silver:   12–24 months
-- gold:     24–36 months
-- platinum: 36+ months
CREATE OR REPLACE FUNCTION compute_loyalty_tier(start_date DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN start_date <= (CURRENT_DATE - INTERVAL '3 years')  THEN 'platinum'
    WHEN start_date <= (CURRENT_DATE - INTERVAL '2 years')  THEN 'gold'
    WHEN start_date <= (CURRENT_DATE - INTERVAL '1 year')   THEN 'silver'
    ELSE 'bronze'
  END;
$$;

COMMENT ON FUNCTION compute_loyalty_tier IS
  'Returns loyalty tier string based on contract start date. '
  'Call at renewal / lifecycle update to keep loyalty_tier current.';

-- ── Backfill existing accounts ────────────────────────────────────────────────
UPDATE advertiser_accounts
SET
  loyalty_tier    = compute_loyalty_tier(contract_start_date::date),
  lifecycle_stage = CASE
    WHEN package_tier IS NOT NULL AND contract_end_date >= CURRENT_DATE THEN 'active'
    WHEN package_tier IS NOT NULL AND contract_end_date < CURRENT_DATE  THEN 'dormant'
    ELSE 'lead'
  END
WHERE contract_start_date IS NOT NULL;

-- ── Comments ──────────────────────────────────────────────────────────────────
COMMENT ON COLUMN advertiser_accounts.lifecycle_stage IS
  'Current stage in the 10-stage partner lifecycle. '
  'Updated manually by ops or via GHL webhook. '
  'Stages: lead → consultation → proposal → onboarding → active → '
  'upgrade-ready → sponsor-qualified → renewal → dormant → reactivation.';

COMMENT ON COLUMN advertiser_accounts.loyalty_tier IS
  'Computed from contract_start_date via compute_loyalty_tier(). '
  'Determines sponsor priority access order. '
  'bronze=0-12mo, silver=12-24mo, gold=24-36mo, platinum=36mo+.';

COMMENT ON COLUMN advertiser_accounts.sponsor_guide_slug IS
  'If this account is a Category Sponsor, the guide slug they sponsor in. '
  'NULL means no current category sponsorship.';

COMMENT ON COLUMN advertiser_accounts.sponsor_category_slug IS
  'If this account is a Category Sponsor, the category slug they hold. '
  'One business = one exclusive category position at a time.';

COMMENT ON COLUMN advertiser_accounts.renewal_priority_until IS
  'Category Sponsors get a 60-day priority renewal window. '
  'Set to (contract_end_date + 60 days) when sponsor agreement is signed. '
  'Position is held for them until this date before going to waiting list.';

COMMENT ON COLUMN advertiser_accounts.upgrade_flagged_at IS
  'Timestamp when Jason flagged this account as upgrade-ready. '
  'Trigger: 90+ days active, positive engagement signals.';

COMMENT ON COLUMN advertiser_accounts.at_risk_flagged_at IS
  'Timestamp when retention risk was flagged. '
  'Triggers: no response to 30-day check-in, renewal email opened but no reply, '
  'partner mentions budget changes, listing shows no engagement after 90 days.';

COMMENT ON COLUMN advertiser_accounts.ops_notes IS
  'Internal ops notes — not customer-facing. '
  'Jason uses this for context on calls, relationship notes, follow-up reminders.';
