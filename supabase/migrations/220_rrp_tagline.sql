-- 220_rrp_tagline.sql ─────────────────────────────────────────────────────────
-- Set the River Region Parents tagline to the real magazine line.
--
-- Until now brand_voice.tagline was NULL for 'rrp', so chromeForBrand() fell
-- through to its generated default ("River Region Parents — local stories,
-- every month.") which just restated the wordmark sitting directly above it.
--
-- The tagline renders in two places, both reading chrome.tagline:
--   - Navigation.tsx  → NavigationBar (site header, under the wordmark)
--   - PublicFooter.tsx (footer, under the wordmark)
-- Setting it here fixes both, and future changes are an admin edit rather
-- than a deploy.

insert into public.brand_voice (brand_slug, tagline)
values ('rrp', 'Live Local, Love Local, Parent Local')
on conflict (brand_slug) do update
  set tagline = excluded.tagline;

-- Verify:
--   select brand_slug, tagline from public.brand_voice where brand_slug = 'rrp';
