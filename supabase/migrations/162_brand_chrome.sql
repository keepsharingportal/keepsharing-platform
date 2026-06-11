-- ── Per-brand site chrome ──────────────────────────────────────────────────
--
-- Each brand needs its own site identity — display name was already in
-- src/lib/markets.ts, but the reader-facing details (tagline, logo URL,
-- color palette, social handles, contact email, which columns rotate on
-- the homepage) lived nowhere editable. This migration extends brand_voice
-- with those fields so editorial can manage each brand's look without
-- a code change.
--
-- Why brand_voice and not a new brand_chrome table: there's a 1:1 between
-- a brand and its chrome, the brand_voice row already exists per brand,
-- and the AI integration + chrome fields share a natural "everything about
-- this brand the platform reads" surface. Splitting tables would mean two
-- joins everywhere a brand renders.
--
-- All fields nullable / default-empty so existing rows don't need a
-- backfill. The src/lib/brands.ts module surfaces a sensible default for
-- each field when missing (e.g., display name from markets.ts).

ALTER TABLE brand_voice
  -- One-line tagline displayed under the brand name in navigation and
  -- email signatures ("River Region Parents — local family stories,
  -- straight to your inbox").
  ADD COLUMN IF NOT EXISTS tagline                  TEXT NULL,
  -- Brand logo, served from your image host. Used in nav + footer + emails.
  -- Falls back to a text wordmark when null.
  ADD COLUMN IF NOT EXISTS logo_url                 TEXT NULL,
  -- Primary color (hex) — used for buttons, links, accents in brand-aware
  -- UI. Defaults to the RRP coral when not set.
  ADD COLUMN IF NOT EXISTS primary_color_hex        TEXT NULL,
  -- Secondary / accent color (hex) — used for secondary CTAs + chips.
  ADD COLUMN IF NOT EXISTS accent_color_hex         TEXT NULL,
  -- Reader-facing contact details.
  ADD COLUMN IF NOT EXISTS contact_email            TEXT NULL,
  ADD COLUMN IF NOT EXISTS social_facebook          TEXT NULL,
  ADD COLUMN IF NOT EXISTS social_instagram         TEXT NULL,
  -- Which columns appear in the homepage rotation block (the recurring
  -- "Community Spotlights" sidebar plus the rotation hero). When NULL
  -- the homepage falls back to the RRP default rotation. Each brand can
  -- pick its own signature columns once editorial commissions them.
  ADD COLUMN IF NOT EXISTS homepage_rotation_columns TEXT[] NULL;

COMMENT ON COLUMN brand_voice.tagline IS
  'One-line tagline displayed in navigation + email signatures.';
COMMENT ON COLUMN brand_voice.primary_color_hex IS
  'Hex (e.g. "#c4622d") used as the brand primary in UI tokens. Falls back to RRP coral when null.';
COMMENT ON COLUMN brand_voice.homepage_rotation_columns IS
  'Array of column_slug values to feature in the homepage rotation block. Falls back to RRP defaults when null.';
