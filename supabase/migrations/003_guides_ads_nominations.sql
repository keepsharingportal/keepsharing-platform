-- KeepSharing Platform — Migration 003
-- Guide listings, ad server tables, nominations, school news, social queue

-- ── Guide Listings ────────────────────────────────────────────────────────────
create table if not exists guide_listings (
  id                    uuid primary key default gen_random_uuid(),
  publication           text not null default 'RRP',
  guide_month           integer not null check (guide_month between 1 and 12),
  year                  integer not null,
  guide_name            text not null,
  business_name         text not null,
  contact_name          text,
  phone                 text,
  email                 text,
  website               text,
  address               text,
  category              text,
  description           text,
  last_verified         date,
  update_status         text default 'not_sent'
                        check (update_status in ('not_sent','sent','responded','updated')),
  update_request_sent_at timestamptz,
  update_token          text unique,
  pending_changes       jsonb,
  responded_at          timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists guide_listings_month_idx on guide_listings(guide_month, year, publication);
create index if not exists guide_listings_token_idx on guide_listings(update_token);

-- ── Ad Server ─────────────────────────────────────────────────────────────────
create table if not exists ads (
  id               uuid primary key default gen_random_uuid(),
  business_name    text not null,
  publication      text not null,
  zone             text not null,
  image_url        text,
  destination_url  text not null,
  start_date       date not null,
  end_date         date,
  active           boolean default true,
  total_clicks     integer default 0,
  total_impressions integer default 0,
  created_at       timestamptz default now()
);

create table if not exists ad_clicks (
  id          uuid primary key default gen_random_uuid(),
  ad_id       uuid references ads(id) on delete cascade,
  clicked_at  timestamptz default now(),
  zone        text,
  publication text,
  referrer    text,
  user_agent  text
);

create index if not exists ad_clicks_ad_idx    on ad_clicks(ad_id);
create index if not exists ad_clicks_date_idx  on ad_clicks(clicked_at);
create index if not exists ads_zone_idx        on ads(zone, publication);

-- Stored procedure to increment click counter
create or replace function increment_ad_clicks(ad_id_param uuid)
returns void language plpgsql as $$
begin
  update ads set total_clicks = total_clicks + 1 where id = ad_id_param;
end;
$$;

-- ── Nominations ───────────────────────────────────────────────────────────────
create table if not exists nominations (
  id                       uuid primary key default gen_random_uuid(),
  type                     text not null check (type in ('cover-profile','mom-to-mom','teacher-of-month','grands-are-great')),
  publication              text not null default 'RRP',
  subject_name             text not null,
  subject_email            text,
  subject_phone            text,
  nominator_name           text not null,
  nominator_email          text not null,
  nominator_phone          text,
  reason                   text,
  status                   text default 'pending',
  submitted_at             timestamptz default now(),
  selected_at              date,
  issue_month              text,
  questions_generated_at   date,
  interview_scheduled_for  text,
  interviewed_at           date,
  article_drafted_at       date,
  photo_received_at        date,
  approved_at              date,
  published_at             date,
  notes                    text
);

-- ── School News ───────────────────────────────────────────────────────────────
create table if not exists school_news (
  id           uuid primary key default gen_random_uuid(),
  school       text not null,
  blurb        text not null,
  image_url    text,
  source       text default 'manual' check (source in ('form','email','facebook','manual')),
  status       text default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at date default current_date,
  publication  text not null default 'RRP',
  submitted_by text,
  facebook_url text,
  created_at   timestamptz default now()
);

-- ── Social Posts Queue ────────────────────────────────────────────────────────
create table if not exists social_posts (
  id            uuid primary key default gen_random_uuid(),
  publication   text not null,
  platform      text not null check (platform in ('instagram','facebook','both')),
  image_url     text,
  caption       text not null,
  hashtags      text,
  scheduled_at  timestamptz,
  status        text default 'draft' check (status in ('draft','pending','approved','posted')),
  type          text,
  source_article text,
  generated_by  text default 'claude' check (generated_by in ('claude','manual','ghl')),
  approved_by   text,
  posted_at     timestamptz,
  reach         integer,
  engagements   integer,
  ghl_post_id   text,
  created_at    timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table guide_listings  enable row level security;
alter table ads             enable row level security;
alter table ad_clicks       enable row level security;
alter table nominations     enable row level security;
alter table school_news     enable row level security;
alter table social_posts    enable row level security;

-- Super admin policies
create policy "Super admin guide_listings"  on guide_listings  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "Super admin ads"             on ads             for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "Super admin ad_clicks"       on ad_clicks       for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "Super admin nominations"     on nominations     for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "Super admin school_news"     on school_news     for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "Super admin social_posts"    on social_posts    for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Public INSERT for nominations (no auth required)
create policy "Public can insert nominations" on nominations
  for insert with check (true);

-- Public INSERT for school news form submissions
create policy "Public can insert school_news" on school_news
  for insert with check (true);

-- Ad click tracking is public (no auth for click logs)
create policy "Public can insert ad_clicks" on ad_clicks
  for insert with check (true);
