-- ── Reader loyalty + audience handoff ─────────────────────────────────────
--
-- Three pieces:
--   1. Per-brand newsletter routing via GHL — each brand can target a
--      different GHL list / tag so an Auburn Opelika reader joins the AOP
--      list, not RRP's.
--   2. Reader favorites — server-backed bookmarks for articles + directory
--      listings, keyed by email (or anonymous device fingerprint until
--      they convert). Lets us light up "Resume reading" + "Save this
--      pediatrician" without a full account system.
--   3. Reader engagement tracking — per-session counters that the
--      engagement-nudge component reads to decide when to surface the
--      newsletter subscribe prompt ("you've read 3 articles this week —
--      get next week's in your inbox").

-- ── 1. Per-brand GHL routing on brand_voice ──────────────────────────────
ALTER TABLE brand_voice
  -- GHL list id this brand's newsletter subscribers land in. Set per
  -- brand at /admin/settings/brands. NULL = use whichever list the
  -- legacy code path picks (typically RRP's).
  ADD COLUMN IF NOT EXISTS ghl_newsletter_list_id TEXT NULL,
  -- Tag applied to every contact created via this brand's signup. Lets
  -- editorial run brand-scoped campaigns ("rrp-newsletter-subscriber",
  -- "aop-newsletter-subscriber", etc.).
  ADD COLUMN IF NOT EXISTS ghl_subscriber_tag     TEXT NULL,
  -- Optional welcome workflow id triggered on signup. NULL = no workflow.
  ADD COLUMN IF NOT EXISTS ghl_welcome_workflow_id TEXT NULL;

COMMENT ON COLUMN brand_voice.ghl_newsletter_list_id IS
  'GHL list id new newsletter subscribers from this brand''s signup join.';
COMMENT ON COLUMN brand_voice.ghl_subscriber_tag IS
  'GHL tag applied to every contact created via this brand''s newsletter signup.';

-- ── 2. Reader favorites ──────────────────────────────────────────────────
-- Anonymous-first: a reader can favorite without an account. We use a
-- device_token (random hash stored in localStorage) so the same device
-- syncs across page loads. When the reader later subscribes to the
-- newsletter (or signs up for any future account), the email column gets
-- populated and the rows are linked to their identity for cross-device
-- reach.
CREATE TABLE IF NOT EXISTS reader_favorites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug     TEXT NOT NULL DEFAULT 'rrp',
  device_token   TEXT NOT NULL,                          -- random base64url; client-generated
  email          TEXT NULL,                              -- populated on newsletter subscribe
  -- What was favorited. Polymorphic — a listing OR an article. We don't
  -- enforce a FK because directory_listings rows can be archived and the
  -- favorite stays valid; render-time handles "this is gone" gracefully.
  target_kind    TEXT NOT NULL CHECK (target_kind IN ('article', 'directory_listing')),
  target_id      UUID NOT NULL,
  -- Cached display info captured at favorite-time so the favorites page
  -- can render even if the target is later archived. Updated on revisit.
  target_title   TEXT NULL,
  target_slug    TEXT NULL,
  target_url     TEXT NULL,
  favorited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_token, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_reader_favorites_device
  ON reader_favorites (device_token, favorited_at DESC);
CREATE INDEX IF NOT EXISTS idx_reader_favorites_email
  ON reader_favorites (email, favorited_at DESC) WHERE email IS NOT NULL;

-- ── 3. Engagement counters ──────────────────────────────────────────────
-- One row per device_token. Incremented from the public site as the
-- reader engages. Lets the engagement-nudge component decide when to
-- show the newsletter-subscribe prompt without re-counting page views
-- on every render. Rolls weekly so a reader doesn't see the prompt
-- forever just because they had a heavy week six months ago.
CREATE TABLE IF NOT EXISTS reader_engagement (
  device_token        TEXT PRIMARY KEY,
  brand_slug          TEXT NOT NULL DEFAULT 'rrp',
  articles_read_7d    INT NOT NULL DEFAULT 0,
  directory_views_7d  INT NOT NULL DEFAULT 0,
  -- Sliding-window pointer; updated each engagement event so an old
  -- counter naturally ages out.
  window_started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set when the reader dismisses OR converts. We skip the nudge for
  -- 30 days after either to avoid pestering.
  nudge_silenced_until TIMESTAMPTZ NULL,
  -- Convenience: which email if any has been linked to this device.
  email               TEXT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reader_engagement_brand
  ON reader_engagement (brand_slug, updated_at DESC);

-- RPC: bump engagement atomically + roll the 7-day window if it's stale.
-- The public engagement endpoint hits this so we don't have a
-- read-modify-write race when bursty traffic comes in.
CREATE OR REPLACE FUNCTION bump_reader_engagement(
  p_device_token TEXT,
  p_brand_slug   TEXT,
  p_kind         TEXT                  -- 'article' or 'directory'
) RETURNS reader_engagement
LANGUAGE plpgsql AS $$
DECLARE
  v_row reader_engagement;
BEGIN
  INSERT INTO reader_engagement (device_token, brand_slug)
  VALUES (p_device_token, p_brand_slug)
  ON CONFLICT (device_token) DO NOTHING;

  -- Roll the 7-day window if it's stale.
  UPDATE reader_engagement
     SET articles_read_7d   = 0,
         directory_views_7d = 0,
         window_started_at  = NOW()
   WHERE device_token = p_device_token
     AND window_started_at < NOW() - INTERVAL '7 days';

  IF p_kind = 'article' THEN
    UPDATE reader_engagement
       SET articles_read_7d = articles_read_7d + 1,
           updated_at = NOW()
     WHERE device_token = p_device_token
     RETURNING * INTO v_row;
  ELSIF p_kind = 'directory' THEN
    UPDATE reader_engagement
       SET directory_views_7d = directory_views_7d + 1,
           updated_at = NOW()
     WHERE device_token = p_device_token
     RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row FROM reader_engagement WHERE device_token = p_device_token;
  END IF;
  RETURN v_row;
END;
$$;

ALTER TABLE reader_favorites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_engagement ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE reader_favorites IS
  'Anonymous-first bookmarks for articles + directory listings. Linked to email on newsletter subscribe.';
COMMENT ON TABLE reader_engagement IS
  'Per-device engagement counters powering the newsletter signup nudge.';
