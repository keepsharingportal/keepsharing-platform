-- 074_submission_photo_uploads.sql
--
-- Public submission flow now uploads a single photo per submission. We
-- keep TWO copies:
--   • web — Sharp-optimized webp ~1600px, used as the article hero
--   • print — the unmodified original at full resolution, for the
--     magazine layout designer to pull when prepping the print issue
--
-- This adds columns on both community_submissions (where the upload
-- lands first) and guide_articles (where the print URL gets copied
-- when the submission is approved + published).

alter table public.community_submissions
  add column if not exists web_image_url        text,
  add column if not exists print_image_url      text,
  add column if not exists reviewed_at          timestamptz,
  add column if not exists promoted_article_id  uuid references public.guide_articles(id) on delete set null;

alter table public.guide_articles
  add column if not exists print_image_url text;

comment on column public.community_submissions.web_image_url is
  'Sharp-optimized webp version of the submitter''s photo. Used as hero_image_url when promoted to a published article.';

comment on column public.community_submissions.print_image_url is
  'Unmodified original file at the resolution the submitter uploaded. The magazine layout designer pulls this for the print issue.';

comment on column public.guide_articles.print_image_url is
  'High-resolution original photo for the print issue. Carries forward from community_submissions.print_image_url when the submission is approved.';

create index if not exists idx_community_submissions_status_type
  on public.community_submissions (status, submission_type, created_at desc);
