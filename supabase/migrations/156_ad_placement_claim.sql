-- ── Ad placement claim flow ────────────────────────────────────────────────
-- Public "Claim This Spot" via Stripe Checkout. Adds the bookkeeping
-- columns ad_placements needs to know it has been self-serve claimed.

ALTER TABLE ad_placements
  ADD COLUMN IF NOT EXISTS claimed_email      TEXT NULL,
  ADD COLUMN IF NOT EXISTS claimed_at         TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS stripe_session_id  TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_placements_claimed
  ON ad_placements (claimed_at DESC) WHERE claimed_at IS NOT NULL;

COMMENT ON COLUMN ad_placements.claimed_email IS
  'Email captured at Stripe Checkout for a self-serve claim. Editorial follows up to onboard the advertiser.';
