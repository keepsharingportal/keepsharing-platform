-- ── Brand SEO profile — the strategic brief Claude reads ───────────────────
--
-- One row per brand_slug. Holds the structured per-brand SEO strategy
-- that flows into:
--   - Weekly Claude audit prompt (smarter gap analysis)
--   - AI SEO assist prompt (persona-aware, seasonally-aware suggestions)
--   - Internal-link engine (pillar-aware cluster linking)
--   - Seasonal alerts on /admin/seo/audit-reports
--
-- All fields nullable; the merge layer in lib/seo/brand-profile.ts falls
-- back to brand-seo.ts BRAND_OVERRIDES defaults when a field is unset.
-- Editors fill in what they know; AI seeds the rest via the Generate
-- First Draft button on /admin/seo/brand-profile.

CREATE TABLE IF NOT EXISTS brand_seo_profiles (
  brand_slug          TEXT PRIMARY KEY,

  -- ── Pillars — the 3-7 topics this brand wants to OWN
  -- [{ id, title, description, target_keyword, supporting_keywords[], status }]
  pillars             JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Sub-areas — per-locality keyword sets
  -- [{ id, name, county?, population?, target_keywords[], notes? }]
  sub_areas           JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Personas — audience sub-segments
  -- [{ id, name, description, age_range?, interests[], pain_points[] }]
  personas            JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Editorial calendar — what's seasonally relevant each month
  -- Keys '1'..'12'; values { themes: [], notes: '' }
  -- Stored as JSONB object (not array) so partial edits are clean.
  editorial_calendar  JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- ── Linkable assets — the authority pieces other sites should link to
  -- [{ id, title, url, description, last_updated_at? }]
  linkable_assets     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- ── Negative space — topics we explicitly don't cover
  -- Free-text array.
  negative_space      TEXT[] NOT NULL DEFAULT '{}',

  -- ── Unique angles — what makes us different from competitors
  unique_angles       TEXT[] NOT NULL DEFAULT '{}',

  -- ── Voice notes — tone guidance for AI generation (free text)
  voice_notes         TEXT,

  -- ── Provenance + audit trail
  generated_by_ai_at  TIMESTAMPTZ,
  last_edited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_by      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE brand_seo_profiles IS
  'Strategic per-brand SEO brief consumed by the AI audit + assist + link engines. Editor-managed via /admin/seo/brand-profile; can be AI-seeded via the Generate First Draft button.';

COMMENT ON COLUMN brand_seo_profiles.pillars IS
  'Topics this brand wants to dominate. Each pillar: { id, title, description, target_keyword, supporting_keywords: string[], status?: ''planning'' | ''active'' | ''mature'' }';
COMMENT ON COLUMN brand_seo_profiles.editorial_calendar IS
  '12-month seasonal map keyed by month number string ("1".."12"). Each entry: { themes: string[], notes?: string }';
