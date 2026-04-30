-- Migration 014: Seed guide_articles for newcomer-guide
-- Run in Supabase SQL editor (Dashboard → SQL editor → New query)
-- Images: copy hero JPGs into /public/images/family-guide/ before launch
--   hero-grandfather-mom-daughter.jpg
--   family-park-frisbee.jpg
--   family-cafe-newcomer.jpg

DELETE FROM guide_articles WHERE guide_slug = 'newcomer-guide';

INSERT INTO guide_articles
  (guide_slug, publication_id, slug, title, excerpt, body, hero_image_url,
   author_name, author_byline, priority, display_order, published, published_at)
VALUES

-- Article 1: Your First 30 Days
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev = 'RRP'),
  'your-first-30-days-in-the-river-region',
  'Your First 30 Days in the River Region: A Family''s Real Checklist',
  'Moving with kids is logistically hard but emotionally harder. Here''s the honest list of what to do in your first month — from establishing a pediatrician to finding your people — written by parents who''ve been here long enough to know what matters.',
  E'Welcome to the River Region. We''re so glad you''re here.\n\nWhether you moved for work, family, or just needed a fresh start, these first weeks can feel like a blur of boxes and paperwork and one small voice asking when their old friends are coming over. We''ve been here. Your real first month doesn''t look like a Pinterest board — it looks like figuring out which grocery store is closest, which urgent care will see kids on a Saturday, and how to find a Sunday morning that feels like home.\n\nHere''s what local families wish they''d known.\n\n## Within Week 1\n\nGet a pediatrician on the calendar. Most practices have wait times for new patients, so don''t wait until your kid spikes a fever. Call the practices listed in our Pediatric Care section — many will tell you over the phone whether they''re accepting new patients.\n\nUpdate your driver''s license. Alabama gives you 30 days. The DMV office in Montgomery on South Boulevard moves faster than you''d expect.\n\nLocate your nearest urgent care that sees kids — not all of them do. We''ve flagged the ones that serve pediatrics in the directory.\n\n## Within the First Month\n\nVisit your nearest library. Don''t underestimate this one. The Montgomery library system has incredible kids'' programming, and the staff at every branch know everyone in the neighborhood.\n\nTry one community thing — a farmer''s market, a story time, a park playgroup. You don''t have to commit. Just show up once. Sometimes one parent saying "hi" at storytime turns into the friendship that makes the whole move worth it.\n\nIdentify a faith community if that''s part of your family''s life. Even visiting two or three before settling in is normal here. Most welcome you with open arms and zero pressure.\n\nStart the conversation about sports leagues. Spring soccer signups happen earlier than you''d think. Fall sports too. The coaches in this area are generous with newcomers — they want your kids to play.\n\n## Within 60–90 Days\n\nFind your village. Mom groups, church small groups, neighborhood Facebook pages — pick one and lean in. The number one regret newcomer families share isn''t "wish we''d picked a different neighborhood." It''s "wish we''d found our people sooner."\n\nTry at least three family activities you''ve never done. The Montgomery Zoo. The Riverwalk. A short drive to Wetumpka. The River Region is small enough to know but big enough to keep surprising you.\n\nAnd if you''re reading this and thinking "I''m so far behind already" — you''re not. Every family who''s lived here a long time started exactly where you are now. We promise.\n\nYou''re going to love it here.',
  '/images/family-guide/hero-grandfather-mom-daughter.jpg',
  'DeAnne Watson',
  'DeAnne Watson, Editor',
  'p0',
  1,
  true,
  now()
),

-- Article 2: Choosing a School District
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev = 'RRP'),
  'choosing-the-right-school-district',
  'Choosing a School in the River Region: An Honest Guide',
  'Six public school districts plus dozens of private and faith-based options. Here''s a parent''s overview of how to think through the choice — and what local families wish they''d known before deciding.',
  E'The single biggest decision most relocating families make isn''t where to live. It''s where their kids will go to school. And in the River Region, that decision is more complex than most people realize when they first start looking.\n\nYou have six public school districts. You have dozens of private schools — many faith-based, some independent, several with strong national reputations. You have homeschool communities that are robust and welcoming. The "right" school depends on your family, not on a ranking.\n\nHere''s how local parents recommend thinking through it.\n\n## Start with the public option in your zip code\n\nEven if you''re leaning private, understand the public option first. It''s your default. Each district has distinct strengths — Pike Road Schools are smaller and consistently top-rated, Montgomery Public Schools have specialty magnet programs, Autauga County Schools serve the Prattville growth corridor, Elmore County Schools cover Wetumpka and Millbrook with a strong neighborhood feel.\n\nVisit the school your kids would attend. Not the district website. The actual building. Walk in. Get a feel.\n\n## If you''re considering private\n\nThe River Region has private schools that have been here for generations — Saint James, Trinity, Alabama Christian, Macon East, Montgomery Catholic. Each has a distinct identity and a real waiting list. Don''t assume anyone has space in March for the next August.\n\nTour at least three. Ask the same questions everywhere: How do you handle a kid who''s struggling? How do you handle a kid who''s bored? What does parent involvement actually look like — not what the brochure says?\n\n## Questions to ask any school you tour\n\n- What''s the average class size in my child''s grade?\n- How do you communicate with parents when something''s going wrong?\n- What''s your approach to social-emotional development, not just academics?\n- What does an average week look like for a kid in this grade?\n- Can I talk to two current parents — one new family and one who''s been here a while?\n\n## Timeline reality check\n\nPrivate schools: Most begin admissions for the next year in October–November. Touring January–February is normal. Decisions usually finalize by March or April. If you''re moving in summer and trying to start in August, expect waiting lists.\n\nPublic schools: You can register at any time once you have a local address.\n\nWhatever you choose, give it a real chance. Schools take a year to feel like home. The kids who struggle most in the first month often become the kids who thrive most by spring.',
  '/images/family-guide/family-park-frisbee.jpg',
  'River Region Parents Editorial Team',
  'River Region Parents Editorial Team',
  'p0',
  2,
  true,
  now()
),

