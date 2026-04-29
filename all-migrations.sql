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
-- KeepSharing Platform — Marketing System
-- Stores marketing system clients, performance snapshots, and generated reports

-- ── Marketing Clients ─────────────────────────────────────────────────────────
create table if not exists marketing_clients (
  id                   uuid primary key default gen_random_uuid(),
  business_name        text not null,
  industry             text not null check (industry in (
    'orthodontist','dental','childcare','private_school',
    'pediatric','after_school','party_venue','hvac','other'
  )),
  primary_offer        text,
  target_audience      text,
  service_area_zips    text[] not null default '{}',
  ghl_account_id       text,
  meta_ad_account_id   text,
  landing_page_url     text,
  trial_started_at     timestamptz not null default now(),
  trial_converted_at   timestamptz,
  status               text not null default 'trial'
                         check (status in ('trial','active','paused','cancelled')),
  notes                text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Monthly Performance Snapshots (pulled from GHL + Meta) ───────────────────
create table if not exists marketing_performance (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references marketing_clients(id) on delete cascade,
  report_month   text not null,       -- 'APR26'
  lead_count     integer not null default 0,
  meta_spend     numeric(10,2) not null default 0,
  cost_per_lead  numeric(10,2),
  last_synced_at timestamptz,
  created_at     timestamptz default now(),
  unique (client_id, report_month)
);

-- ── Performance Reports ───────────────────────────────────────────────────────
create table if not exists marketing_reports (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references marketing_clients(id) on delete cascade,
  report_month text not null,
  summary_data jsonb,         -- snapshot of metrics at generation time
  report_url   text,          -- future: generated PDF URL
  generated_at timestamptz default now(),
  sent_at      timestamptz,
  created_at   timestamptz default now()
);

create index if not exists marketing_perf_client_idx    on marketing_performance(client_id);
create index if not exists marketing_reports_client_idx on marketing_reports(client_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table marketing_clients     enable row level security;
alter table marketing_performance enable row level security;
alter table marketing_reports     enable row level security;

create policy "super admin full access" on marketing_clients
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "super admin full access" on marketing_performance
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "super admin full access" on marketing_reports
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
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
-- KeepSharing Platform — Self-Serve Ad Booking
-- Inventory slots per publication per issue, and the booking records

-- ── Ad Inventory ───────────────────────────────────────────────────────────────
-- One row per available zone per publication per issue.
-- Pre-populated for the current + next 6 months by the admin or seed script.
create table if not exists ad_inventory (
  id              uuid primary key default gen_random_uuid(),
  publication     text not null,
  issue           text not null,       -- 'RRP APR26'
  zone_id         text not null,
  zone_type       text not null check (zone_type in ('print','web')),
  zone_name       text not null,       -- display name
  price_monthly   numeric(10,2) not null,
  status          text not null default 'available'
                    check (status in ('available','reserved','booked')),
  booking_id      uuid,
  booked_business text,
  created_at      timestamptz default now(),
  unique (publication, issue, zone_id)
);

-- ── Ad Bookings ────────────────────────────────────────────────────────────────
create table if not exists ad_bookings (
  id                      uuid primary key default gen_random_uuid(),
  publication             text not null,
  issues                  text[] not null,           -- can book multiple months
  zone_id                 text not null,
  zone_type               text not null,
  zone_name               text not null,
  business_name           text not null,
  contact_name            text,
  phone                   text,
  email                   text not null,
  website                 text,
  package_type            text not null
                            check (package_type in ('print','web','bundle')),
  total_amount            numeric(10,2) not null,
  design_help             boolean not null default false,
  ad_graphic_url          text,
  stripe_session_id       text,
  stripe_payment_intent   text,
  status                  text not null default 'pending'
                            check (status in ('pending','paid','cancelled','refunded')),
  ghl_sequence_triggered  boolean not null default false,
  va_notified             boolean not null default false,
  notes                   text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index if not exists ad_inventory_pub_issue_idx  on ad_inventory(publication, issue);
create index if not exists ad_inventory_status_idx     on ad_inventory(status);
create index if not exists ad_bookings_pub_idx         on ad_bookings(publication);
create index if not exists ad_bookings_status_idx      on ad_bookings(status);
create index if not exists ad_bookings_email_idx       on ad_bookings(email);
create index if not exists ad_bookings_stripe_idx      on ad_bookings(stripe_session_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table ad_inventory enable row level security;
alter table ad_bookings  enable row level security;

-- Anyone can read inventory (to see availability on public page)
create policy "public read inventory" on ad_inventory
  for select using (true);

-- Super admin can do everything
create policy "super admin full access inventory" on ad_inventory
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

create policy "super admin full access bookings" on ad_bookings
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Anyone can insert a booking (public booking flow)
create policy "public insert bookings" on ad_bookings
  for insert with check (true);
-- KeepSharing Platform — Self-Serve Advertiser Leads
-- Captures leads from /advertise Page 1 and paid campaigns from Page 2

create table if not exists advertiser_leads (
  id                       uuid primary key default gen_random_uuid(),
  -- Page 1 lead form fields
  first_name               text not null,
  last_name                text,
  business_name            text not null,
  email                    text not null,
  phone                    text,
  business_type            text,
  interests                text[] default '{}',  -- 'print','digital','social','multi-month'
  notes                    text,
  -- Page 2 campaign fields (filled in after lead)
  ad_size                  text check (ad_size in ('full','half','quarter','sixth')),
  commitment_months        integer check (commitment_months in (1,3,6,12,18)),
  monthly_rate             numeric(10,2),
  total_amount             numeric(10,2),
  goals                    text[] default '{}',
  campaign_notes           text,
  -- Stripe
  stripe_session_id        text,
  stripe_payment_intent    text,
  -- Workflow
  status                   text not null default 'lead'
                             check (status in ('lead','campaign_started','paid','active','cancelled')),
  ghl_sequence_triggered   boolean not null default false,
  va_notified              boolean not null default false,
  source                   text not null default 'self_serve_web',
  -- Timestamps
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists advertiser_leads_email_idx   on advertiser_leads(email);
create index if not exists advertiser_leads_status_idx  on advertiser_leads(status);
create index if not exists advertiser_leads_stripe_idx  on advertiser_leads(stripe_session_id);

-- RLS
alter table advertiser_leads enable row level security;

-- Super admin sees all
create policy "super admin full access" on advertiser_leads
  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Public can insert a lead (the landing page form submission)
create policy "public insert lead" on advertiser_leads
  for insert with check (true);
-- KeepSharing Platform — Editorial Board, Word Search, Submission Forms,
-- Anniversary Spotlights, Weekend Reservations

-- ── Editorial Board ──────────────────────────────────────────────────────────
create table if not exists editorial_items (
  id                   uuid primary key default gen_random_uuid(),
  publication          text not null check (publication in ('RRP','RRB')),
  month_key            text not null,      -- 'APR26'
  title                text not null,
  department           text not null,
  status               text not null default 'idea'
                         check (status in ('idea','assigned','in-progress','draft-ready','approved','scheduled','published')),
  responsible          text,
  due_date             date,
  sponsor_opportunity  text,
  form_exists          boolean not null default false,
  notes                text,
  scheduled_at         timestamptz,
  social_caption       text,
  article_body         text,              -- AI-generated article content
  source_submission_id uuid,             -- links to content_submissions
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists editorial_pub_month_idx on editorial_items(publication, month_key);
create index if not exists editorial_status_idx    on editorial_items(status);

-- ── Word Search Puzzles ───────────────────────────────────────────────────────
create table if not exists word_search_puzzles (
  id             uuid primary key default gen_random_uuid(),
  publication    text not null default 'RRB',
  month_key      text not null,           -- 'APR26'
  title          text not null,
  words          text[] not null,         -- word list provided by Jason
  grid_data      jsonb,                   -- generated grid + word positions
  sponsor_name   text,
  prize_amount   text,
  is_active      boolean not null default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (publication, month_key)
);

create table if not exists word_search_submissions (
  id            uuid primary key default gen_random_uuid(),
  puzzle_id     uuid not null references word_search_puzzles(id) on delete cascade,
  name          text not null,
  email         text not null,
  found_words   text[] not null default '{}',
  completed     boolean not null default false,
  is_winner     boolean not null default false,
  created_at    timestamptz default now()
);

create index if not exists ws_submissions_puzzle_idx on word_search_submissions(puzzle_id);

-- ── Unified Content Submissions ───────────────────────────────────────────────
-- Receives all public form submissions before they enter the editorial queue
create table if not exists content_submissions (
  id              uuid primary key default gen_random_uuid(),
  form_type       text not null,
  -- 'second-act', 'then-and-now', 'ask-the-doctor', 'student-spotlight',
  -- 'local-kid', 'parent-poll', 'anniversary-spotlight'
  publication     text not null default 'RRB',
  name            text,
  email           text,
  phone           text,
  form_data       jsonb not null default '{}',   -- all form fields stored here
  photo_urls      text[] default '{}',           -- uploaded photo URLs
  ai_article      text,                          -- Claude-generated article
  status          text not null default 'pending'
                    check (status in ('pending','reviewed','approved','rejected','published')),
  editorial_item_id uuid references editorial_items(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists submissions_form_type_idx on content_submissions(form_type);
create index if not exists submissions_status_idx    on content_submissions(status);

-- ── Anniversary Spotlights ────────────────────────────────────────────────────
create table if not exists anniversary_spotlights (
  id                   uuid primary key default gen_random_uuid(),
  couple_name          text not null,
  person1_name         text not null,
  person2_name         text not null,
  years_together       integer,
  anniversary_date     date,
  short_message        text,
  email                text not null,
  tier                 text not null default 'free'
                         check (tier in ('free','featured','premium')),
  amount               numeric(10,2) default 0,
  status               text not null default 'pending_payment'
                         check (status in ('pending_payment','pending_approval','approved','scheduled','published','rejected')),
  photo_url            text,
  stripe_session_id    text,
  stripe_payment_intent text,
  social_post          text,            -- AI-generated for featured/premium
  pdf_url              text,            -- AI-generated keepsake for premium
  print_flag           boolean not null default false,
  scheduled_publish    date,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists anniversaries_status_idx  on anniversary_spotlights(status);
create index if not exists anniversaries_stripe_idx  on anniversary_spotlights(stripe_session_id);

-- ── Weekend Reservations ──────────────────────────────────────────────────────
create table if not exists weekend_reservations (
  id               uuid primary key default gen_random_uuid(),
  publication      text not null default 'RRB',
  restaurant_name  text not null,
  dish_rec         text not null,
  description      text not null,
  photo_url        text,
  restaurant_url   text,
  scheduled_for    timestamptz,        -- auto-set to next Friday 6am
  status           text not null default 'scheduled'
                     check (status in ('draft','scheduled','published')),
  created_at       timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table editorial_items         enable row level security;
alter table word_search_puzzles     enable row level security;
alter table word_search_submissions enable row level security;
alter table content_submissions     enable row level security;
alter table anniversary_spotlights  enable row level security;
alter table weekend_reservations    enable row level security;

-- Super admin full access
create policy "super admin" on editorial_items         for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "super admin" on word_search_puzzles     for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "super admin" on content_submissions     for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "super admin" on anniversary_spotlights  for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');
create policy "super admin" on weekend_reservations    for all using (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Public read: active word search puzzle
create policy "public read active puzzle" on word_search_puzzles for select using (is_active = true);
-- Public insert: puzzle entries
create policy "public submit entry" on word_search_submissions for insert with check (true);
-- Public insert: content submissions
create policy "public submit form" on content_submissions for insert with check (true);
-- Public insert: anniversary spotlights
create policy "public submit anniversary" on anniversary_spotlights for insert with check (true);
-- Public read: published anniversary spotlights
create policy "public read published anniversaries" on anniversary_spotlights for select using (status = 'published');
-- Summer Fun Guide: camps, activities, and programs for River Region kids

CREATE TABLE IF NOT EXISTS summer_fun_guide (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser            BOOLEAN NOT NULL DEFAULT FALSE,
  category              TEXT NOT NULL,
  business_name         TEXT NOT NULL,
  address               TEXT,
  city                  TEXT,
  state                 TEXT DEFAULT 'AL',
  zip                   TEXT,
  phone                 TEXT,
  website               TEXT,
  email                 TEXT,
  ages                  TEXT,                        -- e.g. "Ages 6-12" or "All Ages"
  description           TEXT,
  photo_url             TEXT,
  price_range           TEXT CHECK (price_range IN ('free','under-100','100-250','250-plus','varies')),
  registration_status   TEXT CHECK (registration_status IN ('open','waitlist','full','tbd')) DEFAULT 'open',
  indoor_outdoor        TEXT CHECK (indoor_outdoor IN ('indoor','outdoor','both')),
  financial_aid_available BOOLEAN DEFAULT FALSE,
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  slug                  TEXT UNIQUE NOT NULL,
  neighborhood_tag      TEXT,                        -- prattville | wetumpka | millbrook | pike-road | eastchase | montgomery
  publication           TEXT NOT NULL DEFAULT 'RRP',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfg_category    ON summer_fun_guide(category);
CREATE INDEX IF NOT EXISTS idx_sfg_publication ON summer_fun_guide(publication);
CREATE INDEX IF NOT EXISTS idx_sfg_featured    ON summer_fun_guide(featured);
CREATE INDEX IF NOT EXISTS idx_sfg_neighborhood ON summer_fun_guide(neighborhood_tag);

ALTER TABLE summer_fun_guide ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read summer_fun_guide"
  ON summer_fun_guide FOR SELECT USING (true);

CREATE POLICY "Super admin full access to summer_fun_guide"
  ON summer_fun_guide
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- Email capture leads (Summer Guide PDF requests → GHL)
CREATE TABLE IF NOT EXISTS summer_guide_leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  source      TEXT DEFAULT 'summer-guide-2026',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE summer_guide_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin access to summer_guide_leads"
  ON summer_guide_leads
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

CREATE POLICY "Anyone can insert summer_guide_leads"
  ON summer_guide_leads FOR INSERT WITH CHECK (true);
-- Summer Fun Guide v2: extended fields for richer filtering, geocoding, and tier system

-- New boolean fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS before_after_care      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_needs_friendly  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS faith_based             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS drop_in_available       BOOLEAN NOT NULL DEFAULT FALSE;

-- New text / detail fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS camp_director_name TEXT,
  ADD COLUMN IF NOT EXISTS discount_code      TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url      TEXT,
  ADD COLUMN IF NOT EXISTS virtual_tour_url   TEXT;

-- Geocoding fields
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS latitude    DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS longitude   DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ;

-- Listing tier (replaces using featured/advertiser booleans for tier logic)
ALTER TABLE summer_fun_guide
  ADD COLUMN IF NOT EXISTS listing_tier TEXT
    NOT NULL DEFAULT 'community'
    CHECK (listing_tier IN ('community', 'enhanced', 'advertiser'));

-- Expand registration_status to include opening-soon
ALTER TABLE summer_fun_guide
  DROP CONSTRAINT IF EXISTS summer_fun_guide_registration_status_check;
ALTER TABLE summer_fun_guide
  ADD CONSTRAINT summer_fun_guide_registration_status_check
    CHECK (registration_status IN ('open', 'waitlist', 'full', 'opening-soon', 'tbd'));

-- Backfill listing_tier from existing booleans
UPDATE summer_fun_guide SET listing_tier = 'advertiser' WHERE advertiser = TRUE;
UPDATE summer_fun_guide SET listing_tier = 'enhanced'   WHERE advertiser = FALSE AND featured = TRUE;
-- community is the default, no UPDATE needed

-- Indexes for new filter columns
CREATE INDEX IF NOT EXISTS idx_sfg_tier           ON summer_fun_guide(listing_tier);
CREATE INDEX IF NOT EXISTS idx_sfg_before_after   ON summer_fun_guide(before_after_care);
CREATE INDEX IF NOT EXISTS idx_sfg_financial_aid  ON summer_fun_guide(financial_aid_available);
CREATE INDEX IF NOT EXISTS idx_sfg_coords         ON summer_fun_guide(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sfg_reg_status     ON summer_fun_guide(registration_status);
