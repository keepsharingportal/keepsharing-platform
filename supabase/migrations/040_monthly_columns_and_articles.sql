-- Migration 040 v2: Establish 6 monthly columns + seed May 2026 articles
-- v2 fix: guide_articles.slug has no UNIQUE constraint, so ON CONFLICT (slug)
-- doesn't work. Replaced with INSERT...WHERE NOT EXISTS pattern.
-- monthly_columns.slug IS a PRIMARY KEY so ON CONFLICT works there.

-- ── ALTER guide_articles to add column metadata ──
ALTER TABLE guide_articles
  ADD COLUMN IF NOT EXISTS column_slug TEXT,
  ADD COLUMN IF NOT EXISTS author_bio TEXT,
  ADD COLUMN IF NOT EXISTS issue_month INT,
  ADD COLUMN IF NOT EXISTS issue_year INT;

CREATE INDEX IF NOT EXISTS idx_articles_column ON guide_articles(column_slug, editorial_review_status);
CREATE INDEX IF NOT EXISTS idx_articles_issue ON guide_articles(issue_year, issue_month);

-- ── Monthly columns reference table (slug is PRIMARY KEY → ON CONFLICT works) ──
CREATE TABLE IF NOT EXISTS monthly_columns (
  slug              TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  description       TEXT,
  default_author    TEXT,
  category          TEXT,
  display_order     INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO monthly_columns (slug, display_name, description, default_author, category, display_order) VALUES
('mom-to-mom',           'Mom to Mom',                  'Monthly interview with a local mom — career, kids, what makes her tick.',                NULL,                       'parenting',  1),
('grands-greatest',      'Grands are the Greatest',     'Celebrating grandparents and the role they play in River Region families.',              'Kimberley Carter Spivey',  'family',     2),
('teacher-of-month',     'Teacher of the Month',        'Recognizing excellent local educators making a difference.',                              NULL,                       'education',  3),
('meeting-kids',         'Meeting Kids Where They Are', 'Therapy and child-development insights from Works of Wonder Therapy.',                   'Works of Wonder Therapy',  'health',     4),
('dave-says',            'Dave Says',                   'Family finance and budgeting advice from Dave Ramsey.',                                  'Dave Ramsey',              'finance',    5),
('teens-tweens-screens', 'Teens, Tweens & Screens',     'Navigating screens, social media, and digital wellness with kids.',                       'Kristi Bush, LSW',         'parenting',  6)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed first articles from May 2026 issue ──
-- guide_articles.slug has no unique constraint, so we use WHERE NOT EXISTS
-- to make each INSERT idempotent.

-- Mom to Mom: Hayley Denny
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, author_name, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Hayley Denny: Faith, Family, and Finding Balance as a Working Mom',
  'mom-to-mom-hayley-denny-may-2026',
  'newcomer',
  'mom-to-mom',
  'River Region Parents',
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop',
  'This month''s Mom to Mom interview features Hayley Denny, Controller at Hill Hill Carter and mom of three. She talks about navigating blended family life, the joys and challenges of motherhood, and how faith and gratitude shape her parenting.',
  'Hayley Denny serves as the Controller at Hill Hill Carter in Montgomery, where she has been for over eight years. It''s a full-time role that keeps her busy, but she stays involved in her daughter''s school whenever she can. "Even small moments of showing up matter to me, whether it''s helping out at an event or just being present when needed."

She has three children and one grandchild who has added a new dynamic to her family. Her oldest is her stepdaughter, Brantley, who is 23. Then there''s her son, John David, who is 20, and her youngest, Campbell, who is 18. They also have a 2-year-old granddaughter — John David''s daughter — who is with them about half the time.

"Being a mom is harder than any job I''ve ever had, but it''s also the most rewarding," Hayley says. "Each stage of parenting brings its own challenges, and when you think you''ve figured it out, everything changes."

What has motherhood taught her? "Each child is unique, and an approach that works for one may not be effective for another. I''ve also learned that kids are more resilient than we sometimes give them credit for. Decisions that feel overwhelming as a parent often don''t affect them as deeply as we expect."

On her parenting style: "It has evolved over time and often depends on each child''s personality and the situation at hand. I''ve learned to adjust my approach as needed, trying to meet each of my children where they are. More than anything, I''ve focused on being consistent, supportive, and present — especially during moments that felt uncertain or challenging."

What values matter most to pass on? "Faith and gratitude are at the center of everything. I want my children to appreciate their blessings and turn to prayer during challenging times. I also believe strongly in honesty, respect, and the importance of family. No matter what, we show up for each other."

Hayley Denny has been married to her husband, Lide Denny, for 11 years. They live in the Hillwood area of Montgomery and have three children.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'mom-to-mom-hayley-denny-may-2026');

