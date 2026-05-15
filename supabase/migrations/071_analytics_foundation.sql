-- 071_analytics_foundation.sql
--
-- First-party analytics foundation. Three log tables + denormalized
-- counters + helper RPCs. Designed so we can:
--   • count article views and sort by popularity in admin
--   • build per-business reports that show real impressions, clicks, and leads
--   • attribute conversions back to a UTM-tagged campaign (first-touch)
--
-- Why log tables + counters together: counters give us O(1) reads for
-- list sorting; logs give us date ranges, attribution, and the ability
-- to recompute counters if anything goes wrong.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Article views
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.article_views (
  id              bigserial primary key,
  article_id      uuid    not null references public.guide_articles(id) on delete cascade,
  session_id      text    not null,
  viewed_at       timestamptz not null default now(),
  source_page     text    null,
  referrer_host   text    null,
  utm_source      text    null,
  utm_medium      text    null,
  utm_campaign    text    null
);

create index if not exists idx_article_views_article  on public.article_views (article_id, viewed_at desc);
create index if not exists idx_article_views_session  on public.article_views (article_id, session_id);
create index if not exists idx_article_views_viewed   on public.article_views (viewed_at desc);

alter table public.guide_articles
  add column if not exists view_count integer not null default 0;

create index if not exists idx_guide_articles_view_count
  on public.guide_articles (view_count desc)
  where published = true;

-- RPC: count one view, idempotent per (article, session) within 30 minutes.
-- Returns true if the view was actually recorded (so callers can tell).
create or replace function public.record_article_view(
  p_article_id    uuid,
  p_session_id    text,
  p_referrer_host text default null,
  p_utm_source    text default null,
  p_utm_medium    text default null,
  p_utm_campaign  text default null,
  p_source_page   text default null
) returns boolean
language plpgsql
security definer
as $$
declare
  v_recent_exists boolean;
begin
  if p_article_id is null or p_session_id is null or p_session_id = '' then
    return false;
  end if;

  -- Dedup: don't double-count the same session viewing the same article
  -- within 30 minutes. Refresh-mashing humans + Next prefetch don't inflate.
  select exists(
    select 1
      from public.article_views
     where article_id = p_article_id
       and session_id = p_session_id
       and viewed_at > now() - interval '30 minutes'
  ) into v_recent_exists;

  if v_recent_exists then
    return false;
  end if;

  insert into public.article_views (
    article_id, session_id, source_page, referrer_host,
    utm_source, utm_medium, utm_campaign
  ) values (
    p_article_id, p_session_id, p_source_page, p_referrer_host,
    p_utm_source, p_utm_medium, p_utm_campaign
  );

  update public.guide_articles
     set view_count = view_count + 1
   where id = p_article_id;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Ad events (replaces "just bump a counter" model)
-- ─────────────────────────────────────────────────────────────────────────
-- One row per impression and per click, so we can:
--   • slice by date range in client reports
--   • attribute impressions to traffic source
--   • notice anomalies (bot bursts, broken pages with no impressions)
-- The denormalized counters on ad_placements stay — they're how we sort
-- lists fast.

create table if not exists public.ad_events (
  id              bigserial primary key,
  ad_placement_id uuid    not null references public.ad_placements(id) on delete cascade,
  event_type      text    not null check (event_type in ('impression', 'click')),
  session_id      text    null,
  occurred_at     timestamptz not null default now(),
  source_page     text    null,
  referrer_host   text    null,
  utm_source      text    null,
  utm_medium      text    null,
  utm_campaign    text    null
);

create index if not exists idx_ad_events_ad        on public.ad_events (ad_placement_id, occurred_at desc);
create index if not exists idx_ad_events_type      on public.ad_events (event_type, occurred_at desc);
create index if not exists idx_ad_events_session   on public.ad_events (ad_placement_id, session_id, event_type);

