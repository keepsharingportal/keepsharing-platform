-- 206_birthday_lead_magnets.sql
--
-- Editor-managed lead magnets for the Birthday Bash portal. Slug-keyed
-- so we can add more (goody-bag list, theme booklet, etc.) without DDL.
-- First row = 'planner' — wires up the Planning Timeline subscribe so
-- when a mom hands over her email, she gets the printable PDF in her
-- inbox immediately.
--
-- email_body is HTML. Supported template tokens (interpolated at send
-- time by /api/birthday/subscribe):
--   {{first_name}}   child's first name if captured, else "Mom"
--   {{file_url}}     public URL of the uploaded PDF
--   {{party_date}}   formatted long-form date, blank if not captured
--
-- Singleton-per-slug-per-brand; UPSERT on (brand_slug, slug).

CREATE TABLE IF NOT EXISTS birthday_lead_magnets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT NOT NULL DEFAULT 'rrp',
  slug            TEXT NOT NULL,                       -- 'planner', 'goody-bag-list', ...
  title           TEXT NOT NULL,                       -- "Big Birthday Bash Planner"
  description     TEXT,                                -- short copy under title (admin reference)
  file_url        TEXT,                                -- public Supabase Storage URL of the PDF
  preview_url     TEXT,                                -- optional thumbnail for the public surface
  email_subject   TEXT NOT NULL DEFAULT '',            -- subject line of the delivery email
  email_body      TEXT NOT NULL DEFAULT '',            -- HTML body, supports the tokens above
  from_name       TEXT,                                -- override the default Resend "From: ..." name
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_slug, slug)
);

-- Seed the planner row so the admin page has something to edit on day 1.
-- Real values (file_url, email subject/body) get filled in by the editor.
INSERT INTO birthday_lead_magnets (brand_slug, slug, title, description, email_subject, email_body)
SELECT
  'rrp',
  'planner',
  'Big Birthday Bash Planner',
  'Tape-to-the-fridge printable checklist + planning timeline. Delivered when a mom signs up via the Planning Timeline form on the Birthday Bash portal.',
  'Your Big Birthday Bash Planner is here',
  '<p>Hi {{first_name}},</p>
<p>Here''s your printable <strong>Big Birthday Bash Planner</strong> — tape it to the fridge, fill in the details at the top, and tick off each step as you go.</p>
<p><a href="{{file_url}}" style="display:inline-block;background:#ff7a59;color:#fff;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none;">Download the planner (PDF)</a></p>
<p>You''re also on the <em>Birthday Insider</em> list now — we''ll nudge you at 6 weeks, 4 weeks, 2 weeks, and the week of the party so nothing falls through the cracks.</p>
<p>Happy planning,<br/>River Region Parents</p>'
WHERE NOT EXISTS (
  SELECT 1 FROM birthday_lead_magnets WHERE brand_slug = 'rrp' AND slug = 'planner'
);

-- updated_at touch trigger (matches the pattern used by birthday_themes etc.).
CREATE OR REPLACE FUNCTION touch_birthday_lead_magnets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_birthday_lead_magnets_updated_at ON birthday_lead_magnets;
CREATE TRIGGER trg_birthday_lead_magnets_updated_at
  BEFORE UPDATE ON birthday_lead_magnets
  FOR EACH ROW
  EXECUTE FUNCTION touch_birthday_lead_magnets_updated_at();
