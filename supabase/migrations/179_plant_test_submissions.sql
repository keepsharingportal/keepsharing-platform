-- ── Plant: 6 test community_submissions for bridge validation ───────────────
--
-- You haven't promoted the intake form yet, so the Editor Review Desk +
-- Content Deployment Today view are empty — making it impossible to
-- exercise the publish-to-article bridge or watch the standup view light
-- up. This migration drops six realistic test rows in different pipeline
-- stages so you can:
--
--   1. See the funnel populate (new → needs-review → ai-draft-ready →
--      approved) on the Today tab
--   2. Click 'Publish to homepage' on the two pre-approved rows and watch
--      a real guide_articles row appear on the public homepage
--   3. Validate the Meta Suite auto-post path on the row that also has
--      approved_social
--   4. Verify the submission_type → column_slug mapping fires correctly
--      for the 4 different types covered (mom-to-mom, teacher-of-month,
--      play-ball, student-spotlight)
--
-- All test rows are tagged with editor_notes = '[TEST DATA - safe to
-- delete]' so cleanup is one query:
--
--   DELETE FROM community_submissions WHERE editor_notes = '[TEST DATA - safe to delete]';
--
-- (Run the cleanup AFTER you delete any guide_articles rows the bridge
-- created from these — those don't auto-cascade because the FK is ON
-- DELETE SET NULL.)
--
-- Idempotent via ON CONFLICT (id) DO NOTHING — safe to re-run.

INSERT INTO community_submissions (
  id, submission_type, target_publication, status, ai_draft_status,
  submitter_name, submitter_email,
  working_title, slug_suggestion, excerpt, ai_draft_content,
  feature_image_url,
  related_person_name, related_business_name, related_school_name,
  issue_month, issue_year,
  approved_web, approved_newsletter, approved_social,
  payload, editor_notes,
  created_at, updated_at
) VALUES

