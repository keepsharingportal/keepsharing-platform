-- ── Print as another distribution channel ────────────────────────────────
--
-- Articles can be queued for print via the editor toggle. When the article
-- is published with the flag on, a 'print' row lands in
-- article_distribution_log (migration 165) so editorial sees the print
-- queue alongside newsletter drafts + social posts.
--
-- v1 is intentionally simple: tag the article + log it. Issue-grouping for
-- the print designer's pull happens at /admin/distribution/print-queue.
-- Actual PDF generation is out of scope (designers usually want InDesign-
-- ready content, not a finished PDF) — we provide the data and a clean
-- print-friendly preview at /articles/[slug]/print.

ALTER TABLE guide_articles
  -- Per-article opt-in flag. When TRUE, publishing fires a 'print'
  -- distribution log entry.
  ADD COLUMN IF NOT EXISTS queue_for_print     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Target print issue, formatted YYYY-MM. NULL = "no issue yet, just
  -- queue for the next one." Used to group the queue page by issue.
  ADD COLUMN IF NOT EXISTS print_issue_month   TEXT NULL,
  -- Stamped when the print queue handler logged the article. Prevents
  -- re-fire on re-save.
  ADD COLUMN IF NOT EXISTS print_queued_at     TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_guide_articles_print_queue
  ON guide_articles (print_issue_month, published_at DESC)
  WHERE queue_for_print = TRUE AND published = TRUE;

COMMENT ON COLUMN guide_articles.queue_for_print IS
  'When TRUE, publishing fires a print distribution log entry. The article appears in /admin/distribution/print-queue grouped by issue.';
COMMENT ON COLUMN guide_articles.print_issue_month IS
  'Target print issue, YYYY-MM. NULL falls into the unassigned bucket on the print queue.';
