-- KeepSharing Platform — Initial Schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor

-- ── Publications ──────────────────────────────────────────────────────────────
create table if not exists publications (
  id          uuid primary key default gen_random_uuid(),
  abbrev      text not null unique,
  name        text not null,
  market      text not null,
  state       char(2) not null,
  skin        text not null default 'parenting' check (skin in ('parenting','prime')),
  domain      text,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- ── Businesses (the company — exists once, forever) ───────────────────────────
create table if not exists businesses (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  owner_name             text,
  phone                  text,
  fax                    text,
  website                text,
  email                  text,
  billing_street         text,
  billing_city           text,
  billing_state          char(2),
  billing_zip            text,
  primary_publication_id uuid references publications(id),
  magazine_interest      text,
  special_markets        text[],
  distribution           text,
  recurring_month        text,
  sales_rep              text,
  callback_date          date,
  callback_notes         text,
  notes                  text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── Contacts (linked to businesses) ──────────────────────────────────────────
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references businesses(id) on delete cascade,
  first_name   text not null,
  last_name    text,
  title        text,
  phone        text,
  email        text,
  is_primary   boolean default false,
  created_at   timestamptz default now()
);

-- ── Advertiser Records (one per ad per issue/month) ───────────────────────────
create table if not exists advertisers (
  id               uuid primary key default gen_random_uuid(),
  publication_id   uuid references publications(id),
  business_id      uuid references businesses(id),
  contact_id       uuid references contacts(id),
  issue            text not null,     -- 'RRP MAR26'
  stage            text not null default 'Closed Won',
  amount           numeric(10,2),
  directory        boolean default false,
  layout_notes     text,
  social           text,
  invoice_type     text default 'Invoice' check (invoice_type in ('Invoice','A Check')),
  customer_care    text,
  designer         text,
  design_status    text default 'Pick-up' check (design_status in ('New','Pick-up','DropBox')),
  size             numeric(4,2) not null,  -- 0.12, 0.25, 0.5, 1, 2
  orientation      text check (orientation in ('Horizontal','Vertical','Square')),
  special_position text,
  specific_months  text[],
  expires          text,               -- 'Dec26'
  description      text,
  source           text,
  closing_date     date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists advertisers_issue_idx on advertisers(issue);
create index if not exists advertisers_publication_idx on advertisers(publication_id);
create index if not exists advertisers_business_idx on advertisers(business_id);

-- ── Ad Agreements (the contract) ──────────────────────────────────────────────
create table if not exists ad_agreements (
  id                      uuid primary key default gen_random_uuid(),
  subject                 text not null,  -- '[Business] MAR26-DEC26 Ad Agreement'
  business_id             uuid references businesses(id),
  contact_id              uuid references contacts(id),
  publications            text[],
  num_months              integer,
  specific_months         text[],
  billing_address         text,
  placement_instructions  text,
  line_items              jsonb,          -- [{pub, size, rate, qty, total}]
  subtotal                numeric(10,2),
  tax                     numeric(10,2) default 0,
  adjustment              numeric(10,2) default 0,
  grand_total             numeric(10,2),
  status                  text default 'Created' check (status in ('Created','Sent','Signed','Expired')),
  signature_name          text,
  signature_title         text,
  signature_timestamp     timestamptz,
  signature_ip            text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table publications   enable row level security;
alter table businesses     enable row level security;
alter table contacts       enable row level security;
alter table advertisers    enable row level security;
alter table ad_agreements  enable row level security;

-- Super admin policy (Jason) — sees everything
-- Replace 'jason@keepsharing.com' with the actual admin email
create policy "Super admin full access" on advertisers
  for all using (
    auth.jwt() ->> 'email' = 'jade31994@gmail.com'
  );

create policy "Super admin full access" on businesses
  for all using (
    auth.jwt() ->> 'email' = 'jade31994@gmail.com'
  );

-- Seed publications
insert into publications (abbrev, name, market, state, skin) values
  ('RRP', 'River Region Parents',       'Montgomery',    'AL', 'parenting'),
  ('MBP', 'Mobile Bay Parents',         'Mobile',        'AL', 'parenting'),
  ('AOP', 'Auburn Opelika Parents',     'Auburn/Opelika','AL', 'parenting'),
  ('ESP', 'Eastern Shore Parents',      'Eastern Shore', 'AL', 'parenting'),
  ('GPP', 'Greater Pensacola Parents',  'Pensacola',     'FL', 'parenting'),
  ('RRB', 'River Region Boom',          'Montgomery',    'AL', 'prime')
on conflict (abbrev) do nothing;
