-- Migration 017: The KeepSharing Partner Engine — Offer Schema
-- Run in Supabase SQL editor
-- Apply AFTER migration 016.

-- ── Defensive: ensure advertiser_accounts + DFC row exist (016 may not have run) ──

INSERT INTO advertiser_accounts (business_name, slug, package_tier, contact_name, contact_email, contact_phone, landing_page_published)
VALUES ('Dentistry for Children PC', 'dentistry-for-children', 'tier-4-won', 'Dr. Julia Isherwood Schreiber', 'info@chew-chewtrain.com', '334-277-6830', true)
ON CONFLICT (slug) DO UPDATE SET landing_page_published = true;

-- ── Add columns to advertiser_accounts ────────────────────────────────────────

ALTER TABLE advertiser_accounts
  ADD COLUMN IF NOT EXISTS category              TEXT NOT NULL DEFAULT 'family-service',
  ADD COLUMN IF NOT EXISTS subcategory           TEXT,
  ADD COLUMN IF NOT EXISTS business_url          TEXT,
  ADD COLUMN IF NOT EXISTS gbp_place_id          TEXT,
  ADD COLUMN IF NOT EXISTS brand_color_primary   TEXT DEFAULT '#1a2744',
  ADD COLUMN IF NOT EXISTS brand_color_accent    TEXT DEFAULT '#c4622d',
  ADD COLUMN IF NOT EXISTS logo_url              TEXT,
  ADD COLUMN IF NOT EXISTS mascot_url            TEXT,
  ADD COLUMN IF NOT EXISTS mascot_alt            TEXT,
  ADD COLUMN IF NOT EXISTS current_offer_id      UUID,
  ADD COLUMN IF NOT EXISTS onboarding_token      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_status     TEXT DEFAULT 'not-started',
  ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_progress   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS published_at          TIMESTAMPTZ;

-- ── partner_offers ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_offers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id           UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  offer_name              TEXT,
  offer_type              TEXT NOT NULL DEFAULT 'schedule_consult',
  offer_headline          TEXT,
  offer_subheadline       TEXT,
  offer_value_statement   TEXT,
  urgency_text            TEXT,
  urgency_expires_at      TIMESTAMPTZ,
  urgency_count_remaining INT,
  cta_button_text         TEXT DEFAULT 'Get Started →',
  discount_code           TEXT,
  booking_url             TEXT,
  proof_points            JSONB DEFAULT '[]',
  objection_responses     JSONB DEFAULT '[]',
  target_keywords         TEXT[] DEFAULT '{}',
  is_active               BOOLEAN DEFAULT true,
  start_date              DATE,
  end_date                DATE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advertiser_accounts ADD CONSTRAINT fk_current_offer
  FOREIGN KEY (current_offer_id) REFERENCES partner_offers(id);

CREATE INDEX idx_partner_offers_advertiser ON partner_offers(advertiser_id);
CREATE INDEX idx_partner_offers_active ON partner_offers(is_active, advertiser_id);

ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_active_offers" ON partner_offers FOR SELECT USING (is_active = true);
CREATE POLICY "service_all_offers" ON partner_offers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_offers" ON partner_offers FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_locations ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  location_name    TEXT,
  address_line_1   TEXT,
  address_line_2   TEXT,
  city             TEXT,
  state            TEXT DEFAULT 'AL',
  zip              TEXT,
  phone            TEXT,
  latitude         NUMERIC,
  longitude        NUMERIC,
  hours_json       JSONB,
  is_primary       BOOLEAN DEFAULT false,
  accepting_new    BOOLEAN DEFAULT true,
  display_order    INT DEFAULT 0
);

CREATE INDEX idx_advertiser_locations_advertiser ON advertiser_locations(advertiser_id, display_order);
ALTER TABLE advertiser_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_locations" ON advertiser_locations FOR SELECT USING (true);
CREATE POLICY "service_all_locations" ON advertiser_locations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_locations" ON advertiser_locations FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_team_members ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_team_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id         UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  display_name          TEXT,
  title                 TEXT,
  credentials           TEXT,
  bio                   TEXT,
  philosophy_quote      TEXT,
  photo_url             TEXT,
  years_with_practice   INT,
  display_order         INT DEFAULT 0
);

