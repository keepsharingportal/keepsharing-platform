-- ── SEO data layer ──────────────────────────────────────────────────────────
--
-- Per-article SEO overrides + sitewide redirect manager + 404 monitor
-- + internal-link suggestion queue + Search Console data cache +
-- weekly audit-run history. The complete data model behind the
-- editorial-quality SEO automation system.
--
-- All ranking decisions hang off this schema:
--   - The buildPageMetadata helper reads the override columns on
--     guide_articles so a real human-tuned title beats the auto-fall-back
--   - The middleware reads `redirects` on every request, serves a 301
--     when one matches, and logs 404s to `not_found_log`
--   - Nightly cron writes to `internal_link_suggestions` with
--     "you should link to article X from article Y here" matches
--   - Daily cron writes `search_console_data` rows (one per
--     date/page/query)
--   - Weekly Claude audit runs write `seo_audit_runs` rows with a
--     markdown report the editor opens from admin


-- ── 1. Per-article SEO overrides ────────────────────────────────────────────
-- All nullable — when unset the existing defaults (title, excerpt,
-- canonical via path) still apply. Lets the editor tune individual
-- articles without us having to touch the canonical fields.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS seo_title              TEXT,
  ADD COLUMN IF NOT EXISTS seo_description        TEXT,
  ADD COLUMN IF NOT EXISTS seo_focus_keyword      TEXT,
  ADD COLUMN IF NOT EXISTS seo_secondary_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS seo_canonical_override TEXT,
  ADD COLUMN IF NOT EXISTS seo_no_index           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seo_score              INTEGER,
  ADD COLUMN IF NOT EXISTS seo_score_breakdown    JSONB,
  ADD COLUMN IF NOT EXISTS seo_last_audited_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seo_audited_by         TEXT;

COMMENT ON COLUMN guide_articles.seo_title IS
  'Editor-tuned SEO title (50-60 chars ideal). When NULL, falls back to title.';
COMMENT ON COLUMN guide_articles.seo_description IS
  'Editor-tuned meta description (150-160 chars). When NULL, falls back to excerpt.';
COMMENT ON COLUMN guide_articles.seo_focus_keyword IS
  'The primary keyword/phrase this article targets — drives content analysis + internal link matching.';
COMMENT ON COLUMN guide_articles.seo_secondary_keywords IS
  'LSI / related keywords. Used by content analyzer to grade keyword breadth + by AI to suggest improvements.';
COMMENT ON COLUMN guide_articles.seo_score IS
  '0-100 score from src/lib/seo/content-analyzer.ts. Recomputed on every edit + on weekly audit.';
COMMENT ON COLUMN guide_articles.seo_score_breakdown IS
  'JSONB of factor: { score, max, notes } so admin can show what passed / failed.';

CREATE INDEX IF NOT EXISTS idx_guide_articles_seo_focus_keyword
  ON guide_articles (LOWER(seo_focus_keyword))
  WHERE seo_focus_keyword IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guide_articles_seo_score
  ON guide_articles (seo_score)
  WHERE status = 'published';


-- ── 2. Redirect manager ─────────────────────────────────────────────────────
-- Lookup-by-path is the hot read path; the middleware queries on
-- every request that 404s.

CREATE TABLE IF NOT EXISTS redirects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path     TEXT NOT NULL,
  to_path       TEXT NOT NULL,
  status_code   INTEGER NOT NULL DEFAULT 301
    CHECK (status_code IN (301, 302, 307, 308)),
  hits          BIGINT NOT NULL DEFAULT 0,
  last_hit_at   TIMESTAMPTZ,
  note          TEXT,
  brand_slug    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redirects_from_path_brand
  ON redirects (LOWER(from_path), COALESCE(brand_slug, ''))
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_redirects_last_hit_at
  ON redirects (last_hit_at DESC NULLS LAST);

COMMENT ON TABLE redirects IS
  '301/302/307/308 redirects served by middleware. brand_slug NULL = applies to all brands.';


-- ── 3. 404 monitor ──────────────────────────────────────────────────────────
-- One row per UNIQUE path that's 404'd. count incremented on repeat
-- hits. Cleared from admin when handled (typically by creating a redirect).

