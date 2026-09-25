-- Migration 231: Business Spotlight becomes a parent-facing hub
--
-- /business-spotlight was only the paid application form. It is now a reader
-- destination — Featured stories, browse by industry, all stories — with the
-- form moved to /business-spotlight/apply.
--
-- The hub reads PUBLISHED guide_articles (column_slug = 'business-spotlight'),
-- never business_spotlights. Those two tables have different jobs and this
-- migration doesn't blur them:
--
--   business_spotlights  — paid intake + AI draft + review queue. Nothing in
--                          it is public. Nothing here auto-publishes from it.
--   guide_articles       — the published editorial corpus, same as every
--                          other column.
--
-- ── Why a real column and not a body-copy convention ────────────────────────
-- Industry has to be filterable. Parsing it out of article body text means the
-- filter silently drops a story the day someone rewrites a sentence, and it
-- can't be indexed. One nullable TEXT column is the honest version.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS industry           TEXT,
  ADD COLUMN IF NOT EXISTS spotlight_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN guide_articles.industry IS
  'Business Spotlight industry, stored as the exact display label (e.g. "Education & Learning"). NULL for every other column. URLs use a slug mapped in src/lib/business-spotlight/industries.ts.';
COMMENT ON COLUMN guide_articles.spotlight_featured IS
  'Pins a Business Spotlight story into the hub''s Featured row (max 3 shown, newest first).';

-- The hub's main query is (column_slug, published) ordered by published_at,
-- optionally narrowed by industry. Partial index — this only ever serves the
-- spotlight hub, so it stays small rather than indexing 2,000 unrelated rows.
CREATE INDEX IF NOT EXISTS idx_guide_articles_spotlight
  ON guide_articles (published_at DESC NULLS LAST, industry)
  WHERE column_slug = 'business-spotlight' AND published = true;

-- ── QA seed ─────────────────────────────────────────────────────────────────
-- The Dentistry for Children draft is already in guide_articles. Tag it so the
-- industry filter has something to exercise, but leave published = false — the
-- editor approves, not this migration.
--
-- Site of record is chew-chewtrain.com, NOT dentistryforchildren.com. That
-- correction belongs in the article body, which an editor owns; this only sets
-- the industry.

UPDATE guide_articles
   SET industry = 'Healthcare'
 WHERE column_slug = 'business-spotlight'
   AND slug = 'when-were-going-to-the-dentist-doesnt-have-to-mean-tears';

-- Verify:
--   SELECT slug, published, industry, spotlight_featured
--     FROM guide_articles WHERE column_slug = 'business-spotlight';