-- RPC: log an ad event + bump the appropriate counter. Idempotency rules:
--   • impressions: dedup per (ad, session) within 30 minutes
--   • clicks:      always recorded (a real click is always meaningful)
create or replace function public.record_ad_event(
  p_ad_placement_id uuid,
  p_event_type      text,
  p_session_id      text default null,
  p_source_page     text default null,
  p_referrer_host   text default null,
  p_utm_source      text default null,
  p_utm_medium      text default null,
  p_utm_campaign    text default null
) returns boolean
language plpgsql
security definer
as $$
declare
  v_recent_exists boolean;
begin
  if p_ad_placement_id is null or p_event_type is null then
    return false;
  end if;
  if p_event_type not in ('impression', 'click') then
    return false;
  end if;

  if p_event_type = 'impression' and p_session_id is not null and p_session_id <> '' then
    select exists(
      select 1 from public.ad_events
       where ad_placement_id = p_ad_placement_id
         and session_id      = p_session_id
         and event_type      = 'impression'
         and occurred_at > now() - interval '30 minutes'
    ) into v_recent_exists;

    if v_recent_exists then
      return false;
    end if;
  end if;

  insert into public.ad_events (
    ad_placement_id, event_type, session_id, source_page, referrer_host,
    utm_source, utm_medium, utm_campaign
  ) values (
    p_ad_placement_id, p_event_type, p_session_id, p_source_page, p_referrer_host,
    p_utm_source, p_utm_medium, p_utm_campaign
  );

  if p_event_type = 'impression' then
    update public.ad_placements set impression_count = impression_count + 1
     where id = p_ad_placement_id;
  else
    update public.ad_placements set click_count      = click_count      + 1
     where id = p_ad_placement_id;
  end if;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. First-touch attribution
-- ─────────────────────────────────────────────────────────────────────────
-- One row per visitor session capturing where they came from on their
-- first visit. Subsequent conversion events (form fills, etc.) can
-- look up this row by session_id to attribute the credit.

create table if not exists public.attribution_visits (
  session_id        text primary key,
  first_seen_at     timestamptz not null default now(),
  first_landing     text null,
  first_referrer    text null,
  first_utm_source  text null,
  first_utm_medium  text null,
  first_utm_campaign text null,
  ip_hash           text null
);

create index if not exists idx_attribution_visits_first_seen on public.attribution_visits (first_seen_at desc);
create index if not exists idx_attribution_visits_campaign   on public.attribution_visits (first_utm_campaign) where first_utm_campaign is not null;

create or replace function public.record_first_touch(
  p_session_id     text,
  p_landing_page   text default null,
  p_referrer       text default null,
  p_utm_source     text default null,
  p_utm_medium     text default null,
  p_utm_campaign   text default null,
  p_ip_hash        text default null
) returns boolean
language plpgsql
security definer
as $$
begin
  if p_session_id is null or p_session_id = '' then return false; end if;

  insert into public.attribution_visits (
    session_id, first_landing, first_referrer,
    first_utm_source, first_utm_medium, first_utm_campaign, ip_hash
  ) values (
    p_session_id, p_landing_page, p_referrer,
    p_utm_source, p_utm_medium, p_utm_campaign, p_ip_hash
  )
  on conflict (session_id) do nothing;

  return true;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Backfill view_count from any existing article_views rows (should be 0)
-- ─────────────────────────────────────────────────────────────────────────

update public.guide_articles ga
   set view_count = sub.cnt
  from (
    select article_id, count(*) as cnt
      from public.article_views
     group by article_id
  ) sub
 where sub.article_id = ga.id
   and ga.view_count <> sub.cnt;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Grants
-- ─────────────────────────────────────────────────────────────────────────
-- The new tables are written to via SECURITY DEFINER functions called from
-- the service-role API routes. No public read or write policies needed —
-- analytics is admin-only.

grant execute on function public.record_article_view(uuid, text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.record_ad_event(uuid, text, text, text, text, text, text, text)  to anon, authenticated, service_role;
grant execute on function public.record_first_touch(text, text, text, text, text, text, text)     to anon, authenticated, service_role;