-- Grands are the Greatest: Janice Shepard
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, author_name, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Janice Shepard: 32 Years Teaching, Nine Grandchildren, One Big Heart',
  'grands-greatest-janice-shepard-may-2026',
  'newcomer',
  'grands-greatest',
  'Kimberley Carter Spivey',
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1581579438747-104c53e7c2e1?w=1200&q=80&auto=format&fit=crop',
  'After a 32-year teaching career, Janice Shepard now spends most of her time with her nine grandchildren — ages 1 to 15. She talks about staying connected, family traditions, and the names her grandkids call her.',
  'After a 32-year teaching retirement, Janice enjoys spending most of her time with her grandchildren. She has nine grandchildren, ranging in ages from 1 to 15, and they truly keep her life full and busy in the best way.

"I babysit my younger grandchildren, and that''s something I truly enjoy," Janice says. "It gives me the chance to spend quality time with them, have fun, and watch them grow. Those everyday moments mean so much to me."

Her older grandchildren are very active in sports like basketball, football, and track. She supports them by attending their events and playing basketball with them. "It''s a fun way to stay connected and involved in their lives."

Family gatherings happen for all occasions — holidays, birthdays, and just because. "Those times are very special to me. It''s when we all come together, share stories, laugh, and enjoy each other''s company."

Being a Head Start teacher taught her many valuable lessons about patience, understanding, and meeting children where they are. "I also grew up babysitting, so caring for children has always been a passion of mine. All of that has helped shape how I care for my grandchildren today."

Her grandchildren especially love her fried chicken and spaghetti. The family also loves taking summer vacations to the beach. "It''s something we all look forward to every year. It gives us time to relax, have fun, and make lasting memories together."

Most importantly, Janice teaches her grandchildren to be kind, to respect and obey their elders, and to understand the importance of going to church. "I want them to build a strong relationship with God and carry those values with them throughout their lives."

They call her "Ma" and "Memaw," and she absolutely loves it. "Those names mean everything to me because they represent the love and bond we share. Every time I hear them say it, it reminds me of the special role I play in their lives and the connection we''ve built over the years."

Janice Shepard is widowed and resides in Montgomery, AL.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'grands-greatest-janice-shepard-may-2026');

-- Teacher of the Month: Bebe Campbell
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, author_name, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Teacher of the Month: Bebe Campbell, The Montgomery Academy',
  'teacher-bebe-campbell-may-2026',
  'private-school',
  'teacher-of-month',
  'River Region Parents',
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80&auto=format&fit=crop',
  'For this Montgomery Academy first-grade teacher, the journey to the classroom has been shaped by both purpose and personal connection. Meet Bebe Campbell.',
  'For this Montgomery Academy first-grade teacher, the journey to the classroom has been shaped by both purpose and personal connection. Her interest in the school began when her own children enrolled — one entering kindergarten and the other soon to follow. Teaching at the same school offered a meaningful way to be present in their daily lives while pursuing a career she had long felt called to.

