-- 221_guide_featured_months.sql ───────────────────────────────────────────────
-- Turn on the monthly guide rotation on the homepage.
--
-- guide_configs.featured_month (int 1-12) already existed, the homepage
-- already queried it, and /admin/guides/[slug]/edit already exposed the field
-- — but every row was NULL. With no match, page.tsx fell through to
-- "any active guide ordered by display_order limit 1", which resolved to
-- Newcomer / Family Resource Guide. That's why the homepage's "THIS MONTH"
-- tile said Family Resource Guide in August, and why FRG rendered twice
-- (once as the featured tile, once as a category card).
--
-- Months set here are the ones we can evidence:
--   4  childcare       — April 2026 cover ("Childcare")
--   7  birthday-party  — July 2026 cover ("The Ultimate Big Birthday Bash Guide")
--   8  afterschool     — August 2026 cover ("After School Activities Guide"), current issue
--   9  special-needs   — confirmed as the September 2026 issue
--
-- The remaining guides (healthy-kids, private-school, summer-camp, summer-fun,
-- newcomer) are intentionally left NULL — set them in
-- /admin/guides/<slug>/edit as each issue's month is confirmed. A NULL month
-- simply means "never the featured tile", which is now a safe state: the
-- homepage hides the tile instead of substituting an arbitrary guide.

update public.guide_configs set featured_month = 4 where guide_type_slug = 'childcare';
update public.guide_configs set featured_month = 7 where guide_type_slug = 'birthday-party';
update public.guide_configs set featured_month = 8 where guide_type_slug = 'afterschool';
update public.guide_configs set featured_month = 9 where guide_type_slug = 'special-needs';

-- Verify:
--   select guide_type_slug, featured_month, is_active
--     from public.guide_configs order by featured_month nulls last;
