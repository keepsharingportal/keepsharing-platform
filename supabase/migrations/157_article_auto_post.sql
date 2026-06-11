-- ── Auto-post to social on article publish ─────────────────────────────────
-- Per-article opt-in flag. When the article transitions to published, the
-- PATCH handler fires a background job that generates an AI caption (using
-- brand voice) and posts to the connected Facebook Page (+ Instagram if
-- linked + hero image present).

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS auto_post_to_social    BOOLEAN NOT NULL DEFAULT FALSE,
  -- After a successful auto-post, we stamp these so re-saves don't double-fire.
  ADD COLUMN IF NOT EXISTS auto_posted_at         TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS auto_posted_fb_post_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS auto_post_error        TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_guide_articles_pending_auto_post
  ON guide_articles (id)
  WHERE auto_post_to_social = TRUE AND auto_posted_at IS NULL AND published = TRUE;

COMMENT ON COLUMN guide_articles.auto_post_to_social IS
  'When TRUE, publishing this article fires an AI-captioned Facebook + Instagram post automatically.';
