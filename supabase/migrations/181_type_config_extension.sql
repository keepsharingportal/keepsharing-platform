-- ── Extend submission_type_columns with workflow + content config ───────────
--
-- The bridge already maps submission_type → column_slug here. We now
-- pile on the rest of the per-type config the nomination workflow needs
-- so editors can re-route, change interview questions, or adjust
-- article format from a single edit table without touching code.

ALTER TABLE submission_type_columns
  ADD COLUMN IF NOT EXISTS needs_outreach BOOLEAN NOT NULL DEFAULT TRUE;

-- Article format drives how the editor's draft workspace renders +
-- which AI prompt template is used:
--   'q-and-a'      — Mom-to-Mom, Grands, sometimes Student Spotlight
--   'profile'      — Teacher of Month, Boom Profile (narrative bio)
--   'write-up'     — Play Ball (sports feature)
--   'news-brief'   — School Bits (announcement)
--   'photo-caption'— Birthday Celebration (image-led)
--   'roundup'      — Parent Picks (list)
ALTER TABLE submission_type_columns
  ADD COLUMN IF NOT EXISTS article_format TEXT NOT NULL DEFAULT 'profile'
  CHECK (article_format IN ('q-and-a', 'profile', 'write-up', 'news-brief', 'photo-caption', 'roundup'));

-- The questions the nominee sees on /interview/[token]. JSONB array:
--   [{ key, label, prompt, type ('text'|'longtext'|'select'), required, options? }]
ALTER TABLE submission_type_columns
  ADD COLUMN IF NOT EXISTS interview_template JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Image requirements for the nominee form:
--   { min_required, max, recommended_count, types: ['portrait','candid','action','classroom',...] }
ALTER TABLE submission_type_columns
  ADD COLUMN IF NOT EXISTS image_requirements JSONB NOT NULL DEFAULT '{"min_required":0,"max":4,"types":[]}'::jsonb;

-- ── Seed: configure each existing type ──────────────────────────────────────
-- ON CONFLICT DO UPDATE so re-running this migration refreshes the seed
-- without overwriting per-deployment edits the operator has made via
-- the admin (we only touch columns we own).

-- Mom to Mom — Q&A interview. Mom answers personal questions.
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'q-and-a',
  interview_template = '[
    {"key":"intro_one_line",         "label":"In one line: who are you?",                                            "type":"text",     "required":true,  "prompt":"e.g. \"Mom of three, Montgomery, ER nurse turned full-time mom.\""},
    {"key":"why_motherhood_hard",    "label":"What''s the hardest part of motherhood right now?",                    "type":"longtext", "required":true,  "prompt":"Be real. Other moms will recognize themselves."},
    {"key":"advice_younger_self",    "label":"What would you tell yourself five years ago?",                          "type":"longtext", "required":true},
    {"key":"unexpected_joy",         "label":"An unexpected joy you didn''t see coming",                              "type":"longtext", "required":true},
    {"key":"favorite_river_region",  "label":"Your favorite River Region family spot",                                "type":"text",     "required":false},
    {"key":"book_song_show",         "label":"A book, song, or show getting you through this season",                 "type":"text",     "required":false},
    {"key":"permission_quote",       "label":"Permission slip for other moms — one sentence",                          "type":"longtext", "required":true,  "prompt":"e.g. \"You don''t have to host the perfect birthday party.\""}
  ]'::jsonb,
  image_requirements = '{"min_required":1,"max":3,"recommended_count":2,"types":["portrait","candid"]}'::jsonb
WHERE submission_type = 'mom-to-mom';

-- Grands Are the Greatest — Q&A with the grandparent
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'q-and-a',
  interview_template = '[
    {"key":"intro",                  "label":"How many grandkids and ages?",                                          "type":"text",     "required":true},
    {"key":"best_thing",             "label":"The best thing about being a grandparent",                              "type":"longtext", "required":true},
    {"key":"favorite_tradition",     "label":"A tradition you''ve started with your grandkids",                       "type":"longtext", "required":true},
    {"key":"different_than_parent",  "label":"How is grand-parenting different from parenting?",                      "type":"longtext", "required":false},
    {"key":"wisdom",                 "label":"One piece of wisdom you want passed down",                              "type":"longtext", "required":true},
    {"key":"local_spot",             "label":"Your favorite River Region spot to take the grandkids",                 "type":"text",     "required":false}
  ]'::jsonb,
  image_requirements = '{"min_required":1,"max":4,"recommended_count":2,"types":["portrait","grandkids"]}'::jsonb
WHERE submission_type = 'grands-are-the-greatest';

-- Teacher of the Month — multi-nomination compiled into a profile
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'profile',
  interview_template = '[
    {"key":"years_teaching",         "label":"How long have you been teaching, and at this school?",                  "type":"text",     "required":true},
    {"key":"why_teaching",           "label":"Why you chose teaching",                                                "type":"longtext", "required":true},
    {"key":"classroom_philosophy",   "label":"How you''d describe your classroom in one paragraph",                   "type":"longtext", "required":true},
    {"key":"proudest_moment",        "label":"A moment from this year that made it all worth it",                     "type":"longtext", "required":true},
    {"key":"outside_school",         "label":"What you''re into outside of school",                                   "type":"longtext", "required":false},
    {"key":"message_to_families",    "label":"A message to families considering your school",                         "type":"longtext", "required":false}
  ]'::jsonb,
  image_requirements = '{"min_required":1,"max":3,"recommended_count":2,"types":["portrait","classroom"]}'::jsonb
