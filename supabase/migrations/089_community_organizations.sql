-- Migration 089: Community Organizations directory
--
-- The "Community Connections" admin section needs a home for the
-- organizations we partner with on events — churches, libraries, museums,
-- nonprofits, schools, local businesses. Tracked independently from
-- trusted_event_sources (which is purely an ingestion concept) so an
-- organization can exist without an iCal feed, and an iCal source can be
-- linked to (or live separately from) its organization row.
--
-- An organization can:
--   - submit events (organizer auto-attribution by contact_email)
--   - host an iCal feed (link via source_id)
--   - be displayed on a public "Community Partners" page later
--
-- Multi-tenant: market column matches the rest of the platform.
-- Soft delete via deleted_at (matches calendar_events trash pattern).

CREATE TABLE IF NOT EXISTS community_organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT,                              -- for a future public directory page
  kind            TEXT NOT NULL DEFAULT 'community', -- 'church' | 'library' | 'museum' | 'nonprofit' | 'school' | 'business' | 'government' | 'community'
  description     TEXT,
  logo_url        TEXT,
  website         TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT DEFAULT 'AL',
  social_facebook TEXT,
  social_instagram TEXT,
  tags            TEXT[] DEFAULT '{}',               -- 'preferred' | 'featured' | 'paid-partner' | 'verified' etc.
  notes           TEXT,                              -- internal staff notes
  source_id       UUID REFERENCES trusted_event_sources(id) ON DELETE SET NULL, -- link if they have a feed
  market          TEXT NOT NULL DEFAULT 'rrp',
  status          TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'archived'
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_orgs_market_status
  ON community_organizations (market, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_orgs_kind
  ON community_organizations (kind)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_community_orgs_slug_market
  ON community_organizations (market, slug)
  WHERE slug IS NOT NULL AND deleted_at IS NULL;

-- Keep updated_at fresh on edits
CREATE OR REPLACE FUNCTION touch_community_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_community_orgs_updated_at ON community_organizations;
CREATE TRIGGER trg_community_orgs_updated_at
  BEFORE UPDATE ON community_organizations
  FOR EACH ROW
  EXECUTE FUNCTION touch_community_organizations_updated_at();
