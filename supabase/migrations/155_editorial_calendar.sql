-- ── AI editorial calendar suggestions ─────────────────────────────────────
--
-- Joins:
--   - search_console_queries (migration 149) — what people are actually
--                                              searching for
--   - brand_voice            (migration 154) — what voice/angle fits the
--                                              brand
--   - AI integration         (migration 148) — drafting the suggestions
--
-- Output: a queue of story ideas surfaced as "we should write this." Each
-- suggestion has a target brand, a working headline, the angle/why, the
-- evidence (which queries / pages drove it), and an action (commission
-- contributor / write internally / dismiss).
--
-- Editorial reviews + acts. Acted suggestions can hand off to:
--   - the contributor pipeline (send an invite to a matching contributor)
--   - the article queue (create a new draft scaffold)
--   - dismiss (with a reason — fed back into the prompt next time)

CREATE TABLE IF NOT EXISTS editorial_calendar_suggestions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug            TEXT NOT NULL,
  -- The angle the AI proposed.
  working_headline      TEXT NOT NULL,
  angle                 TEXT NOT NULL,
  -- Why: signal-driven explanation citing the evidence.
  rationale             TEXT NOT NULL,
  -- Suggested article shape (length, structure) + suggested target column.
  format_suggestion     TEXT NULL,
  target_column         TEXT NULL,
  -- Evidence rows — query strings + their click/impression numbers that
  -- drove the suggestion. JSON to keep this flexible across signal sources.
  evidence              JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Editorial workflow.
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'commissioned', 'dismissed'
  )),
  dismissed_reason      TEXT NULL,
  acted_article_id      UUID NULL,                     -- guide_articles.id when accepted
  acted_invite_id       UUID NULL,                     -- contributor_invites.id when commissioned
  -- Provenance — for audit + re-running with fresh data.
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_run_id   UUID NULL,                     -- groups suggestions from one batch
  -- Triage hooks.
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  reviewed_at           TIMESTAMPTZ NULL,
  reviewed_by           UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_brand_status
  ON editorial_calendar_suggestions (brand_slug, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_pending
  ON editorial_calendar_suggestions (generated_at DESC) WHERE status = 'pending';

-- Per-run audit log so we can see when the generator was last run, what
-- it cost (token spend through the AI integration is logged separately),
-- and how many suggestions came out.
CREATE TABLE IF NOT EXISTS editorial_calendar_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug            TEXT NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at           TIMESTAMPTZ NULL,
  status                TEXT NULL,
  suggestion_count      INT NULL,
  query_count_analyzed  INT NULL,
  error                 TEXT NULL,
  triggered_by          TEXT NULL                       -- 'cron' | 'manual:<admin_id>'
);

CREATE INDEX IF NOT EXISTS idx_calendar_runs_recent
  ON editorial_calendar_runs (started_at DESC);

ALTER TABLE editorial_calendar_suggestions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_calendar_runs         ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE editorial_calendar_suggestions IS
  'AI-generated story ideas surfacing high-impression-low-click queries + brand-voice-fit angles. Reviewed by editorial weekly.';
COMMENT ON TABLE editorial_calendar_runs IS
  'Audit log of editorial calendar generations.';
