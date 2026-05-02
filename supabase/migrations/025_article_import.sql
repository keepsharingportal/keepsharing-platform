-- Migration 025: Article import tracking
-- Run in Supabase SQL editor after migration 024.

ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS source_pdf_filename TEXT,
  ADD COLUMN IF NOT EXISTS source_pdf_page INT,
  ADD COLUMN IF NOT EXISTS source_issue_month DATE,
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'imported',
  ADD COLUMN IF NOT EXISTS editorial_review_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS editorial_notes TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ DEFAULT NOW();

-- editorial_review_status: 'pending' | 'approved' | 'rejected' | 'needs_edit'
-- import_status: 'imported' | 'extraction_failed' | 'duplicate'

CREATE INDEX IF NOT EXISTS idx_guide_articles_review      ON guide_articles(editorial_review_status);
CREATE INDEX IF NOT EXISTS idx_guide_articles_issue_month ON guide_articles(source_issue_month);

CREATE TABLE IF NOT EXISTS import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename TEXT UNIQUE,
  source_type TEXT DEFAULT 'magazine',
  publication_slug TEXT DEFAULT 'rrp',
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  articles_extracted INT DEFAULT 0,
  advertisers_found INT DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_log_filename ON import_log(source_filename);
