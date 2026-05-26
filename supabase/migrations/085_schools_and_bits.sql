-- Migration 085: Schools registry + School Bits content
--
-- Two tables:
--   schools     — per-market roster of K-12 schools (public + private). Both
--                 the admin School News queue and the public submission form
--                 read from this for the school dropdown / filter.
--   school_bits — the actual news items (replaces the prior MOCK_SCHOOL_NEWS).
--
-- Multi-market ready: every row is keyed by `market` (currently 'rrp' for
-- River Region Parents). Sister magazines will get their own rows when added.

-- ── Schools registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market          TEXT NOT NULL DEFAULT 'rrp',
  name            TEXT NOT NULL,
  area            TEXT NOT NULL,                       -- 'montgomery' | 'autauga' | 'elmore' | 'pike-road'
  is_private      BOOLEAN NOT NULL DEFAULT FALSE,
  district        TEXT,                                 -- 'Montgomery County Public Schools' etc — free-text for now
  grade_band      TEXT,                                 -- 'elementary' | 'middle' | 'high' | 'k12' | 'other'
  contact_email   TEXT,                                 -- where monthly "share your news" reminders go
  facebook_url    TEXT,
  city            TEXT,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'archived'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market, name)
);

CREATE INDEX IF NOT EXISTS idx_schools_market_area_active
  ON schools (market, area, status);

CREATE INDEX IF NOT EXISTS idx_schools_name_lower
  ON schools (LOWER(name));

-- Keep updated_at honest
CREATE OR REPLACE FUNCTION touch_schools_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schools_updated_at ON schools;
CREATE TRIGGER trg_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION touch_schools_updated_at();

-- ── School Bits content ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS school_bits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market             TEXT NOT NULL DEFAULT 'rrp',
  school_id          UUID REFERENCES schools(id) ON DELETE SET NULL,
  school_name        TEXT NOT NULL,                    -- snapshot so deleting a school doesn't break old bits
  title              TEXT NOT NULL,
  blurb              TEXT NOT NULL,

  -- Image: original is private (high-res for print), web is public (optimized)
  image_web_url      TEXT,                              -- supabase storage public URL (~800px)
  image_orig_path    TEXT,                              -- private bucket path (full-res, for InDesign export)
  image_width        INT,
  image_height       INT,

  source_type        TEXT NOT NULL DEFAULT 'staff_manual',  -- 'public_form' | 'staff_manual' | 'staff_facebook' | 'staff_email'
  source_url         TEXT,                              -- e.g., the Facebook post URL

  submitted_by_name  TEXT,
  submitted_by_email TEXT,

  status             TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected' | 'published'
  issue_month        CHAR(7),                           -- YYYY-MM — which print issue this is targeted for

  reviewer_notes     TEXT,                              -- internal notes from approver
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        TEXT,                              -- operator email
  published_at       TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_bits_status_recent
  ON school_bits (market, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_bits_school_recent
  ON school_bits (school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_bits_issue
  ON school_bits (market, issue_month, status);
