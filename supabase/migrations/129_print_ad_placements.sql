-- ── Print ad placements ────────────────────────────────────────────────────
--
-- One row per print ad booking. Each business can have many — one per
-- issue month they're committed to. Workflow: editor preps each month
-- by either cloning last month's view forward or adding new rows; when
-- the layout team needs it, they download (CSV) or print (browser).
--
-- This is the structured replacement for the legacy 'advertisers' table
-- which tracked similar data but lived on a parallel schema that never
-- connected to advertiser_accounts (the business umbrella the rest of
-- the platform uses). The legacy table stays in place untouched; future
-- migration can backfill from there if needed.

CREATE TABLE IF NOT EXISTS print_ad_placements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,

  -- ── Issue placement ──────────────────────────────────────────────────────
  -- YYYY-MM string for the issue this ad runs in. Stored as TEXT (not DATE)
  -- because monthly issues have no specific day-of-month — editors think in
  -- 'June 2026', not '2026-06-01'. Cheaper to sort, easier to display.
  issue_month TEXT NOT NULL CHECK (issue_month ~ '^[0-9]{4}-[0-9]{2}$'),

  -- ── Print specs ──────────────────────────────────────────────────────────
  -- Design: did the layout team build something new this month, or are
  -- they reusing ('picking up') art from a previous issue.
  design TEXT NOT NULL DEFAULT 'new' CHECK (design IN ('new', 'pickup')),

  -- Directory ad supplement — yes/no per issue. Pulls into the directory
  -- pages, doesn't take a layout slot.
  directory BOOLEAN NOT NULL DEFAULT FALSE,

  -- Size as a fractional page (1 = full, 0.5 = half, etc.). Stored as
  -- NUMERIC so we can sum revenue by total pages sold per issue.
  -- Allowed values from the print rate card: 1, 0.66, 0.5, 0.33, 0.25,
  -- 0.16, 0.12. Constraint enforces those exact stops — the rate card
  -- doesn't price arbitrary sizes.
  size NUMERIC(4,3) NOT NULL CHECK (size IN (1, 0.66, 0.5, 0.33, 0.25, 0.16, 0.12)),

  -- Orientation chosen by the advertiser. Horizontal / vertical / square
  -- — drives layout grid placement.
  layout TEXT CHECK (layout IN ('horizontal', 'vertical', 'square')),

  -- ── Money ────────────────────────────────────────────────────────────────
  -- Price for THIS issue (not the cumulative contract).
  price NUMERIC(10,2),

  -- Social budget for the month — separate cost center; the print ad
  -- includes a paid-social boost on the brand's behalf. Preset tiers
  -- (150/100/75/50/30/25) live in the UI; the DB just stores a number
  -- so custom amounts are fine.
  social_budget NUMERIC(10,2),

  -- ── Layout notes ─────────────────────────────────────────────────────────
  -- Freeform notes the editor wants visible on the layout sheet —
  -- 'Co-op with State Farm', 'Use logo v3', 'Move from page 4 to page 7'.
  layout_notes TEXT,

  -- ── Commitment ───────────────────────────────────────────────────────────
  -- Months this advertiser has paid in for. Array of YYYY-MM strings
  -- (e.g. ['2026-06','2026-07','2026-09']). Drives the 'should this
  -- row come back next month?' logic when the editor clones forward.
  specific_months TEXT[] NOT NULL DEFAULT '{}',

  -- Last issue this contract covers. After this month, the row stops
  -- auto-carrying forward to the next clone. Format YYYY-MM.
  expires_month TEXT CHECK (expires_month IS NULL OR expires_month ~ '^[0-9]{4}-[0-9]{2}$'),

  -- General notes / internal commentary.
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup by issue (the primary view query) and by advertiser (the
-- profile-page panel query).
CREATE INDEX IF NOT EXISTS idx_print_ad_placements_issue
  ON print_ad_placements (issue_month, advertiser_account_id);
CREATE INDEX IF NOT EXISTS idx_print_ad_placements_advertiser
  ON print_ad_placements (advertiser_account_id, issue_month DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE print_ad_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS print_ad_placements_service ON print_ad_placements;
CREATE POLICY print_ad_placements_service
  ON print_ad_placements FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS print_ad_placements_admin ON print_ad_placements;
CREATE POLICY print_ad_placements_admin
  ON print_ad_placements FOR ALL
  USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── updated_at touch trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION print_ad_placements_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS print_ad_placements_touch_updated_at_trg ON print_ad_placements;
CREATE TRIGGER print_ad_placements_touch_updated_at_trg
BEFORE UPDATE ON print_ad_placements
FOR EACH ROW EXECUTE FUNCTION print_ad_placements_touch_updated_at();