CREATE TABLE IF NOT EXISTS not_found_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path            TEXT NOT NULL,
  brand_slug      TEXT,
  count           BIGINT NOT NULL DEFAULT 1,
  last_referrer   TEXT,
  last_user_agent TEXT,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,
  resolution_note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_not_found_log_path_brand
  ON not_found_log (LOWER(path), COALESCE(brand_slug, ''))
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_not_found_log_count
  ON not_found_log (count DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE not_found_log IS
  '404 hits aggregated by path. Top-of-list = highest-priority redirect candidates.';


-- ── 4. Internal-link suggestion queue ───────────────────────────────────────
-- Nightly engine populates this with "in article SOURCE, sentence X
-- mentions phrase P which matches article TARGET's focus keyword —
-- here\'s an anchor candidate." Editor accepts / rejects from admin.

CREATE TABLE IF NOT EXISTS internal_link_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id   UUID NOT NULL REFERENCES guide_articles(id) ON DELETE CASCADE,
  target_article_id   UUID NOT NULL REFERENCES guide_articles(id) ON DELETE CASCADE,
  /** Quoted text from the source that should become the anchor — usually
   *  the matched phrase or the surrounding 3-7 words. */
  anchor_text         TEXT NOT NULL,
  /** Surrounding paragraph for editor context (~200 chars). */
  context_snippet     TEXT,
  /** Confidence score from the matcher (0-100). Title matches highest;
   *  body matches lower. */
  match_score         INTEGER NOT NULL DEFAULT 50,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'applied')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  CONSTRAINT no_self_link CHECK (source_article_id <> target_article_id)
);

CREATE INDEX IF NOT EXISTS idx_link_suggestions_source
  ON internal_link_suggestions (source_article_id, status);
CREATE INDEX IF NOT EXISTS idx_link_suggestions_status
  ON internal_link_suggestions (status, created_at DESC);

COMMENT ON TABLE internal_link_suggestions IS
  'Auto-generated internal-linking opportunities. Editor reviews + accepts.';


-- ── 5. Search Console cache ─────────────────────────────────────────────────
-- One row per (date, page, query). Drives "which queries each article
-- ranks for", "what's our top 50 queries", "which articles are climbing
-- vs falling." Daily cron writes new rows; we keep ~180 days of
-- history for trend analysis.

CREATE TABLE IF NOT EXISTS search_console_data (
  date        DATE NOT NULL,
  page_url    TEXT NOT NULL,
  query       TEXT NOT NULL,
  clicks      INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr         NUMERIC(6,4) NOT NULL DEFAULT 0,
  position    NUMERIC(6,2) NOT NULL DEFAULT 0,
  brand_slug  TEXT,
  PRIMARY KEY (date, page_url, query)
);

CREATE INDEX IF NOT EXISTS idx_gsc_page_query
  ON search_console_data (LOWER(page_url), date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_position_brand
  ON search_console_data (brand_slug, position)
  WHERE position BETWEEN 11 AND 20;  -- "almost on page 1" — leverage queries

COMMENT ON TABLE search_console_data IS
  'Daily query/page/position data from GSC API. Position 11-20 rows = highest-leverage improvement targets.';


-- ── 6. Audit-run history ────────────────────────────────────────────────────
-- Each weekly Claude audit writes a row here. report_markdown is the
-- full LLM-generated report; admin renders it. issues_found is the
-- count of distinct prioritized recommendations.

CREATE TABLE IF NOT EXISTS seo_audit_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug          TEXT NOT NULL,
  run_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_by              TEXT NOT NULL DEFAULT 'weekly-cron',
  articles_checked    INTEGER NOT NULL DEFAULT 0,
  issues_found        INTEGER NOT NULL DEFAULT 0,
  /** Markdown report — Claude-generated, structured per the prompt in
   *  src/lib/seo/weekly-audit.ts. Rendered in admin via react-markdown. */
  report_markdown     TEXT NOT NULL,
  /** Programmatic action list — array of {kind, target_id, severity,
   *  recommendation, fix_url?}. The dashboard can show actionable
   *  buttons alongside the markdown report. */
  action_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_used         INTEGER,
  model_used          TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_brand_recent
  ON seo_audit_runs (brand_slug, run_at DESC);

COMMENT ON TABLE seo_audit_runs IS
  'Weekly Claude-generated SEO audit reports. Latest row per brand = current state of the world.';
