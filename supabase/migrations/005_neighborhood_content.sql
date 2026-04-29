-- KeepSharing Platform — Neighborhood Personalization
-- Adds neighborhood_tags to content tables so records can be geo-targeted

-- Valid neighborhood slugs:
-- 'prattville', 'wetumpka', 'millbrook', 'pike-road', 'eastchase', 'montgomery', 'all'
-- An empty array or array containing 'all' means shown everywhere.

alter table school_news   add column if not exists neighborhood_tags text[] not null default '{}';
alter table nominations   add column if not exists neighborhood_tags text[] not null default '{}';
alter table social_posts  add column if not exists neighborhood_tags text[] not null default '{}';
alter table guide_listings add column if not exists neighborhood_tags text[] not null default '{}';

-- Content posts — general neighborhood-specific articles and blurbs
create table if not exists content_posts (
  id                uuid primary key default gen_random_uuid(),
  publication       text not null default 'RRP',
  title             text not null,
  body              text,
  excerpt           text,
  category          text,          -- 'school-news', 'event', 'spotlight', 'announcement', 'tip'
  image_url         text,
  neighborhood_tags text[] not null default '{}',
  author            text,
  published_at      timestamptz default now(),
  status            text not null default 'published'
                      check (status in ('draft','published','archived')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists content_posts_pub_idx           on content_posts(publication);
create index if not exists content_posts_neighborhood_idx  on content_posts using gin(neighborhood_tags);
create index if not exists school_news_neighborhood_idx    on school_news   using gin(neighborhood_tags);
create index if not exists nominations_neighborhood_idx    on nominations   using gin(neighborhood_tags);

-- RLS
alter table content_posts enable row level security;

create policy "public read published" on content_posts
  for select using (status = 'published');

create policy "super admin full access" on content_posts
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
