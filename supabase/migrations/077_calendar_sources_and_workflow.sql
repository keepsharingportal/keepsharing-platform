-- Migration 077: Calendar event sources, workflow, and modern fields
-- Phase 1 of the calendar build-out. Adds:
--   - Source provenance on calendar_events (so we know where each event came from)
--   - Reviewer audit (who approved it, when)
--   - First-class registration_url, organizer_name (out of the description blob)
--   - Recurring event support (parent_event_id, recurrence_rule)
--   - Soft delete (matches the article trash pattern)
--   - Featured flag with auto-expiry (matches trending items)
--   - tags TEXT[] (multi-select, separate from single-select category)
--   - trusted_event_sources table with starter rows
--   - Backfill source_type on the 113 existing CSV-imported events
--   - Best-effort city parse from address on existing rows

-- ── New columns on calendar_events ───────────────────────────────────────────

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS source_type        TEXT,                -- 'csv-import' | 'public-submission' | 'ical' | 'ai-extraction' | 'manual' | 'staff'
  ADD COLUMN IF NOT EXISTS source_url         TEXT,                -- the URL the event came from (event page, iCal feed, etc.)
  ADD COLUMN IF NOT EXISTS source_name        TEXT,                -- e.g. "Montgomery Zoo", "Public submission"
  ADD COLUMN IF NOT EXISTS source_external_id TEXT,                -- iCal UID or remote id for dedup on re-ingest
  ADD COLUMN IF NOT EXISTS discovery_notes    TEXT,                -- free-form notes about how we found it
  ADD COLUMN IF NOT EXISTS reviewed_by        TEXT,                -- operator email or name
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_url   TEXT,                -- first-class — was being crammed into description
  ADD COLUMN IF NOT EXISTS organizer_name     TEXT,                -- e.g. "Montgomery Public Library"
  ADD COLUMN IF NOT EXISTS organizer_email    TEXT,                -- internal contact, not always public
  ADD COLUMN IF NOT EXISTS tags               TEXT[] DEFAULT '{}', -- multi-select: free, toddler-friendly, teen, special-needs, indoor, date-night, parents-night-out
  ADD COLUMN IF NOT EXISTS recurrence_rule    TEXT,                -- RFC 5545 RRULE (e.g. "FREQ=WEEKLY;BYDAY=TU")
  ADD COLUMN IF NOT EXISTS parent_event_id    UUID REFERENCES calendar_events(id) ON DELETE CASCADE,  -- non-null on occurrences
  ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;         -- soft delete (matches article trash)

-- Stable backfill: every event already in the table came from CSV.
UPDATE calendar_events
   SET source_type = 'csv-import'
 WHERE source_type IS NULL;

-- Best-effort city backfill from the address column. Picks the second-to-last
-- comma chunk for "Street, City, State ZIP" or the last for "City, State ZIP".
-- Anything ambiguous is left null for the admin to fix.
UPDATE calendar_events
   SET city = TRIM(SPLIT_PART(address, ',', 2))
 WHERE city IS NULL
   AND address IS NOT NULL
   AND ARRAY_LENGTH(STRING_TO_ARRAY(address, ','), 1) >= 3;

