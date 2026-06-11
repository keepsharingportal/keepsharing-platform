-- ── Stripe — self-serve revenue + recurring subscriptions ───────────────────
--
-- Highest-leverage business automation we can add: eliminates manual
-- invoicing, captures advertisers at the moment of intent, enables true
-- recurring revenue.
--
-- What ships:
--   stripe_integrations    — account credentials + test/live toggle
--   stripe_products        — local mirror of Stripe products (ad placements,
--                            Featured upgrades, sponsor tiers) so we can
--                            link directly from our pages without round-
--                            tripping the Stripe API
--   stripe_subscriptions   — local mirror of active advertiser subscriptions
--                            (updated via webhook)
--   stripe_charges_log     — append-only log of every charge for audit +
--                            advertiser reports
--   stripe_checkout_sessions — outbound sessions we created, keyed to the
--                            source (claim_spot, featured_upgrade, etc.)
--                            so the webhook handler knows what to do with
--                            a completed session
--
-- Webhook endpoint: /api/webhooks/stripe — verifies signature using
-- webhook_signing_secret from the integration row.
--
-- All writes go through the webhook + admin actions. RLS service-role
-- only; no public reads.

CREATE TABLE IF NOT EXISTS stripe_integrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stripe account id (acct_...) for display; the actual auth is the
  -- secret_key. Both are pulled fresh on connect.
  account_id               TEXT NULL,
  account_name             TEXT NULL,
  secret_key               TEXT NOT NULL,
  publishable_key          TEXT NOT NULL,
  webhook_signing_secret   TEXT NULL,
  is_test_mode             BOOLEAN NOT NULL DEFAULT TRUE,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  last_webhook_at          TIMESTAMPTZ NULL,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_by             UUID NULL,                       -- admin_users.id
  -- Only one active Stripe integration per market right now (single tenant).
  UNIQUE (is_active)                                         -- enforced for is_active=true via partial index below
);
-- Postgres can't do "UNIQUE where is_active = true" inline, so drop the
-- unique constraint above and replace with a partial index.
ALTER TABLE stripe_integrations DROP CONSTRAINT IF EXISTS stripe_integrations_is_active_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_integrations_one_active
  ON stripe_integrations ((1)) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS stripe_products (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stripe ids (prod_..., price_...) — both stored so we can link to the
  -- right price/period without re-querying Stripe each request.
  stripe_product_id        TEXT NOT NULL,
  stripe_price_id          TEXT NOT NULL,
  -- What kind of thing this product represents on our side. Drives where
  -- the checkout button shows up and how the webhook routes a completed
  -- session.
  kind                     TEXT NOT NULL CHECK (kind IN (
    'ad_placement',           -- maps to a specific ad_placements row
    'featured_upgrade',       -- maps to advertiser_packages tier upgrade
    'sponsor_tier',           -- maps to advertiser_packages tier renewal
    'event_listing',          -- maps to a featured calendar event
    'one_time'                -- catch-all (donations, ad-hoc invoices)
  )),
  -- The advertiser_accounts / ad_placements / advertiser_packages row this
  -- product is tied to (nullable for catch-all kinds).
  target_table             TEXT NULL,
  target_id                UUID NULL,
  -- Display fields for the checkout page.
  display_name             TEXT NOT NULL,
  display_description      TEXT NULL,
  price_cents              INT NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  interval                 TEXT NULL CHECK (interval IS NULL OR interval IN ('month', 'quarter', 'year')),
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID NULL,
  UNIQUE (stripe_price_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_products_target
  ON stripe_products (target_table, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_products_kind
  ON stripe_products (kind, is_active);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id   TEXT NOT NULL UNIQUE,
  stripe_customer_id       TEXT NOT NULL,
  advertiser_account_id    UUID NULL,                       -- resolved by webhook via metadata
  product_id               UUID NULL REFERENCES stripe_products(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL,                   -- active | past_due | canceled | unpaid | trialing
  current_period_start     DATE NULL,
  current_period_end       DATE NULL,
  cancel_at                DATE NULL,
  canceled_at              TIMESTAMPTZ NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_advertiser
  ON stripe_subscriptions (advertiser_account_id, status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
  ON stripe_subscriptions (status, current_period_end);

CREATE TABLE IF NOT EXISTS stripe_charges_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_charge_id         TEXT NOT NULL UNIQUE,
  stripe_invoice_id        TEXT NULL,
  stripe_customer_id       TEXT NOT NULL,
  advertiser_account_id    UUID NULL,
  amount_cents             INT NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   TEXT NOT NULL,                   -- succeeded | failed | pending | refunded
  description              TEXT NULL,
  receipt_url              TEXT NULL,
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_charges_advertiser
  ON stripe_charges_log (advertiser_account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_charges_recent
  ON stripe_charges_log (occurred_at DESC);

CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id        TEXT NOT NULL UNIQUE,
  product_id               UUID NULL REFERENCES stripe_products(id) ON DELETE SET NULL,
  -- Where this checkout originated. Drives the post-success handling.
  source                   TEXT NOT NULL,                   -- claim_spot | featured_upgrade | renewal | one_time
  -- The thing the session is buying — e.g. ad_placements.id for claim_spot.
  target_table             TEXT NULL,
  target_id                UUID NULL,
  -- Customer-facing metadata that flowed through Checkout.
  customer_email           TEXT NULL,
  customer_name            TEXT NULL,
  amount_cents             INT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_sessions_target
  ON stripe_checkout_sessions (target_table, target_id);

ALTER TABLE stripe_integrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_charges_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_checkout_sessions    ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE stripe_integrations IS
  'Stripe account credentials. Single active integration per env (partial unique index).';
COMMENT ON TABLE stripe_products IS
  'Local mirror of Stripe products. Each row points to the thing being sold (ad placement, tier, etc.) so the webhook + checkout button know how to route.';
COMMENT ON TABLE stripe_subscriptions IS
  'Local mirror of active subscriptions, kept in sync by the webhook handler.';
COMMENT ON TABLE stripe_charges_log IS
  'Append-only log of every charge — audit trail + per-advertiser revenue history.';
COMMENT ON TABLE stripe_checkout_sessions IS
  'Outbound Checkout sessions we created. Webhook completion handler reads source/target to apply the right side effect (activate spot, upgrade tier, etc.).';
