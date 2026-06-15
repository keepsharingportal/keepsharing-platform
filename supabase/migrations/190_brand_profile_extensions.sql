-- ── Migration 190 — Brand profile extensions ────────────────────────────
--
-- Three new fields on brand_seo_profiles that capture what was
-- previously living in the editor's head:
--
--   1. editorial_prefs — format / voice / cadence preferences. Shapes
--      every recommendation. Was an implicit assumption; now explicit.
--
--   2. competitor_intel — competitor map + the gaps the brand intends
--      to own. Drives unique_angles much better than Claude guessing
--      from public information.
--
--   3. last_generation_meta — provenance for the merge-regen flow.
--      Tracks which family template + market intel version produced
--      the current generated values so we can detect and re-seed only
--      what's stale.

ALTER TABLE brand_seo_profiles
  ADD COLUMN IF NOT EXISTS editorial_prefs       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS competitor_intel      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_generation_meta  JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN brand_seo_profiles.editorial_prefs IS
  'Format/voice/cadence preferences. Shape: { format_preference?: "long-form"|"list"|"mixed", voice_preference?: "peer"|"expert"|"institutional", publishing_cadence?: string, evergreen_vs_timely?: string }';

COMMENT ON COLUMN brand_seo_profiles.competitor_intel IS
  'Competitor map + gaps. Shape: { competitors: [{ name, url?, strengths?, weaknesses? }], gaps_we_own: string[] }';

COMMENT ON COLUMN brand_seo_profiles.last_generation_meta IS
  'Provenance for merge-regen. Shape: { family_template_version, market_intel_version, generated_at, model }';
