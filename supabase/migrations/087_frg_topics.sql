-- Migration 087: Content Topics
-- Adds a cross-cutting topic-tag array to guide_articles so longform pieces
-- (essays, "real talk" columns, decision guidance, wellness, etc.) can
-- surface in matching rows across the site — Family Resource Guide, Special
-- Needs Guide, Private School Guide, and so on — regardless of their primary
-- column_slug or guide_slug.
--
-- Two complementary mechanisms:
--   guide_slug  — "Was this written FOR a specific guide?" (one primary home)
--   topics      — "What themes does this article touch?" (many cross-cutting tags)
--
-- Topic slugs are a free text[] (not a controlled enum) so the editorial team
-- can introduce new themes without a schema migration. The curated set lives
-- in src/lib/content-taxonomy.ts (CONTENT_TOPICS) so the admin UI shows
-- consistent labels and descriptions.
--
-- Starter taxonomy (must stay in sync with CONTENT_TOPICS):
--   newcomer-life    — moving here, first months, getting oriented
--   village          — community, friendships, mom-crew, connection
--   real-talk        — reflective parenting essays, honest mom-life
--   how-to-choose    — decision guidance (childcare, schools, doctors, therapies)
--   family-wellness  — health, mental health, nutrition, development
--   family-fun       — activities, day trips, traditions, holidays

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS topics text[];

-- GIN index — fast overlap queries when a guide page filters by its
-- relevant subset, e.g. `topics && array['how-to-choose','village']`.
CREATE INDEX IF NOT EXISTS guide_articles_topics_idx
  ON guide_articles USING gin (topics);

COMMENT ON COLUMN guide_articles.topics IS
  'Cross-cutting theme tags (e.g. village, real-talk, how-to-choose). Powers "Across the Site" rows on guide landing pages. The primary home stays guide_slug + column_slug.';
