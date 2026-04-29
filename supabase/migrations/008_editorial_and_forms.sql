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
