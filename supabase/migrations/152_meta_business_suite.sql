-- ── Meta Business Suite — Page posting + comments inbox ────────────────────
--
-- Extends the existing Facebook Marketing integration with Page-side
-- features: post to Facebook + Instagram from admin (with AI caption
-- assist), see + reply to comments without leaving admin, track per-post
-- engagement.
--
-- Adds:
--   facebook_pages         — Pages this account manages (Page id, name,
--                            Page access token, Instagram business id if
--                            linked). One row per Page.
--   facebook_page_posts    — Local mirror of posts we created from admin
--                            (so we can edit/delete + see history).
--   facebook_page_comments — Recent comments pulled by nightly sync, for
--                            the inbox surface.
--
-- The existing facebook_integrations row's access_token is a user-level
-- token; we exchange it once per Page for a long-lived Page access token
-- via /me/accounts and store the Page token here. Page tokens are what
-- you need for posting + comment reads.
--
-- Scopes the user must add when they re-authorize the Meta token:
--   pages_show_list, pages_read_engagement, pages_manage_posts,
--   pages_manage_engagement, instagram_basic, instagram_content_publish

CREATE TABLE IF NOT EXISTS facebook_pages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id           UUID NOT NULL REFERENCES facebook_integrations(id) ON DELETE CASCADE,
  fb_page_id               TEXT NOT NULL,
  fb_page_name             TEXT NOT NULL,
  page_access_token        TEXT NOT NULL,
  -- Optional: linked Instagram business account, populated if the Page has
  -- one connected. Lets us post to both surfaces from one composer.
  ig_business_id           TEXT NULL,
  ig_username              TEXT NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at             TIMESTAMPTZ NULL,
  UNIQUE (integration_id, fb_page_id)
);

CREATE TABLE IF NOT EXISTS facebook_page_posts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id                  UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
  -- The graph returns id as "<pageId>_<postId>". Storing as-is.
  fb_post_id               TEXT NULL,
  message                  TEXT NOT NULL,
  link                     TEXT NULL,
  media_url                TEXT NULL,
  -- Whether to cross-post the same content to the linked IG account.
  also_to_instagram        BOOLEAN NOT NULL DEFAULT FALSE,
  ig_media_id              TEXT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending',  -- pending | live | error
  error                    TEXT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID NULL,                        -- admin_users.id
  published_at             TIMESTAMPTZ NULL,
  -- Engagement counters, refreshed by sync. Snapshot only — for trends
  -- across many posts, query the existing FB Marketing daily insights.
  like_count               INT NOT NULL DEFAULT 0,
  comment_count            INT NOT NULL DEFAULT 0,
  share_count              INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_fb_page_posts_recent
  ON facebook_page_posts (page_id, created_at DESC);

CREATE TABLE IF NOT EXISTS facebook_page_comments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id                  UUID NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
  -- The post this comment is on. Local id when we authored the post,
  -- nullable for organic posts from the Page that we didn't author.
  post_id                  UUID NULL REFERENCES facebook_page_posts(id) ON DELETE SET NULL,
  fb_post_id               TEXT NULL,
  fb_comment_id            TEXT NOT NULL,
  author_name              TEXT NULL,
  author_id                TEXT NULL,
  message                  TEXT NOT NULL,
  created_at_facebook      TIMESTAMPTZ NOT NULL,
  fetched_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Inbox UX: mark a comment handled when admin replies or dismisses.
  is_handled               BOOLEAN NOT NULL DEFAULT FALSE,
  handled_by               UUID NULL,
  handled_at               TIMESTAMPTZ NULL,
  UNIQUE (fb_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_comments_inbox
  ON facebook_page_comments (page_id, is_handled, created_at_facebook DESC);

ALTER TABLE facebook_pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_page_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_page_comments  ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE facebook_pages IS
  'Facebook Pages this Meta account manages. One row per Page; holds long-lived Page access token + linked IG business id.';
COMMENT ON TABLE facebook_page_posts IS
  'Posts authored from /admin/integrations/meta-suite. Local mirror so we can see history + edit/delete.';
COMMENT ON TABLE facebook_page_comments IS
  'Recent comments pulled by nightly sync. Powers the comments inbox in admin.';
