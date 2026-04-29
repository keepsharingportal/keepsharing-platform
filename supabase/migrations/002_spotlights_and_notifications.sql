-- KeepSharing Platform — Migration 002
-- Birthday Spotlights, Business Spotlights, Content Queue, Notifications

-- ── Birthday Spotlights ───────────────────────────────────────────────────────
create table if not exists birthday_spotlights (
  id                uuid primary key default gen_random_uuid(),
  child_name        text not null,
  child_age         integer,
  birthday_date     date,
  parent_name       text not null,
  parent_email      text not null,
  parent_phone      text,
  message           text,
  tier              text not null check (tier in ('basic','featured','premium')),
  amount            numeric(8,2) not null,
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment','paid','fulfilled','cancelled')),
  photo_url         text,
  publication       text not null default 'RRP',
  stripe_session_id text unique,
  paid_at           timestamptz,
  fulfilled_at      timestamptz,
  issue_month       text,           -- which magazine issue it runs in, e.g. 'MAR26'
  created_at        timestamptz default now()
);

create index if not exists birthday_spotlights_status_idx on birthday_spotlights(status);
create index if not exists birthday_spotlights_pub_idx    on birthday_spotlights(publication);

-- ── Business Spotlights ───────────────────────────────────────────────────────
create table if not exists business_spotlights (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name  text,
  email         text not null,
  phone         text,
  website       text,
  answers       jsonb,              -- Record<q1..q8, string>
  article_draft text,               -- Claude-generated article
  article_final text,               -- editor-approved final
  photo_urls    text[],
  status        text not null default 'pending_review'
                check (status in ('pending_review','approved','published','rejected')),
  publication   text not null default 'RRP',
  stripe_session_id text,
  paid_at       timestamptz,
  submitted_at  timestamptz default now(),
  published_at  timestamptz,
  created_at    timestamptz default now()
);

create index if not exists business_spotlights_status_idx on business_spotlights(status);

-- ── Notifications (VA / Today screen queue) ────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,        -- 'birthday_spotlight_paid', 'business_spotlight_submitted', etc.
  title       text not null,
  body        text,
  urgency     text not null default 'incoming'
              check (urgency in ('urgent','review','incoming','activity')),
  publication text not null default 'RRP',
  metadata    jsonb,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create index if not exists notifications_urgency_idx    on notifications(urgency);
create index if not exists notifications_read_at_idx    on notifications(read_at);
create index if not exists notifications_pub_idx        on notifications(publication);

-- ── Publication settings (GHL keys, Dropbox paths, etc.) ─────────────────────
create table if not exists publication_settings (
  publication   text primary key,   -- 'RRP', 'MBP', etc.
  ghl_api_key   text,               -- encrypted in production
  dropbox_path  text,
  domain        text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Seed publication settings stubs
insert into publication_settings (publication, dropbox_path) values
  ('RRP', '/Past Issues/{month}/{year}/River Region Parents/'),
  ('MBP', '/Past Issues/{month}/{year}/Mobile Bay Parents/'),
  ('AOP', '/Past Issues/{month}/{year}/Auburn Opelika Parents/'),
  ('ESP', '/Past Issues/{month}/{year}/Eastern Shore Parents/'),
  ('GPP', '/Past Issues/{month}/{year}/Greater Pensacola Parents/'),
  ('RRB', '/Past Issues/{month}/{year}/River Region Boom/')
on conflict (publication) do nothing;

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table birthday_spotlights    enable row level security;
alter table business_spotlights    enable row level security;
alter table notifications          enable row level security;
alter table publication_settings   enable row level security;

-- Super admin sees everything
create policy "Super admin full access" on birthday_spotlights
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "Super admin full access" on business_spotlights
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "Super admin full access" on notifications
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "Super admin full access" on publication_settings
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Public INSERT for birthday/business spotlight submissions (no auth required)
create policy "Public can insert birthday spotlights" on birthday_spotlights
  for insert with check (true);

create policy "Public can insert business spotlights" on business_spotlights
  for insert with check (true);
