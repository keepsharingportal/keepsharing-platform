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
