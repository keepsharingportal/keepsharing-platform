-- ── Weekly Polls ──────────────────────────────────────────────────────────
--
-- A lightweight engagement primitive that runs on both parents and
-- fifty-plus brand homepages. Each poll has a question, up to 6 options,
-- and a scheduled open/close window. Readers vote anonymously (the same
-- device_token pattern reader_favorites uses — migration 164) so we don't
-- gate engagement behind a sign-up. If the reader later subscribes to
-- the newsletter, their email stamps onto the response row.
--
-- Polls can be scoped to a specific brand_slug, or NULL = "all brands".
-- That gives editors a fast path to ship a regional poll without manually
-- creating one per brand.
--
-- Schema decisions:
--   - options stored as TEXT[] (not a separate options table) — polls have
--     2-6 options that never change after publish. A table would add joins
--     for zero benefit.
--   - responses keyed by (poll_id, device_token) UNIQUE so a reader can't
--     spam. They CAN change their vote (PATCH replaces option_index).
--   - ip_hash is SHA-256 of the IP + a server-side salt. Lets us spot
--     abuse without storing raw IPs.
--   - vote counts denormalized onto the polls row via the bump RPC so
--     the public widget doesn't aggregate-on-read.

CREATE TABLE IF NOT EXISTS weekly_polls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = poll runs on every brand; specific slug = brand-scoped.
  brand_slug      TEXT NULL,
  question        TEXT NOT NULL,
  -- Display options. Order matters — option_index in responses refers to
  -- this array's 0-based index. 2-6 options enforced via CHECK.
  options         TEXT[] NOT NULL CHECK (array_length(options, 1) BETWEEN 2 AND 6),
  -- Visibility window. opens_at NULL = visible immediately. closes_at NULL
  -- = open indefinitely (we cap weekly polls to ~7 days but legacy / one-
  -- off polls can stay open).
  opens_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at       TIMESTAMPTZ NULL,
  -- Denormalized vote counts (per option) bumped by the vote RPC. Keeps
  -- the public-widget render to a single point read.
  vote_counts     INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  total_votes     INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Optional: editor notes (for internal tracking — not shown publicly).
  internal_notes  TEXT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_polls_brand_window
  ON weekly_polls (brand_slug, opens_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_weekly_polls_active_global
  ON weekly_polls (opens_at DESC) WHERE brand_slug IS NULL AND is_active = TRUE;

CREATE TABLE IF NOT EXISTS weekly_poll_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID NOT NULL REFERENCES weekly_polls(id) ON DELETE CASCADE,
  device_token    TEXT NOT NULL,
  -- Optional: stamped when the device has been linked to a newsletter
  -- subscriber. Same pattern as reader_favorites.email.
  email           TEXT NULL,
  -- 0-based index into the poll's options[] array.
  option_index    INTEGER NOT NULL,
  -- Salted SHA-256 of the voter's IP. Helps detect coordinated abuse
  -- without retaining raw addresses.
  ip_hash         TEXT NULL,
  voted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_weekly_poll_responses_poll
  ON weekly_poll_responses (poll_id, voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_poll_responses_email
  ON weekly_poll_responses (email) WHERE email IS NOT NULL;

ALTER TABLE weekly_polls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_poll_responses   ENABLE ROW LEVEL SECURITY;

-- ── RPC: record a vote atomically ────────────────────────────────────────
-- Handles three cases in one call:
--   (a) Fresh vote — insert response, bump counts.
--   (b) Vote-change — same device picks a different option. Replace
--       option_index, bump new count, decrement old.
--   (c) Re-vote same option — no-op (returns the poll row).
-- Always returns the polls row after mutation so the widget can re-render
-- with fresh counts from the same round trip.
CREATE OR REPLACE FUNCTION record_poll_vote(
  p_poll_id      UUID,
  p_device_token TEXT,
  p_option_index INTEGER,
  p_ip_hash      TEXT DEFAULT NULL,
  p_email        TEXT DEFAULT NULL
) RETURNS weekly_polls
LANGUAGE plpgsql AS $$
DECLARE
  v_poll      weekly_polls%ROWTYPE;
  v_prev_idx  INTEGER;
  v_counts    INTEGER[];
  v_opt_count INTEGER;
BEGIN
  SELECT * INTO v_poll FROM weekly_polls WHERE id = p_poll_id;
  IF NOT FOUND OR NOT v_poll.is_active THEN
    RAISE EXCEPTION 'poll not found or inactive';
  END IF;
  -- Window check
  IF v_poll.opens_at > NOW() OR (v_poll.closes_at IS NOT NULL AND v_poll.closes_at < NOW()) THEN
    RAISE EXCEPTION 'poll not currently open';
  END IF;
  -- Bounds check on option_index
  v_opt_count := array_length(v_poll.options, 1);
  IF p_option_index < 0 OR p_option_index >= v_opt_count THEN
    RAISE EXCEPTION 'option_index out of range';
  END IF;

  -- Initialize vote_counts if it's the wrong length (handles polls created
  -- before the count denorm existed, or options-array length drift).
  v_counts := v_poll.vote_counts;
  IF array_length(v_counts, 1) IS NULL OR array_length(v_counts, 1) <> v_opt_count THEN
    v_counts := array_fill(0, ARRAY[v_opt_count]);
  END IF;

  -- Check for an existing response
  SELECT option_index INTO v_prev_idx
    FROM weekly_poll_responses
   WHERE poll_id = p_poll_id AND device_token = p_device_token;

  IF FOUND THEN
    -- Re-vote same option — touch nothing (no double count, no error)
    IF v_prev_idx = p_option_index THEN
      RETURN v_poll;
    END IF;
    -- Vote-change: swap counts, update response
    v_counts[v_prev_idx + 1]     := GREATEST(0, v_counts[v_prev_idx + 1] - 1);
    v_counts[p_option_index + 1] := COALESCE(v_counts[p_option_index + 1], 0) + 1;
    UPDATE weekly_poll_responses
       SET option_index = p_option_index, voted_at = NOW(),
           ip_hash      = COALESCE(p_ip_hash, ip_hash),
           email        = COALESCE(p_email, email)
     WHERE poll_id = p_poll_id AND device_token = p_device_token;
  ELSE
    -- Fresh vote
    v_counts[p_option_index + 1] := COALESCE(v_counts[p_option_index + 1], 0) + 1;
    INSERT INTO weekly_poll_responses (poll_id, device_token, option_index, ip_hash, email)
    VALUES (p_poll_id, p_device_token, p_option_index, p_ip_hash, p_email);
    UPDATE weekly_polls
       SET total_votes = total_votes + 1
     WHERE id = p_poll_id;
  END IF;

  UPDATE weekly_polls
     SET vote_counts = v_counts, updated_at = NOW()
   WHERE id = p_poll_id
  RETURNING * INTO v_poll;
  RETURN v_poll;
END;
$$;

COMMENT ON TABLE weekly_polls IS
  'Per-brand (or all-brands) reader polls. Vote counts denormalized via record_poll_vote RPC.';
COMMENT ON FUNCTION record_poll_vote IS
  'Atomic vote record + count bump. Handles fresh / vote-change / re-vote in one call.';
