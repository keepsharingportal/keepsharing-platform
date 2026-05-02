-- Migration 036: Monthly spotlight callouts per guide

CREATE TABLE IF NOT EXISTS guide_monthly_spotlights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_type_slug  TEXT REFERENCES guide_types(slug),
  spotlight_month  INT NOT NULL,
  spotlight_year   INT NOT NULL,
  headline         TEXT NOT NULL,
  body             TEXT,
  cta_label        TEXT,
  cta_link         TEXT,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_spotlights ON guide_monthly_spotlights(guide_type_slug, spotlight_month, spotlight_year, is_active);

-- ── May 2026 spotlights for all 9 guides ─────────────────────────────────────
INSERT INTO guide_monthly_spotlights (guide_type_slug, spotlight_month, spotlight_year, headline, body, cta_label, cta_link) VALUES
('newcomer', 5, 2026,
 'New to the River Region this spring?',
 'May is one of the best months to get out and meet your community. Mother''s Day events, Memorial Day weekend gatherings, and farmers markets in full swing.',
 'See This Week''s Calendar', '/calendar'),
('private-school', 5, 2026,
 'May is application decision time.',
 'Most private schools have made enrollment decisions by mid-May. If you''re still deciding, schedule a final tour now — slots fill quickly for fall.',
 'Browse Schools', '/private-school-guide'),
('summer-camp', 5, 2026,
 'Last chance for popular summer camps.',
 'Premium camps and specialty programs are filling fast. Most have rolling registration — check availability now to avoid sold-out disappointment.',
 'Browse Summer Camps', '/summer-camp-guide'),
('childcare', 5, 2026,
 'Summer childcare gaps starting?',
 'School lets out in late May. If you need full-day childcare for the summer, now is the time to confirm spots and waitlists.',
 'Find Summer Childcare', '/childcare-guide'),
('healthy-kids', 5, 2026,
 'Summer physicals and camp forms.',
 'Most summer camps require physical exams within 12 months. Schedule your child''s appointment now — pediatrician offices fill up fast in May.',
 'Find a Pediatrician', '/healthy-kids-guide'),
('summer-fun', 5, 2026,
 'Mother''s Day weekend is here.',
 'Local restaurants, gardens, museums, and river cruises are hosting Mother''s Day brunches and events. See what''s happening this weekend.',
 'See Mother''s Day Events', '/calendar'),
('birthday-party', 5, 2026,
 'Spring and summer birthday season.',
 'May through August is peak birthday party season in the River Region. Outdoor venues, splash parties, and pool clubs book up fast — start planning now.',
 'Browse Party Venues', '/birthday-party-guide'),
('afterschool', 5, 2026,
 'School year wind-down planning.',
 'Most after-school programs end in late May. Summer transitions matter — find programs that bridge the gap between school and summer camp.',
 'Browse Programs', '/afterschool-guide'),
('special-needs', 5, 2026,
 'Summer transitions and IEP review.',
 'School year-end is when IEP teams review progress. May is also when summer programs designed for special needs kids open registration.',
 'Find Resources', '/special-needs-guide');