-- Article 3: Establishing Pediatric Care
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev = 'RRP'),
  'establishing-pediatric-care',
  'Finding the Right Pediatrician When You''re New to Town',
  'Establishing pediatric care matters more than newcomers realize — most practices have wait times, vaccine schedules can''t wait, and finding the right fit is harder than finding adult primary care. Here''s what local families wish they''d known.',
  E'When you''re packing boxes and forwarding mail, "find a pediatrician" feels like something to deal with later. It''s not. Most pediatric practices in the River Region have a waiting period for new patients — sometimes a few weeks, sometimes longer. Vaccine schedules don''t pause because you moved. And finding a practice that fits your family is harder than finding adult primary care, because you''re not just choosing a doctor — you''re choosing the place where your kid will be seen for the next decade.\n\nHere''s how to think about it.\n\n## Start the search before you arrive if you can\n\nIf you have a few weeks of notice, call ahead. Many practices will start the new-patient enrollment process before your move-in date. Some will request your kids'' records be transferred from your previous pediatrician — handle that in advance and you save weeks.\n\n## Know what kind of practice fits\n\nSolo practices are smaller and more personal. You see the same doctor every time. You also wait longer when that doctor is sick or on vacation.\n\nGroup practices have multiple pediatricians sharing call. You may not see "your" doctor for a sick visit, but you can usually get in same-day. Most families with multiple kids end up preferring group practices for the flexibility.\n\nHospital-affiliated practices have direct connections to specialists when something more complicated comes up. Not as warm but very efficient.\n\n## Questions to ask when you''re calling around\n\n- Are you currently accepting new patients?\n- Do you take our insurance? (Have your card in hand.)\n- What''s your same-day sick visit policy?\n- Who covers calls after hours and on weekends?\n- Do you have separate well-child and sick-child waiting areas?\n- What''s your average wait time for a scheduled appointment?\n\n## Don''t forget pediatric dental and orthodontic care\n\nPediatric dentistry is its own specialty. Most family dentists will see kids, but pediatric dentists are trained specifically for the under-12 set and have offices designed for it. The American Academy of Pediatrics recommends a first dental visit by age one. We know — that sounds aggressive. But the dentists trained for it make it easy.\n\nOrthodontic conversations usually start around age 7–9, even if no actual treatment happens until later. Don''t delay that consultation just because your kid still has baby teeth.\n\n## Specialists are nearby — not always local\n\nFor most pediatric specialty needs (allergy, GI, ENT, ortho), the River Region has options. For some specialties, families travel to Birmingham. Your pediatrician will know who to refer to, but it''s worth asking up front about the practice''s referral patterns. If you have specific needs already — speech therapy, occupational therapy, mental health — search the directory specifically for those.\n\nYou''re going to figure this out. Most of us did it the hard way. You don''t have to.',
  '/images/family-guide/family-cafe-newcomer.jpg',
  'River Region Parents Editorial Team',
  'River Region Parents Editorial Team',
  'p0',
  3,
  true,
  now()
),

