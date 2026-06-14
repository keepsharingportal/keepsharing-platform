-- ── Seed 6 test nominations, one per nomination type ───────────────────────
--
-- Wipes prior [TEST DATA] rows + any guide_articles they spawned via
-- the publish bridge, then inserts ONE fresh nominated submission per
-- type so the user can walk into /admin/community and see all 6 in
-- the queue, click each, and verify the OutreachComposerPanel
-- pre-fills correctly for every role variant:
--
--   self     — teacher-of-the-month, mom-to-mom, grands-are-the-greatest
--   guardian — play-ball, student-spotlight
--   business — parent-picks
--
-- All set to phase='nominated' so the right column shows the
-- OutreachComposerPanel (or NextActionPanel for parent-picks since
-- needs_outreach=FALSE on roundup types — that's expected and is
-- worth seeing too).

-- 1. Clear prior test data
DELETE FROM guide_articles
WHERE id IN (
  SELECT promoted_to_article_id
  FROM community_submissions
  WHERE editor_notes = '[TEST DATA - safe to delete]'
    AND promoted_to_article_id IS NOT NULL
);

DELETE FROM community_submissions
WHERE editor_notes = '[TEST DATA - safe to delete]';


-- ── 2. Mom-to-Mom (self role) ────────────────────────────────────────────────
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_person_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222201',
  'mom-to-mom', 'rrp',
  'new', 'nominated', 'none',
  'Lauren Hadley', 'lauren.hadley@example.com', '(334) 555-0117',
  'Whitney Cole',  'whitney.cole@example.com',  '(334) 555-0142', NULL,
  'Whitney Cole',
  'Whitney Cole — mom of three navigating early-onset breast cancer',
  'Lauren nominated Whitney, a Pre-K teacher at Trinity Presbyterian who at 34 was diagnosed with early-onset breast cancer and has continued showing up for her three kids and her students through every round of treatment.',
  'whitney-cole-mom-of-three',
  $payload$ {
    "your_relationship":  "Close friend",
    "neighborhood":       "Montgomery, AL",
    "kids_ages":          "Three kids — ages 8, 5, and 2",
    "why_nominate":       "Whitney is a mom of three diagnosed with early-onset breast cancer at 34 last fall. The way she has held her family together through treatment while continuing to show up for her Pre-K classroom at Trinity Presbyterian is something every mom in the River Region should hear about. She is real, funny in the way only someone who has stared down the worst can be, and would say yes to talking about this if you ask her right.",
    "good_to_know":       "Treatment is ongoing — please give her flexibility on timing. Mornings are usually better than afternoons (she teaches all day)."
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'
);


-- ── 3. Teacher of the Month (self role) ─────────────────────────────────────
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_person_name, related_school_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222202',
  'teacher-of-the-month', 'rrp',
  'new', 'nominated', 'none',
  'Maria Gonzalez', 'maria.g@example.com', '(334) 555-0203',
  'Karen Hayes',    'karen.hayes@example.com', '(334) 555-0204', NULL,
  'Karen Hayes', 'Eastwood Elementary',
  'Karen Hayes — 3rd grade teacher who made my son believe in himself again',
  'After a hard year in 2nd grade, Karen Hayes saw what was happening with my son Diego before we did. She pulled him aside, made him the class "math captain," and watched him bloom. He reads ahead of grade level now.',
  'karen-hayes-3rd-grade-teacher',
  $payload$ {
    "teacher_name":           "Karen Hayes",
    "school_name":            "Eastwood Elementary",
    "grade_subject":          "3rd Grade / Math & Reading",
    "nomination_reason":      "After a hard year in 2nd grade where my son Diego was falling behind, Karen Hayes saw what was happening before we did. She pulled him aside on day three, made him her class \"math captain\" (a job nobody had — she invented it for him), and watched him bloom. By Christmas he was reading ahead of grade level. By spring he was telling other kids he was good at math. Mrs. Hayes gave him back belief in himself that I didn''t know how to give back. She deserves the whole world.",
    "submitter_relationship": "Parent of a student"
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'
);


