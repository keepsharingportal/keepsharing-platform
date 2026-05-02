-- Migration 021: Operations Dashboard tables
-- Run in Supabase SQL editor after migration 020.

CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID,
  title TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'this-week', -- 'urgent' | 'this-week'
  action_type TEXT NOT NULL,
  target_business_name TEXT,
  target_contact_name TEXT,
  target_phone TEXT,
  target_email TEXT,
  email_template_slug TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_items_urgency    ON action_items(urgency, completed);
CREATE INDEX IF NOT EXISTS idx_action_items_publication ON action_items(publication_id);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date   ON action_items(due_date);

CREATE TABLE IF NOT EXISTS print_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_account_id UUID REFERENCES advertiser_accounts(id) ON DELETE SET NULL,
  publication_slug TEXT NOT NULL DEFAULT 'rrp',
  issue_month DATE NOT NULL,
  ad_size TEXT,
  page_size_fraction NUMERIC DEFAULT 1,
  position TEXT,
  monthly_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_placements_month      ON print_placements(issue_month);
CREATE INDEX IF NOT EXISTS idx_print_placements_publication ON print_placements(publication_slug, issue_month);

CREATE TABLE IF NOT EXISTS business_spotlight_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_slug TEXT DEFAULT 'rrp',
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  business_description TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_slug TEXT DEFAULT 'rrp',
  nomination_type TEXT,
  nominee_name TEXT,
  nominee_relationship TEXT,
  nominator_name TEXT,
  nominator_email TEXT,
  why_nominated TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birthday_spotlight_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_slug TEXT DEFAULT 'rrp',
  child_name TEXT NOT NULL,
  child_age INT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  issue_month DATE,
  package_type TEXT,
  amount_paid NUMERIC DEFAULT 45,
  status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed action items ─────────────────────────────────────────────────────────

INSERT INTO action_items (title, urgency, action_type, target_business_name, target_contact_name, target_phone, target_email, email_template_slug, due_date)
VALUES
  (
    'Renew Saint James contract',
    'urgent', 'renew_contract',
    'Saint James School', 'Admissions Office', '(334) 215-4000', 'admissions@saintjames.edu',
    'renew-contract-30day',
    CURRENT_DATE + INTERVAL '5 days'
  ),
  (
    'Check Dropbox for Trinity Christian art',
    'this-week', 'check_dropbox',
    'Trinity Christian Academy', 'Design Contact', '(334) 272-5800', 'office@tcamontgomery.org',
    'check-dropbox-art',
    CURRENT_DATE + INTERVAL '7 days'
  ),
  (
    'Send new partner agreement to Camp Cheaha',
    'urgent', 'send_agreement',
    'Camp Cheaha', 'Director', '(256) 488-5111', 'director@campcheaha.com',
    'send-agreement-new-advertiser',
    CURRENT_DATE + INTERVAL '2 days'
  ),
  (
    'Verify final art for Baptist Health',
    'this-week', 'verify_art',
    'Baptist Health System', 'Marketing Team', '(334) 273-4400', 'marketing@baptistfirst.org',
    'verify-art-pre-print',
    CURRENT_DATE + INTERVAL '6 days'
  );

-- ── Seed print placements (March 2026 RRP) ────────────────────────────────────

DO $$
DECLARE
  v_march DATE := '2026-03-01';
BEGIN
  INSERT INTO print_placements (publication_slug, issue_month, ad_size, page_size_fraction, monthly_revenue)
  VALUES
    ('rrp', v_march, 'Full Page', 1.0, 995),
    ('rrp', v_march, 'Full Page', 1.0, 895),
    ('rrp', v_march, 'Full Page', 1.0, 995),
    ('rrp', v_march, 'Half Page', 0.5, 525),
    ('rrp', v_march, 'Half Page', 0.5, 525),
    ('rrp', v_march, 'Half Page', 0.5, 525),
    ('rrp', v_march, 'Quarter Page', 0.25, 297),
    ('rrp', v_march, 'Quarter Page', 0.25, 297),
    ('rrp', v_march, 'Quarter Page', 0.25, 297),
    ('rrp', v_march, 'Quarter Page', 0.25, 297)
  ON CONFLICT DO NOTHING;
END $$;