Bebe earned a Bachelor''s degree in Psychology from Auburn University and a Master of Arts in Teaching in Elementary Education from the University of South Florida, in her hometown of Tampa. While her education prepared her for the classroom, it was her passion for working with children that confirmed her path.

She enjoys creating engaging lessons and working one-on-one with students to meet their individual needs. Meeting students where they are and understanding their needs allows her to create a roadmap for success for each student.

First grade remains her favorite level to teach because of the remarkable growth that takes place during the year. Students enter with curiosity and excitement, and she takes pride in helping them build confidence as readers, writers, and problem-solvers. She is equally committed to supporting their social and emotional development.

Her work extends well beyond the classroom. Teaching requires thoughtful planning, flexibility, and ongoing collaboration with families and colleagues. Her goals include strengthening foundational skills in reading, writing, and math, fostering a love of learning, and supporting students'' overall growth.

Bebe Campbell is married to Harrison Campbell, and they will celebrate their 20th anniversary this May. They have two daughters, Lola, a junior, and Elizabeth, a freshman, both of whom attend Montgomery Academy.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'teacher-bebe-campbell-may-2026');

-- Teens, Tweens & Screens: AI and Attention
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, author_name, author_bio, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'AI Technology Is Capturing Your Child''s Attention — And It''s Personal',
  'teens-screens-ai-attention-may-2026',
  'newcomer',
  'teens-tweens-screens',
  'Kristi Bush, LSW',
  'Kristi Bush serves as a national education consultant and social media safety advocate. She is a licensed social worker with greater than 15 years of clinical practice and health care experience.',
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80&auto=format&fit=crop',
  '"All you have to do to understand the future of AI is to understand the incentives." Kristi Bush unpacks how attention-economy AI is targeting kids — and what parents can do.',
  '"All you have to do to understand the future of AI is to understand the incentives."

I recently listened to a podcast where Oprah Winfrey interviewed a representative from the Center for Humane Technology. That line stood out to me. If I''m being honest, the entire conversation stood out. But this particular thought lingered.

I''ve found myself using AI more frequently as a thought companion, a research assistant, an elevated version of Google. The idea of using AI to fully write articles or books still makes my writer''s heart seize a bit. But as a tool, it''s undeniably useful.

There is, however, something that began to catch my attention. If you''ve used AI, you''ve likely noticed it. The conversation never quite ends. There is always another question. Another suggestion. Another "Would you like to explore that further?" It''s subtle, but persistent.

To understand the future of AI, you have to understand the incentives. Social media companies do not primarily make money through subscriptions or direct payments. They make money through attention. The longer you stay on a platform, the more content you consume, the more advertisements you see, and the more valuable you become.

Around 2012 and 2013, something shifted. Social media platforms moved away from being simple communication tools and began evolving into attention-optimizing systems. Companies began competing not just to attract users, but to keep them engaged longer. Notifications became less informational and more psychological. A like, a comment, or a new follower taps into something deeply human: our desire for belonging, validation, and connection.

Artificial intelligence takes this even further. AI doesn''t just respond to behavior — it predicts it. It analyzes patterns, adapts in real time, and creates experiences that become increasingly difficult to disengage from. The goal is engagement. But when engagement drives revenue, technology naturally evolves to maximize it.

This becomes particularly important when we consider children and teenagers. Developing brains are especially sensitive to novelty, reward, and social feedback. Adolescents are navigating identity formation, belonging, and comparison. When platforms are designed to hold attention, young users are especially vulnerable.

The issue is not simply that kids are distracted. It is that they are growing up inside systems designed to capture their attention. That distinction matters. It moves our conversation away from blame and toward understanding. When we understand the environment students are growing up in, we can respond more thoughtfully — focusing not just on limiting technology, but on helping young people develop awareness, resilience, and balance.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'teens-screens-ai-attention-may-2026');