WHERE submission_type = 'teacher-of-the-month';

-- Play Ball — write-up, often the COACH provides answers
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'write-up',
  interview_template = '[
    {"key":"team_and_sport",         "label":"Team name + sport + age group",                                         "type":"text",     "required":true},
    {"key":"season_in_a_sentence",   "label":"This season in one sentence",                                           "type":"longtext", "required":true},
    {"key":"defining_moment",        "label":"The moment you knew this team had something special",                   "type":"longtext", "required":true},
    {"key":"player_to_watch",        "label":"A player whose growth surprised you (with parent permission)",          "type":"longtext", "required":false},
    {"key":"team_culture",           "label":"How would the kids describe the team?",                                 "type":"longtext", "required":false},
    {"key":"upcoming",               "label":"What''s next for the team",                                             "type":"text",     "required":false}
  ]'::jsonb,
  image_requirements = '{"min_required":1,"max":4,"recommended_count":3,"types":["action","team","portrait"]}'::jsonb
WHERE submission_type = 'play-ball';

-- Student Spotlight — interview-based profile of the student
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'profile',
  interview_template = '[
    {"key":"intro",                  "label":"Grade + school + age",                                                  "type":"text",     "required":true},
    {"key":"the_achievement",        "label":"In your own words, what did you do?",                                   "type":"longtext", "required":true},
    {"key":"how_started",            "label":"How did you get started?",                                              "type":"longtext", "required":true},
    {"key":"hardest_part",           "label":"What was the hardest part?",                                            "type":"longtext", "required":true},
    {"key":"someone_who_helped",     "label":"Someone who helped you",                                                "type":"longtext", "required":false},
    {"key":"whats_next",             "label":"What''s next for you?",                                                 "type":"text",     "required":false},
    {"key":"advice_to_kids",         "label":"Advice for kids who want to try something hard",                        "type":"longtext", "required":false}
  ]'::jsonb,
  image_requirements = '{"min_required":1,"max":3,"recommended_count":2,"types":["portrait","activity"]}'::jsonb
WHERE submission_type = 'student-spotlight';

-- Boom Profile — long-form 50+ feature
UPDATE submission_type_columns SET
  needs_outreach     = TRUE,
  article_format     = 'profile',
  interview_template = '[
    {"key":"intro",                  "label":"In one sentence: who are you?",                                         "type":"text",     "required":true},
    {"key":"current_chapter",        "label":"What chapter of life are you in right now?",                            "type":"longtext", "required":true},
    {"key":"biggest_shift",          "label":"The biggest shift since turning 50",                                    "type":"longtext", "required":true},
    {"key":"how_spending_time",      "label":"What you''re spending the most time on these days",                     "type":"longtext", "required":true},
    {"key":"reinvention",            "label":"Are you reinventing yourself in any way?",                              "type":"longtext", "required":false},
    {"key":"local_favorites",        "label":"Local spots you''re into right now",                                    "type":"longtext", "required":false},
    {"key":"give_back",              "label":"How you''re giving back to the community",                              "type":"longtext", "required":false},
    {"key":"wisdom_50plus",          "label":"Something you wish you''d known at 30",                                 "type":"longtext", "required":true},
    {"key":"what_excites",           "label":"What''s exciting you most about this next decade",                      "type":"longtext", "required":true},
    {"key":"family_legacy",          "label":"How you''re thinking about family + legacy",                            "type":"longtext", "required":false}
  ]'::jsonb,
  image_requirements = '{"min_required":2,"max":6,"recommended_count":4,"types":["portrait","candid","activity","family"]}'::jsonb
WHERE submission_type = 'boom-profile';

-- School News — news brief, no outreach (already a press release-style submission)
UPDATE submission_type_columns SET
  needs_outreach     = FALSE,
  article_format     = 'news-brief',
  interview_template = '[]'::jsonb,
  image_requirements = '{"min_required":0,"max":2,"types":["news"]}'::jsonb
WHERE submission_type = 'school-news';

-- Birthday Celebration — photo + caption, no outreach
UPDATE submission_type_columns SET
  needs_outreach     = FALSE,
  article_format     = 'photo-caption',
  interview_template = '[]'::jsonb,
  image_requirements = '{"min_required":1,"max":3,"types":["birthday"]}'::jsonb
WHERE submission_type = 'birthday-celebration';

-- Parent Picks — roundup, no outreach
UPDATE submission_type_columns SET
  needs_outreach     = FALSE,
  article_format     = 'roundup',
  interview_template = '[]'::jsonb,
  image_requirements = '{"min_required":0,"max":4,"types":["place"]}'::jsonb
WHERE submission_type = 'parent-picks';

-- Family Favorites Nomination — roundup-style, no outreach (multi-nominator)
UPDATE submission_type_columns SET
  needs_outreach     = FALSE,
  article_format     = 'roundup',
  interview_template = '[]'::jsonb,
  image_requirements = '{"min_required":0,"max":2,"types":["winner"]}'::jsonb
WHERE submission_type = 'family-favorites-nomination';
