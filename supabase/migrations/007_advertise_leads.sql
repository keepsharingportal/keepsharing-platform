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