-- Feature: Inexpensive Micro Summer Adventures
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, author_name, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Inexpensive Micro Summer Adventures',
  'micro-summer-adventures-may-2026',
  'summer-fun',
  NULL,
  'Shannon Dean',
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=1200&q=80&auto=format&fit=crop',
  'A meaningful summer isn''t built on spectacle. It''s built on shared laughter, predictable rituals, and moments where everyone feels a little less rushed.',
  'Let your child plan a "Yes Hour." Within reasonable limits, say yes to their ideas for sixty minutes. Children feel powerful when they''re invited to lead.

THE POWER OF PREDICTABLE RITUALS

While novelty sparks excitement, repetition builds memory. When something happens every week, children begin to anticipate it. Anticipation creates its own kind of joy.

Maybe Friday becomes "Movie Night Outside," with blankets in the yard and a simple projector. Maybe Tuesday is Taco or Pizza Night, and everyone assembles their own plate. Maybe Sunday evenings include a short "Summer Reflection," where each family member shares their favorite moment of the week.

These rituals don''t cost much. But they tell children: This season is special. We are marking it together. In a world that often moves too fast, that sense of marking time can feel fantastic.

ONE-ON-ONE MICRO MOMENTS

For working parents, the guilt can feel heavy. We may worry we aren''t doing enough. But connection doesn''t require hours. It requires presence.

Invite one child to run a quick errand with you and stop for a small treat afterward. Read one chapter outside together before bed. Take a ten-minute bike ride around the block. Just the two of you. These small moments communicate that your child matters enough for you to pause.

RELEASING THE PRESSURE

It''s easy to feel as though everyone else is doing more. Social media can amplify the highlight reels of beach trips, elaborate camps, and cross-country adventures.

But comparison has a way of stealing the joy from what is already good. A meaningful summer isn''t built on spectacle. It''s built on shared laughter, predictable rituals, and moments where everyone feels a little less rushed.

When we let go of the idea that summer must be extravagant, we make space for it to be personal. Often, the summers children remember most clearly aren''t the biggest ones. They''re the ones where someone said, "Let''s go outside," and meant it.

Shannon Dean is a freelance writer and the mother of two sons. She specializes in writing about families and women''s health.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'micro-summer-adventures-may-2026');

-- Feature: Secrets to Successful College Visits
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Secrets to Successful College Visits: 12 Tips for Your Best Tour',
  'college-visits-12-tips-may-2026',
  'private-school',
  NULL,
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&q=80&auto=format&fit=crop',
  'This summer and fall, thousands of teens and their families will tour college campuses. Signing up for the official tour is just the start — here''s what else parents and students can do.',
  'This summer and fall, thousands of teens and their families will tour college campuses. Signing up for the official tour is the obvious first step, but what else can parents and students do to prepare for and make the most of these important visits?

1. BEFORE TOURS, DISCUSS YOUR TEEN''S VALUES. Help them clarify their Why for attending college. College consultant Dr. Steven Antonoff offers free, downloadable tools to help families start the discussion.

2. ENGAGE WITH A DIVERSE RANGE OF PEOPLE BEYOND THE SCRIPTED TOUR. Ask at least three current students questions about their campus experiences. Get specific. Instead of "What''s the social scene like?" ask "What did you do last weekend?" Instead of "How many majors are there?" ask "Do counselors help freshmen sign up for classes?"

3. SIT IN ON A CLASS THAT INTERESTS YOU.

4. ASK LOTS OF QUESTIONS ABOUT DORMS. Housing can be stressful. Ask about availability of on-campus housing beyond freshman year. If not guaranteed, what''s the process to obtain off-campus housing? How far in advance do students typically plan?

5. OBSERVE HOW PEOPLE GET AROUND CAMPUS. Are they riding bikes? Taking the bus? Walking? Is the campus walkable to local shopping and dining? Is there a free campus shuttle to town?

6. BE A PEOPLE WATCHER. What are your impressions of the student body? Is there a fun, positive vibe or do people look stressed and exhausted? Can you see yourself happily fitting in?

