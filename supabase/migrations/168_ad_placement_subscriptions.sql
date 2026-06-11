-- ── Stripe Phase 2 — recurring subscriptions for ad placements ────────────
--
-- Phase 1 (migrations 151 + 156): one-time Stripe Checkout for the
-- "Claim This Spot" flow. Advertiser pays once, the placement activates,
-- the advertiser comes back to renew manually each month.
--
-- Phase 2 (this migration): real recurring subscriptions through Stripe.
-- The publisher generates a renewal link for an existing placement; the
-- advertiser clicks → Stripe Checkout in subscription mode → monthly
-- invoices auto-charge → the placement's end_date extends with each
-- successful payment. Subscription cancellation or payment failure flows
-- back via the existing webhook (the webhook is already extended to
-- handle these events; see /api/webhooks/stripe).
--
-- The link is a 256-bit base64url renewal token (same shape as the
-- advertiser report tokens) — easy to email + survives URL forwarding.

ALTER TABLE ad_placements
  -- Once the advertiser subscribes, the Stripe subscription id lives here.
  -- NULL until they activate; populated by the webhook on
  -- customer.subscription.created with metadata.placement_id.
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT NULL,
  -- Mirror of the Stripe subscription status the webhook keeps in sync.
  -- 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete'
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NULL,
  -- The end of the currently-paid period. Webhook updates this on every
  -- invoice.payment_succeeded so the placement stays active until the
  -- subscription is canceled OR a payment fails.
  ADD COLUMN IF NOT EXISTS subscription_period_end DATE NULL,
  -- 256-bit base64url renewal token, emailed to the advertiser. Visiting
  -- /renew/<token> hands off to Stripe Checkout in subscription mode for
  -- the linked stripe_products row. NULL when the publisher hasn't
  -- generated one yet.
  ADD COLUMN IF NOT EXISTS renewal_token           TEXT NULL,
  ADD COLUMN IF NOT EXISTS renewal_token_created_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_placements_renewal_token
  ON ad_placements (renewal_token) WHERE renewal_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ad_placements_subscription
  ON ad_placements (subscription_status, subscription_period_end);

COMMENT ON COLUMN ad_placements.stripe_subscription_id IS
  'Stripe subscription id once the advertiser activates a recurring renewal. Updated by the webhook.';
COMMENT ON COLUMN ad_placements.subscription_status IS
  'Mirror of the live Stripe status. Webhook keeps in sync via customer.subscription.* events.';
COMMENT ON COLUMN ad_placements.subscription_period_end IS
  'End of the currently-paid period. Extended on each invoice.payment_succeeded so the placement stays active until cancellation or payment failure.';
COMMENT ON COLUMN ad_placements.renewal_token IS
  'Per-placement renewal token (256-bit base64url). The advertiser visits /renew/<token> to subscribe via Stripe Checkout.';