-- 1. Mom to Mom — APPROVED for web + newsletter, ready for publish bridge
('11111111-1111-4111-8111-111111111101',
 'mom-to-mom', 'rrp', 'approved', 'ready',
 'Sarah Bennett', 'sarah.bennett@example.com',
 'Why I Stopped Pinterest-Comparing My Kid''s Birthday Parties',
 'why-i-stopped-pinterest-comparing-birthday-parties',
 'A real-mom reflection on letting go of the perfect-party trap and what actually mattered to my five-year-old at her birthday this year.',
 E'When my daughter turned five, I had every intention of throwing her the unicorn-rainbow-cloud-themed birthday party she''d been talking about for six months. I had the Pinterest board. I had the Etsy seller bookmarked. I had a vision.\n\nWhat I didn''t have was time, energy, or — if I''m honest — interest in spending three weeks of evenings hot-gluing pastel paper plates.\n\nSo I made a different call. We invited four friends. I bought a Costco cake. I cut up some watermelon. The girls ran around in the backyard in princess dresses they brought from home, jumped on the trampoline, painted rocks, and ate pizza on a blanket.\n\nMy daughter — the one I was so worried about disappointing — beamed the entire time. The next morning she said, in that quiet way kids say important things, "Mom, that was the best birthday I ever had."\n\nFour months later, I still think about that. About how the version I was about to grind myself down to produce wasn''t the one she wanted. About how much of motherhood I''ve spent trying to manufacture a feeling — magical, special, memorable — instead of just showing up and letting the day be the day.\n\nIf you''re reading this in the planning haze of your own kid''s upcoming party: the cake doesn''t have to match the napkins. The favors don''t have to be themed. The Pinterest board can stay closed.\n\nYour kid wants you in the backyard, present, not in the kitchen, exhausted. Trust me on this one.',
 'https://picsum.photos/seed/rrp-mom-to-mom-birthday/1200/800',
 'Sarah Bennett', NULL, NULL,
 'July', 2026,
 TRUE, TRUE, FALSE,
 '{"author_email":"sarah.bennett@example.com","photo_consent":true}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

-- 2. Teacher of the Month — APPROVED for ALL channels, tests FB auto-post
('11111111-1111-4111-8111-111111111102',
 'teacher-of-the-month', 'rrp', 'approved', 'ready',
 'Anna Bennett', 'anna.bennett@example.com',
 'Mrs. Patricia Holloway — Trinity Presbyterian Day School',
 'patricia-holloway-trinity-presbyterian-teacher-of-month',
 'A 19-year veteran kindergarten teacher who has every former student''s parent on a first-name basis and a classroom that looks like an artist''s studio.',
 E'Walk into Mrs. Patricia Holloway''s kindergarten classroom at Trinity Presbyterian Day School and you''ll know within thirty seconds why parents request her two years in advance.\n\nThere''s a reading nook with twinkle lights. A "Question of the Day" board where every five-year-old gets to vote on whether unicorns are real (today''s tally: 14 yes, 2 no, 1 "maybe but only in Kentucky"). There''s a wall of student-painted sunflowers, and a corner where a child named Emerson is teaching her teacher how to do the floss dance "but slower so it''s in the right beat."\n\n"They teach me more than I teach them most days," Mrs. Holloway says, watching Emerson with the look of someone who has had this exact thought a thousand times and means it every single time.\n\nNominated by no fewer than four families this year — the most of any teacher in our submissions — Mrs. Holloway is in her nineteenth year at Trinity. She''s taught siblings of siblings of siblings. She remembers every name. She sends a handwritten birthday card to every former student through high school graduation, which means at any given moment she is hand-writing roughly four hundred cards a year.\n\n"My mom kept all of mine in a shoebox," said one nominator. "When I had my first daughter, Mrs. Holloway was the first call we made about Pre-K. There''s nobody else I want her with."\n\nCongratulations, Mrs. Holloway. Trinity is lucky to have you, and the River Region is lucky for every kindergartener you''ve sent into first grade with a steady heart.',
 'https://picsum.photos/seed/rrp-teacher-trinity/1200/800',
 'Patricia Holloway', NULL, 'Trinity Presbyterian Day School',
 'July', 2026,
 TRUE, TRUE, TRUE,
 '{"nominator_count":4,"nominator_names":["Bennett family","Carter family","Holloway family","Walker family"]}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),

-- 3. Play Ball — AI-DRAFT-READY, needs review before approval
('11111111-1111-4111-8111-111111111103',
 'play-ball', 'rrp', 'ai-draft-ready', 'ready',
 'Brian Thomas', 'coach.thomas@example.com',
 'Montgomery Catholic Pee-Wee Football Goes 8-0',
 'montgomery-catholic-peewee-football-undefeated',
 'A perfect regular season for the Knights — and a coach who says the real win was watching nine-year-olds become teammates.',
 E'They didn''t lose a game.\n\nMontgomery Catholic''s pee-wee football squad — sixteen boys, average age nine, average pre-season football experience approximately zero — finished the regular season 8-0 last Saturday with a 24-6 win over Wetumpka Athletic Club.\n\nIt''s the kind of season every coach dreams about. It''s also, according to Coach Brian Thomas, not really what the season was about.\n\n"I had a kid who cried at the first practice because he didn''t want to put on a helmet," Coach Thomas said. "Last week he tackled a kid twice his size on the goal line and ran back to the sideline yelling for everyone to high-five him. THAT is what we''re here for."\n\nThe team — which features players from St. James, Trinity, Montgomery Catholic, and three local public schools — practices three days a week at Lloyd Nix Field. Most of the players had never put on pads before August. By October, they were running a no-huddle offense that ran circles around teams twice their size.\n\n"They became a team," Coach Thomas said. "That''s the actual undefeated season. The score on the scoreboard is just the loud part."\n\nThe Knights play their playoff opener Saturday at 10am at home. Tickets are free. Coach Thomas asks that you come early and stay late.',
 'https://picsum.photos/seed/rrp-play-ball-football/1200/800',
 'Coach Brian Thomas', 'Montgomery Catholic Preparatory School', 'Montgomery Catholic',
 'November', 2026,
 FALSE, FALSE, FALSE,
 '{"sport":"football","age_group":"pee-wee","record":"8-0"}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours'),

-- 4. Student Spotlight — APPROVED for web only, tests bridge without social
('11111111-1111-4111-8111-111111111104',
 'student-spotlight', 'rrp', 'approved', 'ready',
 'Theresa Carter', 'theresa.carter@example.com',
 'Eli Carter — ASMS Junior with a Patent at 16',
 'eli-carter-asms-junior-patent',
 'A homegrown Wetumpka kid whose science project turned into a real-world medical device patent — and who still has to do the dishes after dinner.',
 E'Eli Carter doesn''t look like a sixteen-year-old with a patent.\n\nHe looks like a sixteen-year-old. Backwards baseball cap. Football hoodie. The fidget-y energy of someone who is very aware that the interview is cutting into his Mario Kart time.\n\nBut sometime between his sophomore year at Alabama School of Math and Science and the start of his junior year, Eli — with two faculty advisors — co-developed a low-cost mechanical device for stabilizing IV lines on pediatric patients. The provisional patent was granted in April. UAB Medical is in early talks about field-testing it.\n\n"I just thought, like, this should be easier," Eli said. "When my little sister was in the hospital after her appendix burst, the IV kept getting kinked when she rolled over. The nurses were great but they were dealing with it all night every night. I wanted to know why nobody had fixed it."\n\nSo he did. With a 3D printer, a spool of medical-grade silicone, and roughly four months of YouTube tutorials.\n\nHis parents — Wetumpka High graduates Lance and Theresa Carter — say they''ve mostly tried to stay out of the way. "He''s built like this since he was four," his mom said. "We just keep the printer stocked and make sure he eats dinner."\n\nEli plans to study biomedical engineering, probably at Auburn. He has not made up his mind. He still has to make his bed every morning.',
 'https://picsum.photos/seed/rrp-student-spotlight-asms/1200/800',
 'Eli Carter', NULL, 'Alabama School of Math and Science',
 'August', 2026,
 TRUE, FALSE, FALSE,
 '{"grade":"junior","achievement":"patent"}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),

-- 5. School News — NEEDS-REVIEW, sits in the upstream queue
('11111111-1111-4111-8111-111111111105',
 'school-news', 'rrp', 'needs-review', 'none',
 'Pike Road Communications', 'comms@pikeroadschools.example.com',
 'Pike Road Schools earns National Blue Ribbon recognition',
 'pike-road-blue-ribbon-recognition',
 'The U.S. Department of Education named Pike Road Schools one of 356 schools nationwide to earn the Blue Ribbon honor this year — recognition for sustained academic excellence.',
 NULL,
 'https://picsum.photos/seed/rrp-pike-road-blue-ribbon/1200/800',
 NULL, NULL, 'Pike Road Schools',
 'October', 2026,
 FALSE, FALSE, FALSE,
 '{"submitted_by":"Pike Road Schools Communications","announcement_date":"2026-10-15"}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

-- 6. Parent Picks — NEW, top of the funnel
('11111111-1111-4111-8111-111111111106',
 'parent-picks', 'rrp', 'new', 'none',
 'Crystal Walker', 'crystal.walker@example.com',
 'Best birthday party venues we''ve tried (so far)',
 'best-birthday-party-venues-we-tried',
 'A roundup of where we''ve thrown our kids'' parties this year — what worked, what didn''t, and what would make us go back.',
 NULL,
 NULL,
 'Crystal Walker', NULL, NULL,
 'July', 2026,
 FALSE, FALSE, FALSE,
 '{"venues_count":5,"author_email":"crystal.walker@example.com"}',
 '[TEST DATA - safe to delete]',
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')

ON CONFLICT (id) DO NOTHING;