7. SAFETY MEASURES MATTER. Look for emergency call boxes. Ask if there are campus security escorts or free shuttles available at night.

8. EAT IN THE DINING HALL. How well do they accommodate dietary preferences or needs? Can meal plans be used at cafes campuswide?

9. TAKE PHOTOS to help you remember key positives and negatives about each campus. Use a tracker to record your impressions.

10. VISIT THE CAREER CENTER. Ask questions about internship placement and post-graduation outcomes.

11. CHECK THE LIBRARY AND STUDY SPACES. Are they used? Do they look like places students actually want to be?

12. DEBRIEF AS A FAMILY. After each visit, talk together about what stood out — both positives and negatives.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'college-visits-12-tips-may-2026');

-- Feature: Why We Love Mothers
INSERT INTO guide_articles (
  title, slug, guide_slug, column_slug, issue_month, issue_year,
  source_issue_month, editorial_review_status, published, published_at,
  hero_image_url, excerpt, body, created_at
)
SELECT
  'Why We Love Mothers: Plus How to Make Her Feel Truly Seen on Mother''s Day',
  'why-we-love-mothers-may-2026',
  'newcomer',
  NULL,
  5, 2026,
  '2026-05-01',
  'approved',
  true,
  NOW(),
  'https://images.unsplash.com/photo-1591348278863-a8fb3887e2aa?w=1200&q=80&auto=format&fit=crop',
  'A heartfelt reminder of the many roles mothers play — cheerleader, problem-solver, chauffeur, comfort-giver — and how to make her feel truly seen this Mother''s Day.',
  'Mothers wear more hats in a single day than most professionals wear in a year. Cheerleader at the soccer game. Problem-solver when the science project falls apart at 9 PM. Chauffeur to dance, baseball, and the orthodontist. Comfort-giver after the bad day at school. The roles are endless — and so is the love that drives each one.

THE 10 THINGS WE LOVE MOST ABOUT MOMS

1. SHE NEVER STOPS BELIEVING IN YOU. Even when you''re convinced you can''t. Especially then.

2. SHE REMEMBERS EVERYTHING. The exact way you like your sandwich cut. The name of your second-grade teacher. The thing you said you wanted three Christmases ago.

3. SHE SHOWS UP. To recitals. To games. To award ceremonies. To the principal''s office when needed.

4. SHE LISTENS. Really listens. Not while folding laundry or scrolling her phone — she stops, looks at you, and hears what you''re actually saying.

5. SHE TURNS ORDINARY MOMENTS INTO TRADITIONS. Sunday pancakes. The "you''re-having-a-rough-day" cookies. The way she always sings the wrong words to that one song.

6. SHE TELLS YOU THE TRUTH. Even when it''s hard. Especially when it''s hard.

7. SHE FORGIVES FAST. Whatever it was, she let it go before you finished apologizing.

8. SHE ADVOCATES FOR YOU. To teachers, doctors, coaches, anyone who underestimates you.

9. SHE LAUGHS AT YOUR JOKES. Even the bad ones. Especially the bad ones.

10. SHE LOVES YOU UNCONDITIONALLY. No performance required. No version of you is more deserving than another. She loves the whole you.

HOW TO MAKE HER FEEL TRULY SEEN ON MOTHER''S DAY

Skip the generic flowers (or pair them with something more specific). Write her a handwritten note about ONE specific moment you remember her showing up for you. Make her favorite breakfast — and clean up the kitchen afterward. Plan something she actually wants to do, not what you assume she wants. Most importantly: tell her, in plain words, what she means to you. She knows. But hearing it lands differently.',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM guide_articles WHERE slug = 'why-we-love-mothers-may-2026');

-- ── Verification queries (run separately after this migration succeeds) ──
-- SELECT slug, display_name FROM monthly_columns ORDER BY display_order;
-- SELECT slug, column_slug, author_name, issue_year FROM guide_articles WHERE issue_year = 2026 ORDER BY column_slug;