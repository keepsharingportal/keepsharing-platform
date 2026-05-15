-- 070_blogger_portal_and_cross_pollination.sql
--
-- Two related additions that together unlock:
--   (a) cross-pollination: every article knows which vertical it belongs to,
--       so we can render "Related from School Zone" / "Related from
--       Mom Knows Best" blocks anywhere on the site
--   (b) blogger self-service: a Mom Knows Best blogger logs in with a
--       magic link, sees only their own posts, can write/edit/publish
--       without an admin in the loop
--
-- Both pieces share the same schema migration because the cross-pollination
-- column is read by the blogger dashboard and the public "Related" blocks.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Cross-pollination
-- ─────────────────────────────────────────────────────────────────────────

alter table public.guide_articles
  add column if not exists vertical_slug text;

comment on column public.guide_articles.vertical_slug is
  'Which vertical (year-round content home) this article belongs to. References verticals.slug. Independent of guide_slug (monthly print issue). One article can belong to a vertical without belonging to a guide.';

create index if not exists idx_guide_articles_vertical_slug
  on public.guide_articles (vertical_slug)
  where vertical_slug is not null;

-- Backfill from existing column_slug mappings. Safe to re-run.
update public.guide_articles
   set vertical_slug = 'mom-knows-best'
 where vertical_slug is null
   and column_slug = 'mom-knows-best';

update public.guide_articles
   set vertical_slug = 'school-zone'
 where vertical_slug is null
   and column_slug in (
     'school-bits',
     'teacher-of-month',
     'student-spotlights',
     'education-matters',
     'superintendent-updates'
   );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Blogger self-service auth linkage
-- ─────────────────────────────────────────────────────────────────────────

alter table public.bloggers
  add column if not exists email text;

comment on column public.bloggers.email is
  'Email used for magic-link login to the blogger portal. When a user logs in with this email, their auth.uid() is bound to bloggers.user_id.';

create unique index if not exists idx_bloggers_email_unique
  on public.bloggers (lower(email))
  where email is not null;

-- Bloggers can read their own row (in addition to public read of active rows)
drop policy if exists "bloggers_self_read" on public.bloggers;
create policy "bloggers_self_read"
  on public.bloggers for select
  using (user_id = auth.uid());

drop policy if exists "bloggers_self_update" on public.bloggers;
create policy "bloggers_self_update"
  on public.bloggers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Blogger access to own guide_articles
-- ─────────────────────────────────────────────────────────────────────────
-- Existing policies on guide_articles already allow public read of published
-- rows. These add the blogger-only "read/write own drafts" layer.

drop policy if exists "guide_articles_blogger_read_own" on public.guide_articles;
create policy "guide_articles_blogger_read_own"
  on public.guide_articles for select
  using (
    author_blogger_id in (
      select id from public.bloggers where user_id = auth.uid()
    )
  );

drop policy if exists "guide_articles_blogger_insert" on public.guide_articles;
create policy "guide_articles_blogger_insert"
  on public.guide_articles for insert
  with check (
    author_blogger_id in (
      select id from public.bloggers where user_id = auth.uid()
    )
  );

drop policy if exists "guide_articles_blogger_update" on public.guide_articles;
create policy "guide_articles_blogger_update"
  on public.guide_articles for update
  using (
    author_blogger_id in (
      select id from public.bloggers where user_id = auth.uid()
    )
  )
  with check (
    author_blogger_id in (
      select id from public.bloggers where user_id = auth.uid()
    )
  );

-- Bloggers can delete their own drafts (only unpublished ones — published
-- posts should go through admin to keep edit history visible)
drop policy if exists "guide_articles_blogger_delete_own_draft" on public.guide_articles;
create policy "guide_articles_blogger_delete_own_draft"
  on public.guide_articles for delete
  using (
    published = false
    and author_blogger_id in (
      select id from public.bloggers where user_id = auth.uid()
    )
  );
