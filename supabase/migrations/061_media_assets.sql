-- ─────────────────────────────────────────────────────────────────────────────
-- 061: Media Assets & Creative Operations
--
-- Central registry for all media assets across the ecosystem:
-- school photos, student spotlight images, sponsor logos, Canva graphics,
-- guide images, print assets, event images, social graphics, and more.
--
-- Tracks asset identity, status, readiness, Canva coordination,
-- and usage locations. Does NOT store files — storage_url points to wherever
-- the file lives (Supabase Storage, Google Drive, Dropbox, etc.).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_assets (

  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Identity ──────────────────────────────────────────────────────────────
  filename             TEXT        NOT NULL,
  title                TEXT,
  description          TEXT,
  alt_text             TEXT,
  source_attribution   TEXT,         -- "Photo by Jane Smith" or "Provided by sponsor"

  -- ── Storage ───────────────────────────────────────────────────────────────
  storage_url          TEXT        NOT NULL,   -- primary file URL
  thumbnail_url        TEXT,                   -- smaller preview URL (optional)

  -- ── Classification ────────────────────────────────────────────────────────
  asset_type           TEXT        NOT NULL DEFAULT 'photo',
  content_category     TEXT,
  publication          TEXT,                   -- 'rrp' | 'mbp' | 'aop' | 'esp' | 'gpp' | 'boom' | 'all'
  upload_source        TEXT        NOT NULL DEFAULT 'operator-upload',
  tags                 TEXT[],

  -- ── Dimensions / file size ────────────────────────────────────────────────
  width_px             INTEGER,
  height_px            INTEGER,
  file_size_bytes      BIGINT,

  -- ── Status ────────────────────────────────────────────────────────────────
  status               TEXT        NOT NULL DEFAULT 'uploaded',

  -- ── Usage tracking (boolean flags for fast filtering) ────────────────────
  used_on_homepage         BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_article          BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_guide            BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_newsletter       BOOLEAN NOT NULL DEFAULT FALSE,
  used_on_social           BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_print            BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_family_favorites BOOLEAN NOT NULL DEFAULT FALSE,
  used_in_sponsor_section  BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Linked content ────────────────────────────────────────────────────────
  linked_submission_id UUID,   -- FK-equivalent to community_submissions.id
  linked_advertiser_id UUID,   -- FK-equivalent to advertiser_accounts.id
  linked_guide_slug    TEXT,

  -- ── Canva / Creative coordination ─────────────────────────────────────────
  needs_canva_graphic  BOOLEAN     NOT NULL DEFAULT FALSE,
  canva_link           TEXT,
  assigned_designer    TEXT,
  graphic_requested_at TIMESTAMPTZ,
  graphic_completed_at TIMESTAMPTZ,

  -- Graphic type needs (independent flags — more than one may apply)
  needs_quote_graphic  BOOLEAN NOT NULL DEFAULT FALSE,
  needs_social_square  BOOLEAN NOT NULL DEFAULT FALSE,
  needs_print_crop     BOOLEAN NOT NULL DEFAULT FALSE,
  needs_homepage_hero  BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Readiness ─────────────────────────────────────────────────────────────
  has_web_crop         BOOLEAN NOT NULL DEFAULT FALSE,
  has_social_crop      BOOLEAN NOT NULL DEFAULT FALSE,
  has_print_crop       BOOLEAN NOT NULL DEFAULT FALSE,
  permission_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Timestamps ────────────────────────────────────────────────────────────
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

-- ── Constraints ───────────────────────────────────────────────────────────────

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_status_check
  CHECK (status IN (
    'uploaded',       -- just arrived, not yet reviewed
    'needs_review',   -- operator queued for review
    'approved',       -- cleared for use
    'needs_graphic',  -- raw photo exists but graphic work needed
    'social_ready',   -- ready for social media use
    'print_ready',    -- resolution/crop cleared for print
    'archived'        -- no longer in active rotation
  ));

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_type_check
  CHECK (asset_type IN (
    'photo',          -- photograph (school, event, person)
    'graphic',        -- designed graphic or banner
    'logo',           -- sponsor or publication logo
    'illustration',   -- editorial illustration
    'document'        -- PDF or other document (print-ready files)
  ));

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_source_check
  CHECK (upload_source IN (
    'submission',        -- came in via community submission form
    'operator-upload',   -- manually uploaded by team member
    'sponsor-provided',  -- sent by advertiser or sponsor
    'canva',             -- exported from Canva
    'stock'              -- stock photo (ensure license notes in description)
  ));

ALTER TABLE media_assets
  ADD CONSTRAINT media_assets_category_check
  CHECK (content_category IS NULL OR content_category IN (
    'editorial',         -- general editorial / article content
    'sponsor',           -- sponsor logos and brand assets
    'social',            -- purpose-built social graphics
    'guide',             -- guide feature images
    'print',             -- print-specific assets
    'family-favorites',  -- Family Favorites program graphics
    'event',             -- event photos and graphics
    'school'             -- school news and spotlights
  ));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS media_assets_status_idx
  ON media_assets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS media_assets_category_idx
  ON media_assets (content_category, created_at DESC)
  WHERE content_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_type_idx
  ON media_assets (asset_type);

CREATE INDEX IF NOT EXISTS media_assets_linked_submission_idx
  ON media_assets (linked_submission_id)
  WHERE linked_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_linked_advertiser_idx
  ON media_assets (linked_advertiser_id)
  WHERE linked_advertiser_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_design_queue_idx
  ON media_assets (needs_canva_graphic, needs_social_square, needs_print_crop, needs_homepage_hero, needs_quote_graphic)
  WHERE needs_canva_graphic = TRUE
     OR needs_social_square = TRUE
     OR needs_print_crop    = TRUE
     OR needs_homepage_hero = TRUE
     OR needs_quote_graphic = TRUE;

CREATE INDEX IF NOT EXISTS media_assets_social_ready_idx
  ON media_assets (status, has_social_crop)
  WHERE status IN ('approved', 'social_ready');

CREATE INDEX IF NOT EXISTS media_assets_created_idx
  ON media_assets (created_at DESC);

-- ── updated_at trigger (reuses existing function if present) ─────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER media_assets_updated_at
      BEFORE UPDATE ON media_assets
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE media_assets IS
  'Central registry for all media assets in the ecosystem. '
  'Does not store files — storage_url is a pointer to the actual file. '
  'Tracks status, readiness, Canva coordination, and usage locations.';

COMMENT ON COLUMN media_assets.storage_url IS
  'Primary URL of the file. May be Supabase Storage, Google Drive share link, '
  'Dropbox link, or any accessible URL. Required.';

COMMENT ON COLUMN media_assets.linked_submission_id IS
  'Optional soft-link to community_submissions.id. '
  'No hard FK so orphan assets remain visible if submission is deleted.';

COMMENT ON COLUMN media_assets.needs_canva_graphic IS
  'TRUE when the asset record represents a creative need, not a completed file. '
  'storage_url may be a placeholder or placeholder thumbnail until Canva work is done.';

COMMENT ON COLUMN media_assets.permission_confirmed IS
  'TRUE when operator has confirmed photo permission from the subject or submitter. '
  'Required before publishing school photos or personal images.';
