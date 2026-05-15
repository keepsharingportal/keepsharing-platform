-- 069_verticals.sql ───────────────────────────────────────────────────────────
-- First-class "verticals" — year-round content homes that aren't tied to a
-- print issue. School Zone, Mom Knows Best, and future ones (Family Travel,
-- Food, Local Hero, etc.) live here.
--
-- Distinction from guides:
--   - Guides    (guide_types) → monthly print theme, listings + categories,
--                                featured_month, print cover, Issuu link
--   - Verticals (this table)  → year-round, no listings, no print, sponsored
--                                as ongoing brand association
--
-- Same identity spine as guides (hero, subtitle, CTA, sponsor slot) so the
-- public site renders them consistently and the admin pattern matches.

create table if not exists public.verticals (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,        -- 'school-zone', 'mom-knows-best'
  display_name        text not null,               -- "School Zone"
  subtitle            text,                        -- short tagline under the title
  description         text,                        -- longer about-this-vertical paragraph
  hero_image_url      text,                        -- top-of-page hero
  homepage_image_url  text,                        -- override image for homepage tile
  brand_color         text,                        -- optional hex for accents
  primary_cta_label   text,                        -- e.g. "Nominate Someone"
  primary_cta_url     text,                        -- e.g. "/nominate"
  sponsor_label       text default 'Proudly Presented By',
  kind                text not null,               -- 'topic' | 'community' | (future kinds)
  is_active           boolean default true not null,
  display_order       int default 100,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,
  check (kind in ('topic', 'community'))
);

create index if not exists verticals_slug_idx   on public.verticals (slug);
create index if not exists verticals_active_idx on public.verticals (is_active) where is_active;
create index if not exists verticals_kind_idx   on public.verticals (kind);

-- updated_at trigger (reuses the function set up in earlier migrations)
drop trigger if exists verticals_updated_at on public.verticals;
create trigger verticals_updated_at
  before update on public.verticals
  for each row execute function public.set_updated_at();

-- Seed the two we know about today. Identity copy here is what's currently
-- hardcoded on the public pages, so the swap is identity-only (no visible
-- change until the admin edits something).
insert into public.verticals (slug, display_name, kind, subtitle, primary_cta_label, primary_cta_url, display_order, is_active)
values
  (
    'school-zone',
    'School Zone',
    'topic',
    'Student spotlights, teacher recognitions, school news, and education matters across the River Region.',
    'Nominate Someone',
    '/nominate',
    10,
    true
  ),
  (
    'mom-knows-best',
    'Mom Knows Best',
    'community',
    'Real River Region moms writing about real River Region life — favorite spots, hard-won lessons, family routines, and the chaos in between.',
    'Meet the Moms',
    '/mom-knows-best',
    20,
    true
  )
on conflict (slug) do nothing;

-- RLS — public can read active verticals; service role writes.
alter table public.verticals enable row level security;

drop policy if exists verticals_read on public.verticals;
create policy verticals_read on public.verticals
  for select using (is_active = true);