CREATE INDEX idx_team_members_advertiser ON advertiser_team_members(advertiser_id, display_order);
ALTER TABLE advertiser_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_team" ON advertiser_team_members FOR SELECT USING (true);
CREATE POLICY "service_all_team" ON advertiser_team_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_team" ON advertiser_team_members FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_testimonials ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_testimonials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  quote            TEXT,
  author_name      TEXT,
  author_context   TEXT,
  source           TEXT DEFAULT 'manual',
  source_url       TEXT,
  rating           INT,
  display_order    INT DEFAULT 0
);

CREATE INDEX idx_testimonials_advertiser ON advertiser_testimonials(advertiser_id, display_order);
ALTER TABLE advertiser_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_testimonials" ON advertiser_testimonials FOR SELECT USING (true);
CREATE POLICY "service_all_testimonials" ON advertiser_testimonials FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_testimonials" ON advertiser_testimonials FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_trust_signals ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_trust_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  signal_type      TEXT,
  label            TEXT,
  description      TEXT,
  logo_url         TEXT,
  display_order    INT DEFAULT 0
);

ALTER TABLE advertiser_trust_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_trust" ON advertiser_trust_signals FOR SELECT USING (true);
CREATE POLICY "service_all_trust" ON advertiser_trust_signals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_trust" ON advertiser_trust_signals FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_photos ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_photos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id            UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  photo_url                TEXT NOT NULL,
  caption                  TEXT,
  alt_text                 TEXT,
  category                 TEXT DEFAULT 'space',
  source                   TEXT DEFAULT 'placeholder',
  source_metadata          JSONB,
  display_order            INT DEFAULT 0,
  is_primary_for_category  BOOLEAN DEFAULT false
);

CREATE INDEX idx_advertiser_photos_cat ON advertiser_photos(advertiser_id, category, display_order);
ALTER TABLE advertiser_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_photos17" ON advertiser_photos FOR SELECT USING (true);
CREATE POLICY "service_all_photos17" ON advertiser_photos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_photos17" ON advertiser_photos FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_services ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  service_name  TEXT,
  description   TEXT,
  icon          TEXT,
  display_order INT DEFAULT 0
);

ALTER TABLE advertiser_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_services" ON advertiser_services FOR SELECT USING (true);
CREATE POLICY "service_all_services" ON advertiser_services FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_services" ON advertiser_services FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── advertiser_faqs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advertiser_faqs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id    UUID NOT NULL REFERENCES advertiser_accounts(id) ON DELETE CASCADE,
  question         TEXT,
  answer           TEXT,
  display_order    INT DEFAULT 0,
  relates_to_offer BOOLEAN DEFAULT false
);

ALTER TABLE advertiser_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_faqs" ON advertiser_faqs FOR SELECT USING (true);
CREATE POLICY "service_all_faqs" ON advertiser_faqs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_faqs" ON advertiser_faqs FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── partner_leads ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_leads (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id                   UUID NOT NULL REFERENCES advertiser_accounts(id),
  offer_id                        UUID REFERENCES partner_offers(id),
  lead_first_name                 TEXT,
  lead_last_name                  TEXT,
  lead_email                      TEXT,
  lead_phone                      TEXT,
  lead_metadata                   JSONB DEFAULT '{}',
  submitted_at                    TIMESTAMPTZ DEFAULT NOW(),
  source_page                     TEXT,
  referrer_url                    TEXT,
  utm_source                      TEXT,
  utm_medium                      TEXT,
  utm_campaign                    TEXT,
  lead_to_sms_status              TEXT DEFAULT 'pending',
  lead_to_sms_sent_at             TIMESTAMPTZ,
  partner_notification_status     TEXT DEFAULT 'pending',
  partner_notification_sent_at    TIMESTAMPTZ,
  nurture_sequence_status         TEXT DEFAULT 'pending',
  nurture_enrolled_at             TIMESTAMPTZ,
  partner_marked_converted        BOOLEAN DEFAULT false,
  partner_marked_converted_at     TIMESTAMPTZ,
  partner_notes                   TEXT,
  ghl_contact_id                  TEXT
);

