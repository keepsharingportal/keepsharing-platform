-- Migration 015: Set hero_image_url on newcomer-guide articles
-- Run in Supabase SQL editor after migration 014 has been applied.
-- Safe to run multiple times (only updates where value is null or empty).

UPDATE guide_articles
SET hero_image_url = '/images/family-guide/hero-grandfather-mom-daughter.jpg'
WHERE guide_slug = 'newcomer-guide'
  AND slug = 'your-first-30-days-in-the-river-region'
  AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE guide_articles
SET hero_image_url = '/images/family-guide/family-park-frisbee.jpg'
WHERE guide_slug = 'newcomer-guide'
  AND slug IN (
    'choosing-the-right-school-district',
    'where-to-find-your-people',
    'where-locals-take-their-kids-on-saturday'
  )
  AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE guide_articles
SET hero_image_url = '/images/family-guide/family-cafe-newcomer.jpg'
WHERE guide_slug = 'newcomer-guide'
  AND slug = 'establishing-pediatric-care'
  AND (hero_image_url IS NULL OR hero_image_url = '');

-- Verify results
SELECT slug, hero_image_url FROM guide_articles WHERE guide_slug = 'newcomer-guide' ORDER BY display_order;
