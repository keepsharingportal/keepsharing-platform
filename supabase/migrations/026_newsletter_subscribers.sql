-- Migration 026: Newsletter subscribers
-- Run in Supabase SQL editor after migration 025.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  source TEXT,
  context_data JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  ghl_contact_id TEXT,
  publication_slug TEXT DEFAULT 'rrp',
  is_subscribed BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email  ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source ON newsletter_subscribers(source);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_tags   ON newsletter_subscribers USING GIN(tags);