CREATE INDEX idx_partner_leads_advertiser ON partner_leads(advertiser_id, submitted_at DESC);
CREATE INDEX idx_partner_leads_offer ON partner_leads(offer_id);

ALTER TABLE partner_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_partner_leads" ON partner_leads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "admin_all_partner_leads" ON partner_leads FOR ALL USING (auth.jwt() ->> 'email' = 'jade31994@gmail.com');

-- ── SEED: Dentistry for Children ─────────────────────────────────────────────

DO $$
DECLARE
  v_adv_id  UUID;
  v_offer_id UUID;
BEGIN
  SELECT id INTO v_adv_id FROM advertiser_accounts WHERE slug = 'dentistry-for-children';
  IF v_adv_id IS NULL THEN RAISE EXCEPTION 'DFC account not found'; END IF;

  -- Update account brand + category
  UPDATE advertiser_accounts SET
    category            = 'healthcare',
    subcategory         = 'pediatric-dentistry',
    business_url        = 'https://chew-chewtrain.com',
    brand_color_primary = '#1a3d7c',
    brand_color_accent  = '#f4a261',
    mascot_alt          = 'Chew-Chew Train — Dentistry for Children mascot'
  WHERE id = v_adv_id;

  -- Insert offer (skip if exists)
  IF NOT EXISTS (SELECT 1 FROM partner_offers WHERE advertiser_id = v_adv_id AND is_active = true) THEN
    INSERT INTO partner_offers (
      advertiser_id, offer_name, offer_type,
      offer_headline, offer_subheadline, offer_value_statement,
      urgency_text, urgency_count_remaining,
      cta_button_text,
      proof_points, objection_responses, target_keywords,
      is_active, start_date
    ) VALUES (
      v_adv_id,
      'Q2 2026 New Patient Free First Visit',
      'schedule_consult',
      '$0 First Visit Consultation',
      'Reserve Your Child''s Spot This Month',
      'A no-pressure, fun first visit where your child meets Dr. Schreiber, rides the Chew-Chew Train, and takes home a goodie bag. No cleaning. No exam. Just a friendly hello so your child knows what to expect when their real first cleaning happens. Normally $150 — free this month for new patients.',
      'Limited to first 50 families this month',
      50,
      'Reserve My Child''s Spot →',
      '[
        {"claim": "Specialty-trained pediatric dentists", "source": "internal"},
        {"claim": "30 years serving River Region families", "source": "internal"},
        {"claim": "3 convenient locations across the River Region", "source": "internal"},
        {"claim": "Most major insurance accepted", "source": "internal"},
        {"claim": "Member, American Academy of Pediatric Dentistry", "source": "accreditation"}
      ]',
      '[
        {"objection": "Is this really free — no catch?", "response": "Completely free. No billing, no X-rays, no exam. This visit is just about your child meeting the team in a low-pressure setting. Everything else is scheduled and billed separately."},
        {"objection": "What if my child has a cavity?", "response": "The $0 visit is the meet-and-greet only. If your child needs treatment, we schedule that as a separate visit and walk you through every step of what it costs."},
        {"objection": "What ages?", "response": "We see children from age 1 through their teen years. The $0 First Visit is specifically designed for children who have never been to the dentist before."},
        {"objection": "Do I need to bring anything?", "response": "Just your child and yourself. We handle everything else — including a goodie bag they get to take home. If you have insurance information handy, bring that, but it''s not required for the first visit."}
      ]',
      ARRAY['pediatric dentist Montgomery AL', 'pediatric dentist Wetumpka', 'free first dental visit kids', 'kids dentist River Region', 'chew-chew train dentist'],
      true,
      CURRENT_DATE
    ) RETURNING id INTO v_offer_id;

    UPDATE advertiser_accounts SET current_offer_id = v_offer_id WHERE id = v_adv_id;
  END IF;

  -- Locations (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_locations WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_locations (advertiser_id, location_name, address_line_1, city, state, zip, phone, hours_json, is_primary, accepting_new, display_order)
    VALUES
      (v_adv_id, 'Montgomery', '7047 Halcyon Summit Dr', 'Montgomery', 'AL', '36117', '334-277-6830',
       '{"Mon": "7:30am–5:00pm", "Tue": "7:30am–5:00pm", "Wed": "7:30am–5:00pm", "Thu": "7:30am–5:00pm", "Fri": "7:30am–5:00pm"}',
       true, true, 1),
      (v_adv_id, 'Wetumpka', '68 Village Loop', 'Wetumpka', 'AL', '36092', '334-277-6830',
       '{"Mon": "7:30am–5:00pm", "Tue": "7:30am–5:00pm", "Wed": "7:30am–5:00pm", "Thu": "7:30am–5:00pm", "Fri": "7:30am–5:00pm"}',
       false, true, 2),
      (v_adv_id, 'Millbrook', '207 Ashton Plaza Street', 'Millbrook', 'AL', '36054', '334-277-6830',
       '{"Wed": "7:30am–4:30pm"}',
       false, true, 3);
  END IF;

  -- Team (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_team_members WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_team_members (advertiser_id, display_name, title, credentials, bio, philosophy_quote, display_order)
    VALUES
      (v_adv_id, 'Dr. Julia Isherwood Schreiber', 'Pediatric Dentist', 'DMD, Board Certified in Pediatric Dentistry',
       'Dr. Schreiber has been making first dental visits something kids actually look forward to for over a decade. A graduate of a nationally recognized pediatric dental residency program, she built Dentistry for Children around one idea: the first visit shapes every dental experience that follows. She designed the Happy Visit specifically because she believed children deserved better than being thrown into a chair and told to open wide.',
       'My favorite moments are first visits. A nervous kid walks in, meets the Chew-Chew Train, leaves with a goodie bag and a smile — that''s why we built this practice.',
       1),
      (v_adv_id, 'Dr. LaKeisha Thomas', 'Pediatric Dentist', 'DMD, Pediatric Dental Specialist',
       'Dr. Thomas joined the Dentistry for Children team because she believed River Region families deserved pediatric dental care that felt like a community. Known among patients and parents for her calm presence and ability to connect with even the most anxious children, she has a particular focus on children with special needs and those experiencing their first dental visit.',
       'Every child I see reminds me why I chose this specialty. There''s a version of dental care where kids aren''t scared — and I''m here to give that to every family I meet.',
       2);
  END IF;

  -- Testimonials (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_testimonials WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_testimonials (advertiser_id, quote, author_name, author_context, rating, display_order)
    VALUES
      (v_adv_id, 'We''ve been bringing all three of our kids here for years. The Chew-Chew Train is adorable, and Dr. Schreiber is so patient with our youngest who gets nervous. We wouldn''t go anywhere else.', 'Sarah M.', 'Mom of 3, Prattville', 5, 1),
      (v_adv_id, 'Our son had his first visit at one year old, just like they recommend. They made it so easy and fun — he actually asks to go back now. That says everything.', 'Lauren T.', 'First-time mom, Pike Road', 5, 2),
      (v_adv_id, 'Three kids, all different ages, all at different stages. The team here handles all of them with total professionalism. I send every new family I meet here.', 'Michelle R.', 'Mom of 3, Wetumpka', 5, 3),
      (v_adv_id, 'We were so nervous about our daughter''s first cleaning. Dr. Thomas was incredible — she talked to my daughter the whole time and made it feel like a game. No tears. That''s a miracle.', 'Jennifer K.', 'Mom, Montgomery', 5, 4);
  END IF;

  -- Trust signals (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_trust_signals WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_trust_signals (advertiser_id, signal_type, label, description, display_order)
    VALUES
      (v_adv_id, 'accreditation', 'American Academy of Pediatric Dentistry', 'Board-certified pediatric dentist members', 1),
      (v_adv_id, 'years_in_business', '30+ Years Serving River Region Families', 'Trusted since 1995', 2),
      (v_adv_id, 'insurance', 'Most Insurance Accepted', 'BCBS, Aetna, Delta Dental, Cigna, MetLife, and more', 3),
      (v_adv_id, 'certification', 'Board Certified', 'Both doctors are board-certified in pediatric dentistry', 4),
      (v_adv_id, 'award', 'River Region Parents Trusted Partner', 'Featured in River Region Parents since 2019', 5);
  END IF;

  -- Services (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_services WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_services (advertiser_id, service_name, description, icon, display_order)
    VALUES
      (v_adv_id, 'Happy First Visit (Free)', 'No-pressure meet-and-greet for new patients. Ride the Chew-Chew Train, meet the team, take home a goodie bag.', '🚂', 1),
      (v_adv_id, 'Infant Oral Health', 'First dental visit by the first birthday — we guide parents through exactly what to expect in those early years.', '👶', 2),
      (v_adv_id, 'Preventive Care', 'Regular cleanings, exams, and fluoride treatments designed for kids at every stage of development.', '✨', 3),
      (v_adv_id, 'Sealants & Fluoride', 'Protective sealants for cavity-prone molars. The easiest thing you can do for your child''s dental health.', '🛡️', 4),
      (v_adv_id, 'Emergency Care', 'Knocked-out tooth? Toothache at 2am? We''re here for the unexpected moments too.', '🏥', 5),
      (v_adv_id, 'Special Needs Dentistry', 'Patient, specialized care for children with sensory needs, anxiety, or special requirements.', '❤️', 6),
      (v_adv_id, 'Orthodontic Evaluation', 'Early orthodontic assessments starting around age 7, so you can plan ahead — not react.', '😁', 7),
      (v_adv_id, 'Sports Mouthguards', 'Custom-fit protection for every athlete, designed specifically for growing mouths.', '⚽', 8);
  END IF;

  -- FAQs (skip if exist)
  IF NOT EXISTS (SELECT 1 FROM advertiser_faqs WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_faqs (advertiser_id, question, answer, display_order)
    VALUES
      (v_adv_id, 'When should my child first see a dentist?', 'The American Academy of Pediatric Dentistry recommends a child''s first dental visit by their first birthday, or when their first tooth appears — whichever comes first. Early visits establish good habits and catch issues before they become problems.', 1),
      (v_adv_id, 'Do you accept my insurance?', 'We accept most major insurance plans including BCBS, Aetna, Delta Dental, Cigna, and MetLife. Call our office with your insurance card and we''ll confirm coverage before your visit.', 2),
      (v_adv_id, 'What if my child has dental anxiety?', 'This is exactly why we built the Happy Visit. Our entire practice is designed around anxious children. Both doctors specialize in gentle, patient-paced dentistry. We never rush, never force, and always let your child lead the pace.', 3),
      (v_adv_id, 'Can I stay in the room with my child?', 'Always. For young children and first visits, having a parent present is part of how we keep things calm. We''ll guide you on when stepping back might help (as children get older and more comfortable) — but you''re always welcome.', 4),
      (v_adv_id, 'Do you treat children with special needs?', 'Yes. Dr. Thomas has specific training and experience in special needs dentistry. Please call us before your visit to discuss your child''s specific needs so we can prepare the right environment.', 5);
  END IF;

  -- Photos (Unsplash curated — replace with real DFC photos when available)
  IF NOT EXISTS (SELECT 1 FROM advertiser_photos WHERE advertiser_id = v_adv_id) THEN
    INSERT INTO advertiser_photos (advertiser_id, photo_url, alt_text, caption, category, source, display_order, is_primary_for_category)
    VALUES
      (v_adv_id, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1200&q=80', 'Friendly pediatric dentist with child patient', 'Replace with real DFC photo', 'hero', 'unsplash_curated', 1, true),
      (v_adv_id, 'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=800&q=80', 'Happy child at dentist visit', 'Replace with real DFC photo', 'patients_kids', 'unsplash_curated', 1, true),
      (v_adv_id, 'https://images.unsplash.com/photo-1607748851687-ba9a10438621?w=800&q=80', 'Child smiling at dentist', 'Replace with real DFC photo', 'patients_kids', 'unsplash_curated', 2, false),
      (v_adv_id, 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&q=80', 'Modern dental office reception', 'Replace with real DFC photo', 'space', 'unsplash_curated', 1, true),
      (v_adv_id, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&q=80', 'Pediatric dental team', 'Replace with real DFC photo', 'team', 'unsplash_curated', 1, true);
  END IF;

END $$;
