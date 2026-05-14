-- 066_guide_configs_print_issuu.sql ───────────────────────────────────────────
-- Adds print cover + Issuu flip URL to guide_configs so each guide can be
-- treated like a digital edition of its corresponding print issue.
-- Also backfills config rows for every active guide_type so the admin editor
-- always has a row to update (avoids "guide_configs row missing" branches).

alter table public.guide_configs
  add column if not exists print_cover_url text,
  add column if not exists issuu_url       text;

-- Seed a config row for every guide_type that doesn't have one yet.
insert into public.guide_configs (guide_type_slug, title, is_active)
select gt.slug, gt.display_name, true
from public.guide_types gt
left join public.guide_configs gc on gc.guide_type_slug = gt.slug
where gc.guide_type_slug is null;