-- Indexes for the common access patterns.
CREATE INDEX IF NOT EXISTS idx_calendar_events_alive
  ON calendar_events (status, start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_trashed
  ON calendar_events (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_featured
  ON calendar_events (is_featured, featured_until)
  WHERE is_featured = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_recurrence
  ON calendar_events (parent_event_id)
  WHERE parent_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_source
  ON calendar_events (source_type, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- ── Trusted event sources ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trusted_event_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  org_url           TEXT,                                  -- the organization's homepage
  events_url        TEXT NOT NULL,                         -- the events page or feed URL
  ingestion_method  TEXT NOT NULL DEFAULT 'manual',        -- 'ical' | 'ai-extract' | 'manual' | 'scrape'
  ical_url          TEXT,                                  -- discovered/configured .ics URL if ingestion_method='ical'
  market            TEXT NOT NULL DEFAULT 'rrp',           -- which publication this serves
  scrape_frequency  TEXT DEFAULT 'weekly',                 -- 'daily' | 'weekly' | 'monthly' | 'manual'
  last_ingested_at  TIMESTAMPTZ,
  last_ingested_count INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_event_sources_active
  ON trusted_event_sources (market, is_active);

-- ── Starter seed — the orgs Jason listed plus the obvious adjacent ones ─────

INSERT INTO trusted_event_sources
  (name, org_url, events_url, ingestion_method, market, scrape_frequency, notes)
VALUES
  ('Montgomery Performing Arts Centre',
   'https://www.mpaconline.org',
   'https://www.mpaconline.org/events',
   'ai-extract', 'rrp', 'weekly',
   'Drives ticketing through Ticketmaster — no public feed. Use AI extraction.'),

  ('WSFA Community Calendar',
   'https://www.wsfa.com',
   'https://www.wsfa.com/community/calendar/',
   'ai-extract', 'rrp', 'weekly',
   'Gray TV CMS widget — no exposed iCal. Aggregator, watch for duplicates.'),

  ('Fun in Montgomery',
   'https://www.funinmontgomery.com',
   'https://www.funinmontgomery.com/events/event-calendar',
   'ai-extract', 'rrp', 'weekly',
   'Aggregator — duplicates likely. Verify with original source before publishing.'),

  ('Facebook — Local Family Events Group',
   'https://www.facebook.com/groups/1454697821499707',
   'https://www.facebook.com/groups/1454697821499707/events',
   'manual', 'rrp', 'manual',
   'Meta API gated. Paste event URLs into the AI-extract tool one at a time.'),

  ('Montgomery Zoo',
   'https://www.montgomeryzoo.com',
   'https://www.montgomeryzoo.com/events',
   'ai-extract', 'rrp', 'weekly',
   'Check for iCal feed in Phase 2.'),

  ('City of Montgomery',
   'https://www.montgomeryal.gov',
   'https://www.montgomeryal.gov/calendar',
   'ai-extract', 'rrp', 'weekly',
   'Municipal calendar — likely runs on a vendor platform with iCal.'),

  ('Autauga–Prattville Public Library',
   'https://www.appl.info',
   'https://www.appl.info/events',
   'ai-extract', 'rrp', 'weekly',
   'Libraries almost always expose iCal. Check during Phase 2 build.'),

  ('Pike Road Events',
   'https://www.pikeroad.us',
   'https://www.pikeroad.us/calendar',
   'ai-extract', 'rrp', 'weekly',
   'Municipal calendar.'),

  ('Alabama Shakespeare Festival',
   'https://www.asf.net',
   'https://www.asf.net/whats-on',
   'ai-extract', 'rrp', 'weekly',
   'Theater season — events are well-structured, possibly Spektrix/Tessitura with iCal.'),

  ('Montgomery Biscuits',
   'https://www.milb.com/montgomery',
   'https://www.milb.com/montgomery/schedule',
   'ai-extract', 'rrp', 'weekly',
   'MiLB schedules are typically machine-readable.'),

  ('Montgomery Parks and Recreation',
   'https://www.montgomeryal.gov/government/departments/parks-and-recreation',
   'https://www.montgomeryal.gov/government/departments/parks-and-recreation/events',
   'ai-extract', 'rrp', 'weekly',
   'Falls under City of Montgomery. May share their calendar feed.')
ON CONFLICT DO NOTHING;

-- ── Touch-updated_at trigger on trusted_event_sources ───────────────────────

CREATE OR REPLACE FUNCTION trusted_event_sources_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trusted_event_sources_updated_at ON trusted_event_sources;
CREATE TRIGGER trg_trusted_event_sources_updated_at
  BEFORE UPDATE ON trusted_event_sources
  FOR EACH ROW EXECUTE FUNCTION trusted_event_sources_touch_updated_at();
