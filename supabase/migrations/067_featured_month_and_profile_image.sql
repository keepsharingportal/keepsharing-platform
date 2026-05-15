-- 067_featured_month_and_profile_image.sql ────────────────────────────────────
-- Two small additions to support the homepage rotation work:
--
-- 1. guide_configs.featured_month — which month of the year this guide is
--    the "current issue". The homepage Featured Guide tile reads the row
--    where featured_month = today's month so the spot always shows the
--    right monthly theme without code changes.
--
-- 2. guide_articles.profile_image_url — second image per article. The hero
--    image is used when the article runs in the big hero slot on the
--    homepage; the profile image is used in the smaller Community
--    Spotlights sidebar slot. Falls back to hero_image_url if profile is
--    unset, so existing articles still render.

alter table public.guide_configs
  add column if not exists featured_month smallint
    check (featured_month is null or (featured_month between 1 and 12));

alter table public.guide_articles
  add column if not exists profile_image_url text;
