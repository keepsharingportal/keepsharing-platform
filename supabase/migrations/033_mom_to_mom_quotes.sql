-- Migration 033: Mom-to-mom quotes table + seed data

CREATE TABLE IF NOT EXISTS mom_to_mom_quotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug      TEXT REFERENCES guide_types(slug),
  quote                TEXT NOT NULL,
  attribution_name     TEXT,
  attribution_context  TEXT,
  related_advertiser_id UUID REFERENCES advertiser_accounts(id),
  is_published         BOOLEAN DEFAULT true,
  display_order        INT DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mom_quotes_guide ON mom_to_mom_quotes(guide_type_slug, is_published);

-- ── NEWCOMER / FAMILY RESOURCE ────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('newcomer', 'I moved here from Denver and the moms at the playground absorbed me into their group within a month. There is something different about Southern hospitality — it is real here.', 'Hannah K., mom of 2', 'Pike Road, moved 2024', 1),
('newcomer', 'My biggest tip: visit the schools before you decide where to live. The school you want will determine your neighborhood, not the other way around.', 'Megan T., mom of 3', 'Montgomery, moved 2023', 2),
('newcomer', 'The Saturday morning Curb Market is the fastest way to feel like a local. Go three weeks in a row and the vendors will start remembering you.', 'Ashley B., mom of 2', 'Wetumpka, 5-year resident', 3);

-- ── PRIVATE SCHOOL ────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('private-school', 'We visited every school on this guide before deciding. The open houses look the same on paper but in person you know in ten minutes which one is right for your family.', 'Jennifer R., mom of 3', 'Montgomery', 1),
('private-school', 'Do not underestimate the military discount. Several schools here offer 10% or more for active duty families and it is rarely advertised. Just ask.', 'Rachel W., military mom', 'Maxwell AFB area', 2),
('private-school', 'Saint James and Trinity have very different cultures even though they are geographically close. Do not pick one without walking both campuses on a normal school day.', 'Lauren P., mom of 2', 'Montgomery', 3);

-- ── SUMMER CAMP ───────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('summer-camp', 'I put the Abrakadoodle camp registration date in my calendar in December. February rolls around and if you are not ready within the first hour, your favorite session is full.', 'Sarah M., mom of 2', 'Montgomery', 1),
('summer-camp', 'We tried three different camps before we found one that clicked for our son. The counselor-to-camper ratio matters way more than the activities listed on the website.', 'Danielle K., mom of 1', 'Pike Road', 2),
('summer-camp', 'Half-day camps were the right move for our 5-year-old. Full-day in Alabama heat was too much until she was 7. Know your kid.', 'Carrie H., mom of 2', 'Millbrook', 3);

-- ── CHILDCARE ─────────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('childcare', 'We got on three waitlists while I was still pregnant. By the time my son was born, two of them had openings. Do not wait.', 'Amanda S., mom of 1', 'Montgomery', 1),
('childcare', 'The staff turnover rate is the thing nobody talks about. Ask how long the lead teacher has been there. If it is under two years, ask why.', 'Nicole B., mom of 2', 'Prattville', 2),
('childcare', 'I visited four centers before I found one where the director knew every kid by name in the first week. That told me everything about the culture there.', 'Tiffany L., mom of 3', 'Hope Hull area', 3);

-- ── HEALTHY KIDS ──────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('healthy-kids', 'Dentistry for Children was the first dental visit either of my kids did not cry through. They have the whole thing figured out.', 'Kayla M., mom of 2', 'Montgomery', 1),
('healthy-kids', 'Call your top pediatrician choices while you are still pregnant. The good ones have a waitlist for new births and it fills up months ahead.', 'Stephanie R., mom of 1', 'Pike Road', 2),
('healthy-kids', 'Ask any pediatrician how they handle after-hours calls before you commit. Some use nurse lines. Others have the actual doctor on call. It matters at midnight.', 'Jessica T., mom of 3', 'Wetumpka', 3);

-- ── SUMMER FUN ────────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('summer-fun', 'Montgomery Zoo after 5pm is a completely different experience. The animals are awake, the crowds are thinner, and the temperature is actually manageable.', 'Beth A., mom of 2', 'Montgomery', 1),
('summer-fun', 'The splash pad at Oak Park is free and worth every trip. Get there by 9am or accept that you are sharing it with half of Montgomery County.', 'Tracey W., mom of 3', 'Montgomery', 2),
('summer-fun', 'The Pike Road Farmers Market on Saturday morning has the most social atmosphere of any market in the area. It is less about the produce and more about the community.', 'Lindsay G., mom of 2', 'Pike Road', 3);

-- ── BIRTHDAY PARTY ────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('birthday-party', 'I waited six weeks before my daughter''s party to book the venue I wanted and lost the date. Book the Saturday slots before anything else.', 'Melanie S., mom of 2', 'Montgomery', 1),
('birthday-party', 'Bruster''s ice cream cake saved my life. Seriously. Easier than baking, better than the grocery store option, and kids lose their minds over it.', 'Patricia H., mom of 3', 'Montgomery', 2),
('birthday-party', 'Outdoor parties in April and October are magical here. Outdoor parties in July are a parenting mistake you make once.', 'Christy K., mom of 2', 'Prattville', 3);

-- ── AFTERSCHOOL ───────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('afterschool', 'The art program my daughter is in changed what she thinks she is capable of. We almost did not sign up because the timing was tight. Best decision we made.', 'Monica J., mom of 2', 'Montgomery', 1),
('afterschool', 'YMCA afterschool buses from our elementary school have been the single most practical thing for our two-working-parent schedule.', 'Renee P., mom of 3', 'Montgomery', 2),
('afterschool', 'Do not let the guitar lessons thing intimidate you. Guitar Center on Eastern Blvd has the most patient beginner instructors, and the prices are reasonable.', 'Laura T., mom of 2', 'Montgomery', 3);

-- ── SPECIAL NEEDS ─────────────────────────────────────────────────────────────
INSERT INTO mom_to_mom_quotes (guide_type_slug, quote, attribution_name, attribution_context, display_order) VALUES
('special-needs', 'Early intervention at 18 months was the decision that changed the trajectory for our son. Call and get on the evaluation list immediately. Do not wait for a formal diagnosis.', 'Kristin M., mom of 2', 'Montgomery', 1),
('special-needs', 'The Montgomery County IEP process can feel adversarial if you go in without preparation. Find a parent advocate before your first meeting. They are free. It changes everything.', 'Angela S., mom of 1', 'Montgomery', 2),
('special-needs', 'The C.H.A.D.D. resources at chadd.org are the best starting point for ADHD. Then search for the local Facebook group — the real-time intel from Montgomery parents is invaluable.', 'Diana B., mom of 2', 'Montgomery', 3);
