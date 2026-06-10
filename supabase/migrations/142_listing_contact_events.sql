-- ── Listing contact events ──────────────────────────────────────────────────
--
-- One row every time a reader taps a phone number, opens an email link,
-- or clicks through to the advertiser's website from a guide listing. This
-- is the single most valuable signal on the advertiser monthly report —
-- impressions tell you you got seen, but a tap is a reader saying "I want
-- to do business with this advertiser."
--
-- Why a dedicated table (not just bumping counters on listings):
--   - per-month rollup on the advertiser report needs a timestamp
--   - we want to attribute by source listing AND by advertiser, so the
--     same advertiser surfaces on multiple guides aggregate cleanly
--   - separate event types (tel, mailto, web) sort independently
--   - lets us spot abuse patterns (one IP tapping 500 times) later
--
-- Storage profile: realistically <100 taps/day in v1. ~80 bytes/row →
-- under 3MB/year. No retention policy needed.

CREATE TABLE IF NOT EXISTS listing_contact_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      TEXT NOT NULL CHECK (event_type IN ('tel', 'mailto', 'website')),
  -- The advertiser that owns the contact info. Required — without it the
  -- event can't roll into a report.
  advertiser_id   UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  -- Which surface the reader was on. Lets us see which guide / page is
  -- producing taps for a given advertiser. Nullable for sources outside
  -- the guide system (e.g. homepage cards).
  source_listing_id  UUID NULL,
  source_path        TEXT NULL,
  -- Privacy: hash IP + day + UA exactly like page_views does. Lets us
  -- dedupe within a session without storing PII.
  session_hash    TEXT NULL,
  -- Light forensic context. Useful for "is this 47 taps actually one bot?"
  referrer_host   TEXT NULL,
  user_agent      TEXT NULL,
  utm_source      TEXT NULL,
  utm_medium      TEXT NULL,
  utm_campaign    TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_contact_advertiser
  ON listing_contact_events (advertiser_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_contact_recent
  ON listing_contact_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_contact_session
  ON listing_contact_events (session_hash, advertiser_id, event_type, occurred_at DESC);

ALTER TABLE listing_contact_events ENABLE ROW LEVEL SECURITY;
-- Service-role only; admin reports read via service role, public tracking
-- endpoint writes via service role. Anon never touches this table.

COMMENT ON TABLE listing_contact_events IS
  'Phone taps / mailto opens / website click-throughs from listings. Drives the highest-value column of the advertiser monthly report.';
