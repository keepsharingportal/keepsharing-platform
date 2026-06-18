-- 208_lead_magnets_unified.sql
--
-- Promote lead magnets out of the Birthday vertical: a single unified
-- `lead_magnets` table powers /admin/lead-magnets so all editor-managed
-- downloadables (Birthday Planner, Special Needs Guide, After-School
-- prep, etc.) live in one place.
--
-- Schema mirrors the v2 birthday_lead_magnets (same columns) + adds a
-- `vertical` discriminator so the admin can filter / group by section.
--
-- Existing rows in birthday_lead_magnets are migrated with
-- vertical = 'birthday' to preserve the seed planner row.

CREATE TABLE IF NOT EXISTS lead_magnets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT NOT NULL DEFAULT 'rrp',
  vertical        TEXT NOT NULL,                       -- 'birthday', 'special-needs', 'after-school', 'general', …
  slug            TEXT NOT NULL,                       -- unique within (brand, vertical)
  source          TEXT,                                -- value of /api/.../subscribe body.source that fires this magnet
  title           TEXT NOT NULL,
  description     TEXT,                                -- internal notes for the editor team
  file_url        TEXT,                                -- public Supabase Storage URL of the PDF
  preview_url     TEXT,                                -- thumbnail, optional
  email_subject   TEXT NOT NULL DEFAULT '',
  email_body      TEXT NOT NULL DEFAULT '',            -- HTML; tokens: {{first_name}}, {{file_url}}, {{party_date}}
  from_name       TEXT,                                -- overrides the default Resend "From: ..." name
  ghl_tags        TEXT[] NOT NULL DEFAULT '{}',        -- tags applied on GHL contact upsert
  ghl_workflow_id TEXT,                                -- optional GHL workflow fired after upsert
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_slug, vertical, slug)
);

-- Source has to be unique per brand so subscribe-time lookup is unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS lead_magnets_brand_source_uq
  ON lead_magnets (brand_slug, source)
  WHERE source IS NOT NULL;

-- Migrate any existing birthday rows (the seeded planner + anything the
-- editor added today). Idempotent — the unique constraint catches reruns.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'birthday_lead_magnets') THEN
    INSERT INTO lead_magnets (
      brand_slug, vertical, slug, source, title, description,
      file_url, preview_url, email_subject, email_body, from_name,
      ghl_tags, ghl_workflow_id, is_active, created_at, updated_at
    )
    SELECT
      brand_slug, 'birthday', slug, source, title, description,
      file_url, preview_url, email_subject, email_body, from_name,
      ghl_tags, ghl_workflow_id, is_active, created_at, updated_at
    FROM birthday_lead_magnets
    ON CONFLICT (brand_slug, vertical, slug) DO NOTHING;

    DROP TABLE birthday_lead_magnets;
  END IF;
END$$;

-- updated_at touch trigger.
CREATE OR REPLACE FUNCTION touch_lead_magnets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_magnets_updated_at ON lead_magnets;
CREATE TRIGGER trg_lead_magnets_updated_at
  BEFORE UPDATE ON lead_magnets
  FOR EACH ROW
  EXECUTE FUNCTION touch_lead_magnets_updated_at();