-- Article 4: Where to Find Your People
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev = 'RRP'),
  'where-to-find-your-people',
  'Where to Find Your People: A Newcomer''s Honest Guide to Community',
  'Moving with kids is logistically hard but emotionally harder. The number one regret newcomer families share isn''t where they moved — it''s not finding their people sooner. Here''s where to start looking.',
  E'When my husband and I moved with three kids and the boxes were finally unpacked, I sat down on a Sunday afternoon and realized I didn''t know a single person in our new town. Not one. The grocery store cashier had been kinder to me than anyone I''d actually had a conversation with all week.\n\nThat afternoon stuck with me. And it''s the thing I tell every newcomer family I meet: the hardest part of moving isn''t the logistics. It''s the loneliness. The good news is — your people are here. You just have to look in a few specific places.\n\n## Start with one mom group\n\nThe River Region has dozens. MOPS chapters at the bigger churches. MOMS Club International chapters. Neighborhood Facebook groups (search "[your neighborhood] moms" — every neighborhood has one). Church small groups for moms with young kids. The Mom-to-Mom group at most major churches.\n\nYou don''t have to love the first one. You''re trying them on. Visit two or three before deciding which feels like home.\n\n## Faith communities are still where many local families connect\n\nEven if you''re not particularly religious, this is honest information about the River Region: most lifelong friendships among local families started at church. Pick one in your neighborhood and visit on a Sunday. Most have a "welcome desk" where someone will introduce themselves. Most have kids'' programming during the service so you can actually focus.\n\nIf church isn''t for you, that''s okay too — but be intentional about the alternative. The River Region YMCA, the Montgomery Public Library system, neighborhood walking groups, and rec leagues all serve as community anchors.\n\n## Sports and activities are friendship factories\n\nSpring soccer, fall flag football, year-round gymnastics, theater programs, scouts. Sign up for one. You''ll see the same parents on the sidelines week after week, and "nice catch out there" eventually becomes "want to grab coffee while they practice?"\n\nDon''t underestimate this one. Some of my closest friendships started with a folding chair at a Saturday morning soccer game.\n\n## Volunteer somewhere — together\n\nFamily Sunshine Center, Common Ground, Hands On River Region, Saint Vincent de Paul, Habitat for Humanity. Take your kids to volunteer somewhere once a month. The families who show up regularly become a community fast — and your kids learn that this is what their family does.\n\n## Your neighbor is probably amazing\n\nThis is the simplest thing and the one most newcomers skip. Walk over. Introduce yourself. Bring something baked if you bake. The River Region is genuinely a place where neighbors still know each other, and your willingness to take the first step makes you the family everyone is glad moved in.\n\nYour people are out there. We promise. Start with one place this week.',
  '/images/family-guide/family-park-frisbee.jpg',
  'Sarah Lyons',
  'Sarah Lyons, Contributing Writer',
  'p0',
  4,
  true,
  now()
),

-- Article 5: Where Locals Take Kids on Saturday
(
  'newcomer-guide',
  (SELECT id FROM publications WHERE abbrev = 'RRP'),
  'where-locals-take-their-kids-on-saturday',
  'Where Locals Actually Take Their Kids on a Saturday',
  'The insider list. Not the tourist version. Where lifelong River Region families spend the weekend when they want a guaranteed-good day with the kids — and what to skip even though it sounds great.',
  E'Every newcomer family asks the same question by their second weekend: where do we go? The official tourism guide has a list. The locals'' list is different. Here''s the honest version from families who''ve lived here long enough to have favorites.\n\n## When the weather''s good\n\n**The Riverwalk in downtown Montgomery.** Free. Stroller-friendly. The fountain area is genuinely beautiful, and there''s almost always something happening — farmer''s market, festival, concert series in summer. Pack a picnic and you''ve got a morning.\n\n**The Montgomery Zoo and Mann Wildlife Learning Museum.** Yes, the locals still go. Annual passes pay for themselves in two visits. The wildlife museum next door is included with admission and is genuinely cool — kids love it more than the zoo half the time.\n\n**Wetumpka.** A 30-minute drive that feels like a day trip. The downtown is charming, the river is gorgeous, and Sweet Creek Farm Market in nearby Pike Road is the perfect lunch stop on the way home.\n\n**Lake Martin or Smith Lake.** Worth the hour-plus drive on a Saturday. Pack the day. There are public access points and family-friendly beaches if you don''t have lake-house friends yet.\n\n## When the weather''s bad\n\n**The Montgomery Public Library system.** Saturday programs at the central branch and the bigger neighborhood branches are excellent. Story time, craft hours, sometimes magicians or musicians. Free.\n\n**Indoor options.** When the heat or rain is too much, rotating indoor venues — climbing gyms, trampoline parks, indoor play cafes — are everywhere. Mellow Mushroom Pike Road, Tipping Point Hampstead, and Sweet Creek''s café all have garden areas that work even in light rain.\n\n**Children''s Museum of the Magic City.** A drive to Birmingham, but Saturday morning + lunch + drive home is a perfect kids-tired-by-bedtime day.\n\n## Things that sound great but locals quietly skip\n\nWe''re not going to name names. But ask any longtime River Region family what they''d warn newcomers away from, and you''ll hear the same handful of answers: skip the chain restaurants except as a backup. Skip the "tourist trap" attractions in nearby cities and find the local version. Skip anything that requires you to drive over 90 minutes if you have kids under 5 — you''ll regret it.\n\nBuild your own list of favorites. Some of the best Saturdays we''ve had as a family were random — a new ice cream shop, a friend''s backyard, a free festival nobody promoted. The River Region rewards families who explore it.',
  '/images/family-guide/family-park-frisbee.jpg',
  'River Region Parents Editorial Team',
  'River Region Parents Editorial Team',
  'p1',
  5,
  true,
  now()
);
