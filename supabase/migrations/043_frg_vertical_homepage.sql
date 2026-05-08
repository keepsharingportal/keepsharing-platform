-- Migration 043: FRG Vertical Homepage Tables and Seed Data
-- Idempotent — IF NOT EXISTS on every CREATE, WHERE NOT EXISTS on every INSERT.

-- ── guide_meta: Per-guide hero copy ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_meta (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug       TEXT UNIQUE NOT NULL,
  guide_name       TEXT NOT NULL,
  hero_image_url   TEXT,
  hero_eyebrow     TEXT,
  hero_title       TEXT,
  hero_subtitle    TEXT,
  hero_issue_label TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── guide_start_cards: Start Here cards per guide ─────────────────────────────
CREATE TABLE IF NOT EXISTS guide_start_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug    TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  eyebrow       TEXT NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  cta_label     TEXT DEFAULT 'Read',
  cta_href      TEXT NOT NULL,
  accent_color  TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_start_cards_active
  ON guide_start_cards (guide_slug, display_order)
  WHERE is_active = true;

-- ── guide_playbook_sections: Playbook header per guide ────────────────────────
CREATE TABLE IF NOT EXISTS guide_playbook_sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_slug       TEXT NOT NULL,
  section_title    TEXT NOT NULL,
  section_subtitle TEXT,
  display_order    INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (guide_slug, display_order)
);

-- ── guide_playbook_items: Column rows inside a playbook ───────────────────────
CREATE TABLE IF NOT EXISTS guide_playbook_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_section_id UUID NOT NULL REFERENCES guide_playbook_sections(id) ON DELETE CASCADE,
  column_label        TEXT NOT NULL,
  display_order       INT NOT NULL DEFAULT 0,
  items               JSONB NOT NULL,
  UNIQUE (playbook_section_id, display_order)
);

-- ── Add source column to newsletter_subscribers if missing ────────────────────
-- (Migration 026 already creates this column; this is a safety idempotent guard.)
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS source TEXT;

-- ── Seed FRG guide_meta ───────────────────────────────────────────────────────
INSERT INTO guide_meta (guide_slug, guide_name, hero_image_url, hero_eyebrow, hero_title, hero_subtitle, hero_issue_label)
SELECT
  'family-resource-guide',
  'Family Resource Guide',
  'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=1600&q=80',
  'RIVER REGION PARENTS · FAMILY RESOURCE GUIDE',
  'Your Guide to Raising a Family Here',
  'Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, and Eastchase — everything your family needs, in one place.',
  'Newcomer Issue · June 2026'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_meta WHERE guide_slug = 'family-resource-guide'
);

-- ── Seed Start Here cards ─────────────────────────────────────────────────────
INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_href, accent_color)
SELECT 'family-resource-guide', 1, 'Newcomer', 'Your First 30 Days in the River Region',
  'The practical checklist every family needs when settling into a new home.',
  '#first-30-days', '#fef3c7'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'family-resource-guide' AND display_order = 1
);

INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_href, accent_color)
SELECT 'family-resource-guide', 2, 'Schools', 'Choosing a School in the River Region',
  'Public, private, charter, and homeschool — how to think about your options.',
  '/columns/schools', '#e0f2fe'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'family-resource-guide' AND display_order = 2
);

INSERT INTO guide_start_cards (guide_slug, display_order, eyebrow, title, summary, cta_href, accent_color)
SELECT 'family-resource-guide', 3, 'Community', 'Where to Find Your People',
  'The easiest ways to find your community in the River Region.',
  '/columns/community', '#fce7f3'
WHERE NOT EXISTS (
  SELECT 1 FROM guide_start_cards WHERE guide_slug = 'family-resource-guide' AND display_order = 3
);

-- ── Seed Playbook section ─────────────────────────────────────────────────────
INSERT INTO guide_playbook_sections (guide_slug, section_title, section_subtitle, display_order)
SELECT
  'family-resource-guide',
  'Your First 30 Days in the River Region',
  'A practical checklist for every family new to the area.',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM guide_playbook_sections WHERE guide_slug = 'family-resource-guide' AND display_order = 0
);

-- ── Seed Playbook items (DO block for safe FK reference) ─────────────────────
DO $$
DECLARE
  sec_id UUID;
BEGIN
  SELECT id INTO sec_id
  FROM guide_playbook_sections
  WHERE guide_slug = 'family-resource-guide' AND display_order = 0;

  IF sec_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Week 1', 0,
    '["Register your child with school and confirm enrollment","Establish pediatrician and dental practice — request records transfer","Update driver''s license and vehicle registration (Alabama: 30-day rule)","Find your nearest grocery, pharmacy, and urgent care"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 0
  );

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Month 1', 1,
    '["Visit local libraries — every county has them, kids'' programs are free","Attend one community event — park, festival, library story time","Sign up for a sport, league, or activity","Find a restaurant where you''d take grandparents"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 1
  );

  INSERT INTO guide_playbook_items (playbook_section_id, column_label, display_order, items)
  SELECT sec_id, 'Months 2–3', 2,
    '["Connect with a parent group or church small group","Try at least 3 family activities you''ve never done","Visit 2–3 neighborhoods you might want to live in long-term","Subscribe to River Region Parents"]'::jsonb
  WHERE NOT EXISTS (
    SELECT 1 FROM guide_playbook_items WHERE playbook_section_id = sec_id AND display_order = 2
  );
END $$;

-- ── Verification queries (run after migration succeeds) ───────────────────────
-- SELECT count(*) FROM guide_start_cards WHERE guide_slug = 'family-resource-guide';
-- expect 3
-- SELECT count(*) FROM guide_playbook_sections WHERE guide_slug = 'family-resource-guide';
-- expect 1
-- SELECT count(*) FROM guide_playbook_items WHERE playbook_section_id IN (SELECT id FROM guide_playbook_sections WHERE guide_slug = 'family-resource-guide');
-- expect 3
-- SELECT hero_image_url, hero_title FROM guide_meta WHERE guide_slug = 'family-resource-guide';
-- expect populated row
