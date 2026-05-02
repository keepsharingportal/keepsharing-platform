-- Migration 024: Publications table for multi-tenant architecture
-- Run in Supabase SQL editor after migration 023.

CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  ghl_location_id TEXT,
  brand_color_primary TEXT DEFAULT '#c4622d',
  brand_color_accent TEXT DEFAULT '#1a2744',
  is_active BOOLEAN DEFAULT true,
  launch_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO publications (slug, display_name, city, state, brand_color_primary, brand_color_accent, is_active)
VALUES
  ('rrp',  'River Region Parents',        'Montgomery', 'AL', '#c4622d', '#1a2744', true),
  ('boom', 'River Region Boom',            'Montgomery', 'AL', '#1a2744', '#c89933', false),
  ('aop',  'Auburn Opelika Parents',       'Auburn',     'AL', '#4a90d9', '#c4622d', false),
  ('mbp',  'Mobile Bay Parents',           'Mobile',     'AL', '#5a8a6a', '#f4a261', false),
  ('esp',  'Eastern Shore Parents',        'Daphne',     'AL', '#4a90d9', '#e89525', false),
  ('gpp',  'Greater Pensacola Parents',    'Pensacola',  'FL', '#5a8a6a', '#e89525', false)
ON CONFLICT (slug) DO NOTHING;
