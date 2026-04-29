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
