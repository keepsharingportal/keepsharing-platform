-- Migration 041 v2: Seed article ad placements + pull quotes
-- v2 fix: ad_placements actual columns use ad_ prefix:
--   ad_headline (not headline), ad_description, ad_cta_label, ad_link (not cta_url)
--   ad_eyebrow and ad_image_url also available — populated for richer rendering
-- Three new placement_type values used by the article detail page:
--   article_inline           → mid-article ad block
--   article_sidebar_sticky   → top-of-sidebar pediatric/clinic-style ad
--   article_sidebar_sponsored → bottom-of-sidebar accent CTA

-- ── article_inline: Mid-article DFC promo ──
INSERT INTO ad_placements (
  placement_type, advertiser_account_id,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
  display_priority, is_active, created_at
)
SELECT
  'article_inline',
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1),
  'Sponsored',
  'Schedule Your Child''s Summer Checkup',
  'Get 20% off new patient visits this June at Dentistry for Children. Now accepting families across the River Region.',
  'Book Online',
  'https://www.dentistryforchildren.com',
  100,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ad_placements 
  WHERE placement_type = 'article_inline' 
  AND ad_headline = 'Schedule Your Child''s Summer Checkup'
);

-- ── article_sidebar_sticky: Top-of-sidebar DFC ad ──
INSERT INTO ad_placements (
  placement_type, advertiser_account_id,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
  display_priority, is_active, created_at
)
SELECT
  'article_sidebar_sticky',
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children' LIMIT 1),
  'Advertisement',
  'Dentistry for Children PC',
  'Accepting new patients! Make their smile shine before school starts.',
  'Book Appointment',
  'https://www.dentistryforchildren.com',
  100,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ad_placements 
  WHERE placement_type = 'article_sidebar_sticky' 
  AND ad_headline = 'Dentistry for Children PC'
);

-- ── article_sidebar_sponsored: Bottom-of-sidebar Summer Reading CTA ──
INSERT INTO ad_placements (
  placement_type, advertiser_account_id,
  ad_eyebrow, ad_headline, ad_description, ad_cta_label, ad_link,
  display_priority, is_active, created_at
)
SELECT
  'article_sidebar_sponsored',
  NULL,
  'Sponsored',
  'Summer Reading Challenge',
  'Read 10 books this summer, earn a free personal pizza at a participating River Region partner.',
  'Download Log Book',
  '/summer-reading',
  100,
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ad_placements 
  WHERE placement_type = 'article_sidebar_sponsored' 
  AND ad_headline = 'Summer Reading Challenge'
);

-- ── Populate pull_quotes for seeded May 2026 articles ──
-- pull_quotes is jsonb. Format depends on what BR18's article page code expects.
-- BR18 status report claimed pull_quotes is handled as "string array (migration 018 format)".
-- To be safe, populate as a string array — simpler format that the parser can handle.

UPDATE guide_articles SET pull_quotes = '["Faith and gratitude are at the center of everything."]'::jsonb
WHERE slug = 'mom-to-mom-hayley-denny-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["They call me Ma and Memaw, and I absolutely love it."]'::jsonb
WHERE slug = 'grands-greatest-janice-shepard-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["Meeting students where they are allows me to create a roadmap for success for each one."]'::jsonb
WHERE slug = 'teacher-bebe-campbell-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["The issue is not simply that kids are distracted. It is that they are growing up inside systems designed to capture their attention."]'::jsonb
WHERE slug = 'teens-screens-ai-attention-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["A meaningful summer isn''t built on spectacle. It''s built on shared laughter and predictable rituals."]'::jsonb
WHERE slug = 'micro-summer-adventures-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["Instead of asking what the social scene is like, ask what they did last weekend."]'::jsonb
WHERE slug = 'college-visits-12-tips-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

UPDATE guide_articles SET pull_quotes = '["She loves you unconditionally. No performance required."]'::jsonb
WHERE slug = 'why-we-love-mothers-may-2026' 
  AND (pull_quotes IS NULL OR pull_quotes = '[]'::jsonb);

-- ── Verification queries (run separately after this migration succeeds) ──
-- SELECT placement_type, ad_headline FROM ad_placements WHERE placement_type LIKE 'article_%';
-- SELECT slug, pull_quotes FROM guide_articles WHERE issue_year = 2026;