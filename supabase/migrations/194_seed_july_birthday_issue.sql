-- ── Migration 194 — Seed July 2026 Big Birthday Issue (RRP) ────────────
--
-- First campaign on the platform. Created idempotently — re-running
-- this migration is a no-op. Editor opens it at
-- /admin/campaigns/<id> + clicks Generate to populate the AI brief.

INSERT INTO themed_campaigns (
  brand_slug, slug, theme_title, month,
  brief, hero_tagline, target_keywords,
  status, public_landing_active
)
SELECT
  'rrp',
  'big-birthday-issue',
  'The Big Birthday Issue',
  '2026-07-01',
  'July''s Big Birthday Issue celebrates the kid birthday party season — the venues, the bakeries, the theme ideas, the unforgettable family stories. River Region parents do summer birthdays differently: Lake Martin pool parties, Pike Road backyard bashes, Prattville bowling alley socials. We''re owning the locality-specific birthday search for the year.',
  'The summer birthday playbook for River Region families.',
  ARRAY[
    'kids birthday parties Montgomery',
    'birthday party venues Prattville',
    'Pike Road birthday venues',
    'birthday cake bakeries River Region',
    'kids party planners Montgomery AL',
    'Wetumpka birthday party ideas',
    'first birthday Montgomery',
    'teen birthday party Montgomery'
  ]::TEXT[],
  'planning',
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM themed_campaigns WHERE brand_slug = 'rrp' AND slug = 'big-birthday-issue'
);

COMMENT ON TABLE themed_campaigns IS
  'Coordinated editorial + marketing campaign around a monthly theme. The Big Birthday Issue (RRP, July 2026) is the seed example.';
