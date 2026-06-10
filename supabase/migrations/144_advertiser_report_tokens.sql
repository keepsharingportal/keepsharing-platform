-- ── Advertiser report tokens ────────────────────────────────────────────────
--
-- Each advertiser gets one stable, unguessable URL at /r/<token> that they
-- can revisit anytime to see their up-to-date performance numbers. The
-- token is 256 bits of CSPRNG output, URL-safe base64, ~43 chars. Brute
-- force is intractable.
--
-- View count + last_viewed_at let admin spot which advertisers actually
-- open their reports (helpful for renewal conversations: "you opened it
-- four times in November — what stood out?").
--
-- Regenerating the token revokes the prior URL. Used when:
--   - We suspect a link was forwarded outside the advertiser's org
--   - An advertiser asks for a fresh URL
--   - A contract ends and we want to cut access cleanly

CREATE TABLE IF NOT EXISTS advertiser_report_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id   UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NULL,                 -- admin_users.id
  last_viewed_at  TIMESTAMPTZ NULL,
  view_count      INT NOT NULL DEFAULT 0,
  -- Optional soft-deactivate without dropping the row (so we keep the
  -- audit history of who held what).
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- One active token per advertiser is the operational model. The unique
-- partial index enforces it without blocking historical/inactive rows
-- from coexisting.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_token_per_advertiser
  ON advertiser_report_tokens (advertiser_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_advertiser_report_tokens_lookup
  ON advertiser_report_tokens (token)
  WHERE is_active = TRUE;

ALTER TABLE advertiser_report_tokens ENABLE ROW LEVEL SECURITY;
-- Service role only. The public report page uses the service-role client
-- to look up the token + load report data. No anon policies.

COMMENT ON TABLE advertiser_report_tokens IS
  'Stable per-advertiser report URLs (riverregionparents.com/r/<token>). One active token per advertiser; regenerating mints a new one and deactivates the old.';
