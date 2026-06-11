-- ── AI Integration — centralized LLM keys, budgets, usage tracking ──────────
--
-- Until now AI features (game content gen, business spotlight, submissions
-- auto-review, calendar extraction, article drafting, community drafts,
-- editorial promos, help chat, AI tasks admin) all read process.env.
-- ANTHROPIC_API_KEY directly. That works but produces zero visibility:
-- no usage tracking, no budget cap, no audit trail, no per-task model
-- override without a redeploy.
--
-- This migration adds:
--   ai_integrations  — one row per provider with key + budget + per-task
--                      default model picks. Connect/disconnect through
--                      /admin/integrations/ai.
--   ai_usage_log     — one row per call, with token counts + computed
--                      cost + caller attribution. Feeds the usage dashboard
--                      and the budget cap check.
--
-- All future AI calls in the codebase route through src/lib/ai/client.ts
-- which reads these tables. Existing features migrate over one at a time.

CREATE TABLE IF NOT EXISTS ai_integrations (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                          TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  api_key                           TEXT NOT NULL,
  is_active                         BOOLEAN NOT NULL DEFAULT TRUE,
  -- Monthly budget in cents. Hit it → new AI calls return budget-exhausted
  -- error instead of running up surprise charges. Reset on the 1st by the
  -- dashboard which compares against rolling-month usage.
  monthly_budget_cents              INT NOT NULL DEFAULT 10000,           -- $100
  -- Default model per task kind. NULL means "use the provider's general
  -- best-balance model from src/lib/ai/models.ts."
  default_drafting_model            TEXT NULL,
  default_classification_model      TEXT NULL,
  default_extraction_model          TEXT NULL,
  default_games_model               TEXT NULL,
  default_coaching_model            TEXT NULL,
  default_qa_model                  TEXT NULL,
  default_caption_model             TEXT NULL,
  default_other_model               TEXT NULL,
  -- Bookkeeping
  connected_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_by                      UUID NULL,                            -- admin_users.id
  last_used_at                      TIMESTAMPTZ NULL,
  -- One active row per provider — reconnecting replaces the row via
  -- ON CONFLICT (provider).
  UNIQUE (provider)
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                 TEXT NOT NULL,
  model                    TEXT NOT NULL,
  task_kind                TEXT NOT NULL,
  caller                   TEXT NULL,                                     -- human-readable: 'games.generate', 'ai-review', 'article-draft', etc.
  prompt_tokens            INT NOT NULL DEFAULT 0,
  completion_tokens        INT NOT NULL DEFAULT 0,
  total_tokens             INT GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_cents               NUMERIC(10, 4) NOT NULL DEFAULT 0,
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by_admin_id    UUID NULL,                                     -- admin_users.id (nullable for cron/webhook calls)
  duration_ms              INT NULL,
  error                    TEXT NULL                                      -- non-null on failure
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_recent
  ON ai_usage_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_provider
  ON ai_usage_log (provider, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_caller
  ON ai_usage_log (caller, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_admin
  ON ai_usage_log (triggered_by_admin_id, occurred_at DESC)
  WHERE triggered_by_admin_id IS NOT NULL;

ALTER TABLE ai_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log    ENABLE ROW LEVEL SECURITY;
-- Service-role only. Admin reads + writes via service-role API; anon
-- never touches these tables.

COMMENT ON TABLE ai_integrations IS
  'One row per LLM provider. Holds the API key, monthly budget, and per-task default model picks. /admin/integrations/ai is the UI.';
COMMENT ON TABLE ai_usage_log IS
  'One row per AI call. Powers the usage dashboard and the budget cap check.';
