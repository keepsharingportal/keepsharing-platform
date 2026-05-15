-- 072_town_profiles_and_frg_taxonomy.sql
--
-- Two pieces, both in service of the Family Resource Guide rebuild:
--
-- 1. town_profiles — the 5 towns that make up the River Region get their
--    own first-class profile pages: Montgomery, Prattville, Wetumpka,
--    Millbrook, Pike Road. Each town has a hero photo, vibe in one
--    sentence, longer description, school districts, population, and
--    "best things to do" links. Newcomers and locals both use these.
--
-- 2. submitted_tips — moms texting in their favorite spots ("you should
--    add Mama Lu's, best pancakes in Prattville"). Feeds future Best-Of
--    editorial content + keeps the page conversational.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. town_profiles
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.town_profiles (
  slug              text primary key,
  name              text not null,
  county            text null,
  vibe_one_line     text null,
  description       text null,
  hero_image_url    text null,
  homepage_image_url text null,
  population        integer null,
  school_districts  text[] null,
  highlights        text[] null,                -- short bulleted "what's great" list
  related_listing_slugs text[] null,            -- optional: featured listings to surface
  display_order     integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_town_profiles_active_order
  on public.town_profiles (display_order, name)
  where is_active = true;

-- Public read of active rows; service-role writes
alter table public.town_profiles enable row level security;

drop policy if exists "town_profiles_read" on public.town_profiles;
create policy "town_profiles_read"
  on public.town_profiles for select
  using (is_active = true);

-- Seed the 5 confirmed towns. Placeholder copy — Jason edits via admin.
insert into public.town_profiles (slug, name, county, vibe_one_line, description, population, school_districts, highlights, display_order)
values
  ('montgomery',
   'Montgomery',
   'Montgomery County',
   'The capital city — history, culture, and the biggest range of family options in the region.',
   'Montgomery is the heart of the River Region — Alabama''s capital city, home to Maxwell Air Force Base, a thriving arts scene, and the largest concentration of pediatricians, schools, and family services in the area. Big enough to find anything; familiar enough to feel like home.',
   200000,
   array['Montgomery Public Schools', 'Private & Faith-Based Schools'],
   array['Riverwalk', 'MMFA & Shakespeare Festival', 'Cramton Bowl events', 'Old Cloverdale neighborhood', 'Dexter Avenue history'],
   10),

  ('prattville',
   'Prattville',
   'Autauga County',
   'Small-town charm, big heart — and one of the best-loved school systems in central Alabama.',
   'Prattville (the "Fountain City") sits just north of Montgomery and grows on you fast. Historic downtown, strong schools, and a tight-knit feel that newcomers say surprised them in the best way. Lots of young families.',
   38000,
   array['Autauga County Schools', 'Private Schools'],
   array['Pratt Park', 'Cooter''s Pond', 'Historic Downtown', 'Autauga Creek', 'Capitol Hill Golf'],
   20),

  ('wetumpka',
   'Wetumpka',
   'Elmore County',
   'River-town charm, antiques, and a national-TV moment that put it on the map.',
   'Wetumpka — the "City of Natural Beauty" — earned national attention after HBO''s Small Town, Big Deal renovation. Downtown is walkable, the Coosa River runs through it, and Jasmine Hill Gardens is a short drive away. Family-friendly without the suburban sprawl.',
   8400,
   array['Elmore County Schools', 'Wetumpka Christian Academy'],
   array['Downtown Wetumpka', 'Coosa River', 'Jasmine Hill Gardens', 'Wetumpka Crater', 'Antique shops'],
   30),

  ('millbrook',
   'Millbrook',
   'Elmore County',
   'Family-first subdivisions, parks-everywhere, and easy access to everything.',
   'Millbrook is the River Region''s suburban sweet spot — affordable, family-dense, and conveniently located between Montgomery and Wetumpka. Strong Elmore County schools, the Village Green park, and miles of newer neighborhoods built for young families.',
   16000,
   array['Elmore County Schools'],
   array['Village Green Park', 'Alabama Nature Center', 'Cobbs Ford Road shopping', 'Easy I-65 access', 'Newer neighborhoods'],
   40),

  ('pike-road',
   'Pike Road',
   'Montgomery County',
   'The newest, fastest-growing town — built around its school district.',
   'Pike Road is the youngest town in the River Region and probably the fastest-growing. Pike Road Schools (PRS) — its independent K–12 district — is one of the biggest reasons families choose to move here. Master-planned neighborhoods, lots of green space, a strong sense of community for a town that''s still mid-build.',
   13000,
   array['Pike Road Schools (PRS)', 'Private Options'],
   array['Pike Road Schools campus', 'The Waters community', 'Walking trails', 'Family festivals', 'Easy access to Mont. & Wetumpka'],
   50)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. submitted_tips
-- ─────────────────────────────────────────────────────────────────────────
-- Moms text in tips ("Mama Lu''s in Prattville has the best pancakes!").
-- These feed the editorial pipeline for future Best-Of lists. Public
-- inserts allowed; only admins read.

create table if not exists public.submitted_tips (
  id            bigserial primary key,
  category      text null,
  business_name text null,
  town          text null,
  recommendation text not null,
  submitter_name text null,
  submitter_email text null,
  source_page   text null,
  status        text not null default 'new' check (status in ('new', 'reviewed', 'added', 'discarded')),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz null,
  notes         text null
);

create index if not exists idx_submitted_tips_status_created
  on public.submitted_tips (status, created_at desc);

alter table public.submitted_tips enable row level security;

-- Anyone can submit a tip (via the API which uses service role anyway,
-- but RLS gives us a belt-and-suspenders layer)
drop policy if exists "submitted_tips_insert_any" on public.submitted_tips;
create policy "submitted_tips_insert_any"
  on public.submitted_tips for insert
  with check (true);

-- Only the service role can read (admin reviews these manually)
