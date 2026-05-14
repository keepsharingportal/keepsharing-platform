-- 065_guide_configs.sql ───────────────────────────────────────────────────────
-- Per-guide editable settings: hero image, homepage feature image, CTA, fallback.
-- One row per guide_type_slug. Falls back gracefully when no row exists.

create table if not exists public.guide_configs (
  id                   uuid primary key default gen_random_uuid(),
  guide_type_slug      text unique not null,
  title                text not null,
  subtitle             text,
  hero_image_url       text,
  homepage_image_url   text,
  fallback_image_url   text,
  primary_cta_label    text,
  primary_cta_url      text,
  category_order       jsonb,
  sponsor_label        text,
  is_active            boolean default true not null,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

create index if not exists guide_configs_slug_idx on public.guide_configs (guide_type_slug);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists guide_configs_updated_at on public.guide_configs;
create trigger guide_configs_updated_at
  before update on public.guide_configs
  for each row execute function public.set_updated_at();

-- Seed initial config for Summer Fun Guide so the homepage block and detail
-- page have a known starting point.
insert into public.guide_configs (
  guide_type_slug, title, subtitle, primary_cta_label, primary_cta_url, is_active
) values (
  'summer-fun',
  'Summer Fun Guide',
  'Camps, day trips, splash spots, and 100+ ways to keep summer feeling like summer in the River Region.',
  'Browse Listings',
  '/summer-fun-guide',
  true
) on conflict (guide_type_slug) do nothing;

-- RLS — anyone can read; only service role writes.
alter table public.guide_configs enable row level security;

drop policy if exists guide_configs_read on public.guide_configs;
create policy guide_configs_read on public.guide_configs
  for select using (true);
