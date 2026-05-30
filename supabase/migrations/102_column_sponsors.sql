-- Migration 102: Section sponsors — one advertiser "owns" a column for a
-- date range.
--
-- A different concept than ad_placements: sponsorship is a franchise deal
-- ("Walmart is the Title Sponsor of Teacher of the Month for Q2"), not an
-- ad slot. The sponsor's branding appears on every article in the column
-- during their active window — under the hero on mobile, in the sidebar on
-- desktop, in the mid-article inline ad slot, and at the footer outro.
--
-- Renders only when an active sponsor exists (start_date <= now <= end_date,
-- AND is_active = true). Otherwise the sponsor blocks render nothing — no
-- empty boxes, no placeholder text.

CREATE TABLE IF NOT EXISTS column_sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_slug     TEXT NOT NULL,                  -- 'play-ball' | 'teacher-of-the-month' | etc.
  advertiser_id   UUID,                            -- nullable so we can stage a sponsor without an advertiser record
  sponsor_label   TEXT DEFAULT 'Presented by',    -- "Presented by", "Proudly sponsored by", etc.
  sponsor_name    TEXT NOT NULL,                  -- snapshot of the brand name shown to readers
  sponsor_message TEXT,                            -- optional one-liner ("Bringing local stories to River Region families")
  logo_url        TEXT,                            -- optional override; falls back to advertiser logo
  cta_label       TEXT DEFAULT 'Learn more',
  cta_url         TEXT,                            -- where the sponsor strip links
  -- Color overrides — when null we use the column's brand color so sponsor
  -- placements feel native to the franchise.
  accent_color    TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT column_sponsors_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_column_sponsors_active
  ON column_sponsors (column_slug, start_date, end_date)
  WHERE is_active = TRUE;

-- Optional FK to advertiser_accounts if that table exists. Defensive because
-- some envs may not have it. Drop-then-add so re-runs are clean.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advertiser_accounts') THEN
    ALTER TABLE column_sponsors
      DROP CONSTRAINT IF EXISTS column_sponsors_advertiser_fk;
    ALTER TABLE column_sponsors
      ADD CONSTRAINT column_sponsors_advertiser_fk
      FOREIGN KEY (advertiser_id) REFERENCES advertiser_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at trigger so we can sort by recent edits in admin without
-- shipping a hand-maintained timestamp.
CREATE OR REPLACE FUNCTION set_column_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_column_sponsors_updated_at ON column_sponsors;
CREATE TRIGGER trg_column_sponsors_updated_at
  BEFORE UPDATE ON column_sponsors
  FOR EACH ROW EXECUTE FUNCTION set_column_sponsors_updated_at();