-- ── 4. Grands Are the Greatest (self role) ──────────────────────────────────
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_person_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222203',
  'grands-are-the-greatest', 'rrp',
  'new', 'nominated', 'none',
  'Amanda Phillips', 'amanda.p@example.com', '(334) 555-0305',
  'Dorothy Mae Watson', 'dorothy.watson@example.com', '(334) 555-0306', NULL,
  'Dorothy Mae Watson',
  'Dorothy Mae Watson — Grandma to the whole neighborhood',
  'My mom Dorothy isn''t just our kids'' grandmother — she''s the unofficial grandma to half the cul-de-sac. Friday afternoons her front porch fills up with neighborhood kids waiting for homemade biscuits and one of her stories.',
  'dorothy-mae-watson-grandma',
  $payload$ {
    "grand_name":     "Dorothy Mae Watson",
    "city":           "Prattville, AL",
    "why_special":    "My mom Dorothy isn''t just our kids'' grandmother — she''s the unofficial grandma to half the cul-de-sac. Friday afternoons her front porch fills up with neighborhood kids waiting for her homemade biscuits and one of her stories. She raised four of us on a teacher''s salary, never missed a single one of our kids'' birthdays in 15 years, and shows up to every school play with a casserole dish for the teachers. She doesn''t think anything she does is special. Everyone else in this neighborhood would disagree.",
    "special_memory": "Last Christmas she taught my 6-year-old how to make her biscuits from scratch, then sent him home with a wrapped recipe card and a tiny rolling pin she''d found at a yard sale months earlier. He still talks about it.",
    "relationship":   "Parent of grandchild"
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'
);


-- ── 5. Play Ball (GUARDIAN role) ────────────────────────────────────────────
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_person_name, related_sport, related_school_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222204',
  'play-ball', 'rrp',
  'new', 'nominated', 'none',
  'Coach Tony Reeves', 'tony.reeves@example.com', '(334) 555-0411',
  -- nominee_name = the kid (subject of article); contact_name = the parent (who we email)
  'Marcus Williams', 'sarah.williams@example.com', '(334) 555-0412', 'Sarah Williams',
  'Marcus Williams', 'Soccer, 8U League', 'Montgomery Youth Soccer',
  'Marcus Williams — 8-year-old striker who plays like he''s been playing forever',
  'Marcus joined our 8U squad late after moving to town last fall. By the third practice he was the kid making other kids better. Heart-and-hustle player who never quits on a play. His parents Sarah and David should be proud.',
  'marcus-williams-8u-soccer',
  $payload$ {
    "nominee_type":           "Player / Athlete",
    "nominee_name":           "Marcus Williams",
    "sport":                  "Soccer, 8U League",
    "school_team":            "Montgomery Youth Soccer",
    "age_grade":              "8 years old / 3rd Grade",
    "why_outstanding":        "Marcus joined our 8U squad late after moving to town last fall. By the third practice he was the kid making other kids better. Heart-and-hustle player who never quits on a play, but the bigger thing is how he treats his teammates — first to celebrate a teammate''s goal, last to leave the field when someone needs help with cleats. The other parents have told me they''ve seen their own kids start to act differently since Marcus joined. That''s rare in any age group.",
    "achievement":            "Scored the equalizer in our season opener against Prattville with 30 seconds left, then sprinted to hug the teammate who passed it to him instead of celebrating on his own.",
    "submitter_relationship": "Coach"
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
);


