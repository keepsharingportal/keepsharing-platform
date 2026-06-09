-- ── Admin audit log ─────────────────────────────────────────────────────────
--
-- Every mutating action through the admin surface writes a row here. The
-- log is append-only (no DELETE / UPDATE policies) so an attacker who
-- gains admin access can't quietly cover their tracks.
--
-- Schema is intentionally flexible:
--   - actor_*       : who did it
--   - action        : a short verb like 'user.role_changed', 'integration.connected'
--   - target_table  : which Postgres table the action touched (or 'system' for
--                     non-table actions like 'integration.sync_triggered')
--   - target_id     : pk of the affected row (text so non-uuid pks work)
--   - before / after: JSONB diffs — null on creates/deletes when only one side exists
--   - meta          : freeform JSON for context (IP, user agent, reason etc.)
--
-- Storage profile: at 1k actions/day, each row ~1KB → ~365MB/year. Keep
-- forever for now; add a TTL or archive table when the table crosses
-- ~10GB. The viewer paginates so the table size doesn't slow it down.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id      UUID,                                  -- admin_users.id
  actor_email   TEXT,                                  -- denormalized for filter + display
  actor_role    TEXT,                                  -- snapshot of role at the time
  action        TEXT NOT NULL,
  target_table  TEXT,
  target_id     TEXT,
  before        JSONB,
  after         JSONB,
  ip            TEXT,
  user_agent    TEXT,
  meta          JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_occurred ON admin_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor    ON admin_audit_log (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON admin_audit_log (action,   occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target   ON admin_audit_log (target_table, target_id);

COMMENT ON TABLE admin_audit_log IS
  'Append-only log of every mutating admin action. Service-role-only access; no UPDATE/DELETE policies.';

-- RLS: deny anon entirely. Service role bypasses RLS, so the writer + reader
-- (both server-side) work without explicit policies.
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY statements = anon can do nothing. Intentional.
