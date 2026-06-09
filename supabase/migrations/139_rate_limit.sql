-- ── Rate limiting (Postgres-backed) ─────────────────────────────────────────
--
-- A tiny counter table + UPSERT function that lets public POST endpoints
-- enforce per-IP-per-bucket rate limits without any extra infrastructure
-- (no Redis, no Upstash). The bucket key bakes in a per-minute time bucket
-- so old counters age out naturally and a periodic vacuum is the only
-- maintenance.
--
-- Pattern in a route handler:
--
--   const allowed = await checkRateLimit(supabase, ip, 'school_bits.track', 60)
--   if (!allowed) return new NextResponse(null, { status: 204 })  // soft drop
--
-- 60 events/min/IP is generous for legit traffic (one reader can't view
-- 60 bits/min by hand) and tight enough that a bot can't 10x your numbers
-- with one machine.

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key TEXT PRIMARY KEY,
  count      INT  NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 minutes'
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires
  ON rate_limit_counters (expires_at);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- Service-role-only — no public policies.

-- bump_rate_limit(key, max) → boolean
-- Atomically increments the counter for `key` and returns TRUE if the new
-- value is at or below `max` (request is allowed), FALSE if over.
--
-- Keys are caller-formed: typically "<scope>:<ip>:<minute>" so each minute
-- naturally resets. Counter rows auto-expire after 2 minutes — a separate
-- vacuum job (or a periodic prune) deletes expired rows.
CREATE OR REPLACE FUNCTION bump_rate_limit(p_key TEXT, p_max INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_count INT;
BEGIN
  INSERT INTO rate_limit_counters (bucket_key, count, expires_at)
    VALUES (p_key, 1, NOW() + INTERVAL '2 minutes')
    ON CONFLICT (bucket_key) DO UPDATE
      SET count      = rate_limit_counters.count + 1,
          expires_at = GREATEST(rate_limit_counters.expires_at, NOW() + INTERVAL '2 minutes')
    RETURNING count INTO v_new_count;
  RETURN v_new_count <= p_max;
END;
$$;

-- Cheap pruner — run from cron weekly to keep the table small.
-- (Vercel cron will call /api/cron/rate-limit-prune.)
CREATE OR REPLACE FUNCTION prune_rate_limit() RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE deleted INT;
BEGIN
  DELETE FROM rate_limit_counters WHERE expires_at < NOW() RETURNING 1 INTO deleted;
  RETURN COALESCE(deleted, 0);
END;
$$;
