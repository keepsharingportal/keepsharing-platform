-- Migration 020: DFC Team Members + Mom Insiders Engine
-- Run in Supabase SQL editor after migration 019.

-- ── DFC Team Members ──────────────────────────────────────────────────────────

INSERT INTO advertiser_team_members (
  advertiser_id, display_name, title, credentials, bio, philosophy_quote, years_with_practice, display_order
)
VALUES (
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children'),
  'Dr. Julia Isherwood Schreiber',
  'Pediatric Dentist',
  'DMD, Board Certified in Pediatric Dentistry',
  'Dr. Schreiber has been making first dental visits something kids actually look forward to for over a decade. A graduate of a nationally recognized pediatric dental residency program, she built Dentistry for Children around one idea: the first visit shapes every dental experience that follows. She designed the Happy Visit specifically because she believed children deserved better than being thrown into a chair and told to open wide.',
  'My favorite moments are first visits. A nervous kid walks in, meets the Chew-Chew Train, leaves with a goodie bag and a smile — that''s why we built this practice.',
  12,
  1
)
ON CONFLICT DO NOTHING;

INSERT INTO advertiser_team_members (
  advertiser_id, display_name, title, credentials, bio, philosophy_quote, years_with_practice, display_order
)
VALUES (
  (SELECT id FROM advertiser_accounts WHERE slug = 'dentistry-for-children'),
  'Dr. LaKeisha Thomas',
  'Pediatric Dentist',
  'DMD, Pediatric Dental Specialist',
  'Dr. Thomas joined the Dentistry for Children team because she believed River Region families deserved pediatric dental care that felt like a community. Known among patients and parents for her calm presence and ability to connect with even the most anxious children, she has a particular focus on children with special needs and those experiencing their very first dental visit.',
  'Every child I see reminds me why I chose this specialty. There''s a version of dental care where kids aren''t scared — and I''m here to give that to every family I meet.',
  8,
  2
)
ON CONFLICT DO NOTHING;

-- ── Mom Insiders Engine ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reader_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  submitter_first_name TEXT,
  submitter_neighborhood TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,
  publish_permission TEXT DEFAULT 'yes',
  photo_url TEXT,
  source TEXT DEFAULT 'full-survey',
  source_listing_id UUID,
  source_article_slug TEXT,
  submission_responses JSONB DEFAULT '[]',
  ai_score NUMERIC,
  ai_extracted_quote TEXT,
  ai_suggested_listing_attachment UUID,
  ai_suggested_article_attachment TEXT,
  ai_suggested_topic_tags TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  featured_in_issue TEXT,
  featured_attachment_listing_id UUID,
  featured_attachment_article_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reader_submissions_status  ON reader_submissions(review_status);
CREATE INDEX IF NOT EXISTS idx_reader_submissions_score   ON reader_submissions(ai_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reader_submissions_created ON reader_submissions(created_at DESC);

CREATE TABLE IF NOT EXISTS mom_insider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  neighborhood TEXT,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  submission_count INT DEFAULT 0,
  featured_count INT DEFAULT 0,
  last_submission_at TIMESTAMPTZ,
  ghl_contact_id TEXT,
  is_cover_candidate BOOLEAN DEFAULT false,
  is_active_insider BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mom_insider_email  ON mom_insider_profiles(email);
CREATE INDEX IF NOT EXISTS idx_mom_insider_active ON mom_insider_profiles(is_active_insider);
