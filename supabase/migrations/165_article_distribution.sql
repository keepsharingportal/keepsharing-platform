-- ── Multi-format article distribution ─────────────────────────────────────
--
-- When an article is published, the platform can fan it out to multiple
-- channels:
--   - Facebook + Instagram auto-post (already wired via migration 157)
--   - GHL newsletter draft / campaign (this migration)
--   - Future: print queue, syndication email packets
--
-- Each fan-out is logged so editorial can see what went where + what
-- failed without bouncing to GHL.

-- Per-article opt-in flag, mirrors auto_post_to_social. The article
-- editor surfaces a "Queue newsletter draft on publish" checkbox.
ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS queue_newsletter_draft    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Stamped when the queue handler successfully created the GHL draft
  -- (or marked it queued for manual review). Prevents re-fire on re-save.
  ADD COLUMN IF NOT EXISTS newsletter_drafted_at     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS newsletter_draft_error    TEXT NULL,
  -- The GHL campaign / email id once a real draft has been created. The
  -- legacy GHL flow doesn't expose a "create draft" REST endpoint in
  -- every sub-account, so v1 of this records a "draft prepared" payload
  -- to article_distribution_log + tags the audience. v2 (when the GHL
  -- email-builder API is in the sub-account scopes) can also create the
  -- actual draft and store the id here.
  ADD COLUMN IF NOT EXISTS newsletter_ghl_campaign_id TEXT NULL;

COMMENT ON COLUMN guide_articles.queue_newsletter_draft IS
  'When TRUE, publishing the article fires a GHL newsletter draft job using brand-routed list/tag.';

-- Audit + admin-surface log of every distribution attempt. One row per
-- (article, channel) attempt. Re-running creates a new row so we can see
-- the retry history.
CREATE TABLE IF NOT EXISTS article_distribution_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id     UUID NOT NULL REFERENCES guide_articles(id) ON DELETE CASCADE,
  brand_slug     TEXT NOT NULL DEFAULT 'rrp',
  -- Which channel: 'facebook' | 'instagram' | 'newsletter' | 'print'.
  channel        TEXT NOT NULL,
  status         TEXT NOT NULL,                            -- 'success' | 'failed' | 'queued'
  -- Free-form details (GHL response payload, error message, etc.).
  detail         JSONB NULL,
  external_id    TEXT NULL,                                -- GHL campaign id, FB post id, etc.
  triggered_by   TEXT NULL,                                -- 'publish-hook' | 'manual:<admin_id>' | 'cron'
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_distribution_log_article
  ON article_distribution_log (article_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_distribution_log_recent
  ON article_distribution_log (channel, occurred_at DESC);

ALTER TABLE article_distribution_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE article_distribution_log IS
  'One row per (article, channel) distribution attempt. Powers the admin distribution log.';