-- ── 6. Student Spotlight (GUARDIAN role) ────────────────────────────────────
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_person_name, related_school_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222205',
  'student-spotlight', 'rrp',
  'new', 'nominated', 'none',
  'Mrs. Janet Brooks', 'janet.brooks@example.com', '(334) 555-0517',
  -- nominee = the student; contact = parent
  'Amara Johnson', 'lisa.johnson@example.com', '(334) 555-0518', 'Lisa Johnson',
  'Amara Johnson', 'Eastwood Elementary',
  'Amara Johnson — 5th grader who started a school food pantry that now feeds 40 families',
  'Amara saw classmates skipping lunch because their families were short on groceries. Instead of just feeling bad, she got her mom to help her get the principal''s permission, and a year later the pantry feeds 40 families a week.',
  'amara-johnson-food-pantry',
  $payload$ {
    "student_name":           "Amara Johnson",
    "school_name":            "Eastwood Elementary",
    "school_region":          "Montgomery County",
    "grade":                  "5th Grade",
    "why_special":            "Amara is the kind of kid who notices things adults miss. Last fall she realized classmates were skipping lunch because their families were short on groceries, and instead of just feeling bad about it she went home, got her mom to help her get the principal''s permission, and started a tiny food pantry in an unused supply closet. A year later that pantry feeds 40 families a week — Amara organized parent volunteers, runs a sign-up sheet, and personally restocks the shelves on Friday afternoons. She''s 10.",
    "achievement":            "Spoke at the Montgomery County School Board meeting last month asking them to fund pantries at three other elementary schools. They voted yes.",
    "submitter_relationship": "Teacher"
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
);


-- ── 7. Parent Picks (BUSINESS role) ─────────────────────────────────────────
-- needs_outreach = FALSE for parent-picks, so the detail page renders
-- NextActionPanel instead of OutreachComposerPanel. The nominee_*
-- contact columns still get populated so editorial can verify the
-- business at any time without chasing it through the nominator.
INSERT INTO community_submissions (
  id,
  submission_type, target_publication,
  status, phase, ai_draft_status,
  submitter_name, submitter_email, submitter_phone,
  nominee_name, nominee_email, nominee_phone, nominee_contact_name,
  related_business_name,
  working_title, excerpt, slug_suggestion,
  payload,
  editor_notes,
  created_at, updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222206',
  'parent-picks', 'rrp',
  'new', 'nominated', 'none',
  'Rachel Thompson', 'rachel.t@example.com', '(334) 555-0619',
  -- For business role: nominee_name = business; contact = staff
  'River Region Pediatrics', 'hello@riverregionpediatrics.com', '(334) 555-0177', 'Dr. Sarah Williams (Owner)',
  'River Region Pediatrics',
  'River Region Pediatrics — the practice that texts you back same day',
  'After two pediatricians who took 48 hours to return calls, Dr. Williams''s practice was a revelation. Same-day sick visits, evening hours, and an actual human answering the phone.',
  'river-region-pediatrics-parent-pick',
  $payload$ {
    "business_name":   "River Region Pediatrics",
    "business_type":   "Pediatric Practice",
    "why_love":        "After two pediatricians who took 48 hours to return calls about a feverish toddler, Dr. Williams''s practice was a revelation. Same-day sick visits, evening hours twice a week for parents who work, and an actual human answering the phone instead of a phone tree maze. When my daughter had a scary ear infection on a Saturday night, Dr. Williams herself called me back inside 20 minutes. Other River Region parents need to know this practice exists.",
    "business_website": "https://riverregionpediatrics.com",
    "have_used":       "Yes, we use them regularly"
  } $payload$::jsonb,
  '[TEST DATA - safe to delete]',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
);


-- ── Cleanup query (run when done validating) ────────────────────────────────
--
--   DELETE FROM guide_articles
--   WHERE id IN (
--     SELECT promoted_to_article_id FROM community_submissions
--     WHERE editor_notes = '[TEST DATA - safe to delete]' AND promoted_to_article_id IS NOT NULL
--   );
--   DELETE FROM community_submissions WHERE editor_notes = '[TEST DATA - safe to delete]';
