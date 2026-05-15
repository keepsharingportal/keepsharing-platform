-- 068_bloggers_mom_knows_best.sql ─────────────────────────────────────────────
-- Mom Knows Best: a network of local mom bloggers. Each blogger has a profile
-- (bio, profile photo, family photo, Q&A) and their own blog posts under the
-- mom-knows-best column. Posts live in guide_articles like every other
-- editorial piece — just linked via author_blogger_id.
--
-- Today: Jason creates blogger profiles via /admin/bloggers and writes posts
-- on their behalf from the existing article editor (the editor will get a
-- "Blogger" picker when column = mom-knows-best).
--
-- Future (Phase 2): the user_id column gives each blogger their own admin
-- login. Auth flow lands separately.

create table if not exists public.bloggers (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,         -- URL slug: /mom-knows-best/{slug}
  display_name       text not null,                -- "Hayley Denny"
  tagline            text,                         -- "Working mom of 2, marathon walker"
  profile_image_url  text,                         -- portrait, used in cards + sidebar
  family_image_url   text,                         -- wider family photo, used on profile page hero
  bio                text,                         -- longer bio paragraph(s)
  quick_takes        jsonb,                        -- [{ question, answer }, ...]
  is_active          boolean default true not null,
  display_order      int default 100,
  user_id            uuid,                         -- nullable; reserved for future Blogger auth role
  created_at         timestamptz default now() not null,
  updated_at         timestamptz default now() not null
);

create index if not exists bloggers_slug_idx        on public.bloggers (slug);
create index if not exists bloggers_active_idx      on public.bloggers (is_active) where is_active;
create index if not exists bloggers_display_idx     on public.bloggers (display_order);

-- Link articles back to their author blogger. Nullable so legacy + staff
-- articles still work without a blogger.
alter table public.guide_articles
  add column if not exists author_blogger_id uuid references public.bloggers(id) on delete set null;

create index if not exists guide_articles_blogger_idx
  on public.guide_articles (author_blogger_id)
  where author_blogger_id is not null;

-- updated_at trigger
drop trigger if exists bloggers_updated_at on public.bloggers;
create trigger bloggers_updated_at
  before update on public.bloggers
  for each row execute function public.set_updated_at();

-- RLS — public can read active bloggers; service role does writes.
alter table public.bloggers enable row level security;

drop policy if exists bloggers_read on public.bloggers;
create policy bloggers_read on public.bloggers
  for select using (is_active = true);
