-- Migration 080: Brain Games
-- Two tables drive the Weekly Challenge:
--   game_content : the growing pool of words, trivia, emoji puzzles, etc.
--                  Site picks deterministically by ISO week number, so the
--                  same week shows the same content for everyone and content
--                  rotates automatically every Sunday morning.
--   game_scores  : every submission. Drives the leaderboard, the monthly
--                  prize drawing, and the GHL list-growth funnel.

-- ── Content pool ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type    TEXT NOT NULL,             -- 'word-search' | 'trivia' | 'scramble' | 'memory' | 'emoji' | 'math'
  difficulty   TEXT NOT NULL,             -- 'easy' | 'challenging' | 'brain-squeezing'
  payload      JSONB NOT NULL,            -- shape varies by game_type (see seeded examples)
  weight       INT  DEFAULT 1,            -- higher = more likely to appear; 0 = retired
  notes        TEXT,                      -- admin notes ("hard, kid-tested ok", "broken — fix")
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_content_active
  ON game_content (game_type, difficulty, weight)
  WHERE weight > 0;

-- ── Score submissions / leads ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type       TEXT NOT NULL,
  difficulty      TEXT NOT NULL,
  score           INT  NOT NULL,
  max_score       INT,                      -- for anti-cheat — server-computed ceiling
  duration_seconds INT,
  -- The week the player was actually playing — drives the leaderboard window
  iso_week        INT  NOT NULL,
  iso_year        INT  NOT NULL,
  -- Submitter info (lead capture)
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  market          TEXT NOT NULL DEFAULT 'rrp',
  -- GHL acknowledgement
  ghl_response    JSONB,
  ghl_status      TEXT DEFAULT 'pending',   -- 'pending' | 'sent' | 'failed'
  -- Audit
  user_agent      TEXT,
  ip_hash         TEXT,                     -- one-way hashed; for rough dedup of obvious cheating
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_scores_week
  ON game_scores (market, iso_year, iso_week, score DESC);

CREATE INDEX IF NOT EXISTS idx_game_scores_recent
  ON game_scores (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_scores_email
  ON game_scores (lower(email));

-- ── Touch-updated_at trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION game_content_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_game_content_updated_at ON game_content;
CREATE TRIGGER trg_game_content_updated_at
  BEFORE UPDATE ON game_content
  FOR EACH ROW EXECUTE FUNCTION game_content_touch_updated_at();

-- ── Seed pool from the AI Studio version ────────────────────────────────────
-- One row per item. The site mixes these per-week based on the ISO week number,
-- so a pool of 10 per (game, difficulty) gives infinite variety once the admin
-- adds more entries over time.

-- SCRAMBLE — easy
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('scramble', 'easy', '{"scrambled":"FEECOF","answer":"COFFEE"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"HOOSCL","answer":"SCHOOL"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"DDTREOL","answer":"TODDLER"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"KNSCA","answer":"SNACK"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"PNA","answer":"NAP"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"LPYA","answer":"PLAY"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"MIFALY","answer":"FAMILY"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"PKA","answer":"PARK"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"HMOE","answer":"HOME"}'::jsonb),
  ('scramble', 'easy', '{"scrambled":"LVE","answer":"LOVE"}'::jsonb);

-- SCRAMBLE — challenging
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('scramble', 'challenging', '{"scrambled":"TEBIMED","answer":"BEDTIME"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"AERYCAD","answer":"DAYCARE"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"AETRHEC","answer":"TEACHER"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"IEACPIFR","answer":"PACIFIER"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"RSLORTEL","answer":"STROLLER"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"PIDSRAE","answer":"DIAPERS"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"OMFURAL","answer":"FORMULA"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"BAETHLN","answer":"BLANKET"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"OYLRPGA","answer":"PLAYPEN"}'::jsonb),
  ('scramble', 'challenging', '{"scrambled":"WIPES","answer":"WIPES"}'::jsonb);

-- SCRAMBLE — brain-squeezing
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('scramble', 'brain-squeezing', '{"scrambled":"TDRIAIPEAICN","answer":"PEDIATRICIAN"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"EXLTAUTRRARIUCCR","answer":"EXTRACURRICULAR"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"KEBEHDCORO","answer":"CHECKBOOK"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"IARCPOTOL","answer":"CARPOOL"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"NTKREIENRDAG","answer":"KINDERGARTEN"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"MEWRKHOO","answer":"HOMEWORK"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"TIVIACSTIE","answer":"ACTIVITIES"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"SDIELCPIIN","answer":"DISCIPLINE"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"LSOECUHD","answer":"SCHEDULE"}'::jsonb),
  ('scramble', 'brain-squeezing', '{"scrambled":"TIRUNO","answer":"ROUTINE"}'::jsonb);

-- TRIVIA — easy
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('trivia','easy','{"q":"At what age do most babies take their first steps?","options":["6-8 months","9-15 months","16-20 months","2 years"],"a":"9-15 months"}'::jsonb),
  ('trivia','easy','{"q":"Which of these is a common teething symptom?","options":["Sleeping more","Loss of appetite","Drooling","Fast hair growth"],"a":"Drooling"}'::jsonb),
  ('trivia','easy','{"q":"What is the average weight of a newborn?","options":["5.5 lbs","7.5 lbs","9.5 lbs","10 lbs"],"a":"7.5 lbs"}'::jsonb),
  ('trivia','easy','{"q":"How many bones does a baby have at birth?","options":["206","250","300","350"],"a":"300"}'::jsonb),
  ('trivia','easy','{"q":"What color is a newborn''s first vision mostly limited to?","options":["Blue and yellow","Red and green","Black, white, and gray","Full color"],"a":"Black, white, and gray"}'::jsonb),
  ('trivia','easy','{"q":"At what age do babies usually start saying their first words?","options":["6-8 months","9-14 months","15-18 months","2 years"],"a":"9-14 months"}'::jsonb),
  ('trivia','easy','{"q":"What is the soft spot on a baby''s head called?","options":["Cranium","Fontanelle","Crown","Apex"],"a":"Fontanelle"}'::jsonb),
  ('trivia','easy','{"q":"How many hours a day does a newborn typically sleep?","options":["8-10 hours","12-14 hours","16-17 hours","20-22 hours"],"a":"16-17 hours"}'::jsonb),
  ('trivia','easy','{"q":"Which sense is fully developed at birth?","options":["Sight","Hearing","Smell","Taste"],"a":"Hearing"}'::jsonb),
  ('trivia','easy','{"q":"What is the term for a baby''s first poop?","options":["Meconium","Colostrum","Bilirubin","Lanugo"],"a":"Meconium"}'::jsonb);

-- TRIVIA — challenging
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('trivia','challenging','{"q":"What is the most common time of day for babies to be born?","options":["Midnight to 6 AM","8 AM to Noon","Noon to 6 PM","6 PM to Midnight"],"a":"8 AM to Noon"}'::jsonb),
  ('trivia','challenging','{"q":"How many diapers does an average baby use in their first year?","options":["1,500","2,500","3,500","4,500"],"a":"2,500"}'::jsonb),
  ('trivia','challenging','{"q":"At what age do babies typically develop their permanent eye color?","options":["At birth","3 months","6-9 months","1-2 years"],"a":"6-9 months"}'::jsonb),
  ('trivia','challenging','{"q":"Which of these reflexes is present at birth?","options":["Rooting reflex","Parachute reflex","Landau reflex","Pincer grasp"],"a":"Rooting reflex"}'::jsonb),
  ('trivia','challenging','{"q":"What is the average age for a child to be fully potty trained during the day?","options":["18 months","2 years","2.5 to 3 years","4 years"],"a":"2.5 to 3 years"}'::jsonb),
  ('trivia','challenging','{"q":"How much does a typical 1-year-old weigh compared to their birth weight?","options":["Double","Triple","Quadruple","Same"],"a":"Triple"}'::jsonb),
  ('trivia','challenging','{"q":"When do most babies start sleeping through the night (6-8 hours)?","options":["1 month","3-6 months","9 months","1 year"],"a":"3-6 months"}'::jsonb),
  ('trivia','challenging','{"q":"What is the first sense a baby develops in the womb?","options":["Sight","Hearing","Touch","Taste"],"a":"Touch"}'::jsonb),
  ('trivia','challenging','{"q":"How many teeth does a full set of primary (baby) teeth include?","options":["16","20","24","32"],"a":"20"}'::jsonb),
  ('trivia','challenging','{"q":"At what age can most babies sit up without support?","options":["3-4 months","5-7 months","8-10 months","12 months"],"a":"5-7 months"}'::jsonb);

-- TRIVIA — brain-squeezing
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('trivia','brain-squeezing','{"q":"What is the medical term for a baby''s first poop?","options":["Meconium","Colostrum","Bilirubin","Lanugo"],"a":"Meconium"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"Which vitamin is typically given as a shot right after birth?","options":["Vitamin A","Vitamin B12","Vitamin C","Vitamin K"],"a":"Vitamin K"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"What percentage of babies are actually born on their exact due date?","options":["5%","15%","25%","40%"],"a":"5%"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"What is the name of the fine hair that covers a fetus in the womb?","options":["Vernix","Lanugo","Vellus","Cilia"],"a":"Lanugo"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"At what age do babies typically lose their Moro (startle) reflex?","options":["1 month","3-4 months","6 months","9 months"],"a":"3-4 months"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"How many extra calories does a breastfeeding mother typically need per day?","options":["200-300","400-500","600-700","800-1000"],"a":"400-500"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"What is the waxy white substance covering a newborn''s skin called?","options":["Lanugo","Sebum","Vernix caseosa","Milia"],"a":"Vernix caseosa"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"At what age is it generally recommended to introduce solid foods?","options":["3 months","4 months","6 months","9 months"],"a":"6 months"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"What is the most common cause of a baby''s diaper rash?","options":["Teething","Food allergies","Prolonged wetness","Antibiotics"],"a":"Prolonged wetness"}'::jsonb),
  ('trivia','brain-squeezing','{"q":"How many diapers does a newborn typically go through in a day?","options":["4-6","8-12","15-20","20+"],"a":"8-12"}'::jsonb);

-- EMOJI DECODE — easy
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('emoji','easy','{"emoji":"👶🍼💤","answer":"NAPTIME"}'::jsonb),
  ('emoji','easy','{"emoji":"🚗🏫🎒","answer":"CARPOOL"}'::jsonb),
  ('emoji','easy','{"emoji":"😭🦷👶","answer":"TEETHING"}'::jsonb),
  ('emoji','easy','{"emoji":"🎨👕🧺","answer":"LAUNDRY"}'::jsonb),
  ('emoji','easy','{"emoji":"☕🧟‍♀️🏃‍♀️","answer":"MOM LIFE"}'::jsonb),
  ('emoji','easy','{"emoji":"🍎🥪🎒","answer":"LUNCHBOX"}'::jsonb),
  ('emoji','easy','{"emoji":"🛁🦆🧼","answer":"BATH TIME"}'::jsonb),
  ('emoji','easy','{"emoji":"📚🛏️😴","answer":"BEDTIME STORY"}'::jsonb),
  ('emoji','easy','{"emoji":"🤒🌡️👩‍⚕️","answer":"SICK DAY"}'::jsonb),
  ('emoji','easy','{"emoji":"🚲⛑️👦","answer":"BIKE RIDE"}'::jsonb);

-- EMOJI DECODE — challenging
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('emoji','challenging','{"emoji":"🏥👨‍⚕️💉","answer":"DOCTOR APPOINTMENT"}'::jsonb),
  ('emoji','challenging','{"emoji":"🛒🍎🍞","answer":"GROCERY SHOPPING"}'::jsonb),
  ('emoji','challenging','{"emoji":"🎂🎈🎁","answer":"BIRTHDAY PARTY"}'::jsonb),
  ('emoji','challenging','{"emoji":"🧹🧼🧽","answer":"CLEANING"}'::jsonb),
  ('emoji','challenging','{"emoji":"🏕️🔥🪵","answer":"CAMPING"}'::jsonb),
  ('emoji','challenging','{"emoji":"🏖️☀️🌊","answer":"BEACH DAY"}'::jsonb),
  ('emoji','challenging','{"emoji":"🎃👻🍬","answer":"HALLOWEEN"}'::jsonb),
  ('emoji','challenging','{"emoji":"🦃🍂🥧","answer":"THANKSGIVING"}'::jsonb),
  ('emoji','challenging','{"emoji":"🎄🎅🎁","answer":"CHRISTMAS"}'::jsonb),
  ('emoji','challenging','{"emoji":"🎆🎇🎆","answer":"NEW YEARS"}'::jsonb);

-- EMOJI DECODE — brain-squeezing
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('emoji','brain-squeezing','{"emoji":"🤰🤢🚽","answer":"MORNING SICKNESS"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"🤱🍼🔥","answer":"BOTTLE WARMER"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"💩💥👖","answer":"BLOWOUT"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"😭😡😤","answer":"TANTRUM"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"🤫🚪🏃‍♀️","answer":"SNEAKING OUT"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"🍷🧀🛁","answer":"ME TIME"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"💸💸💸","answer":"DAYCARE"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"🧩🦶🤬","answer":"STEPPING ON LEGO"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"📱👀⏰","answer":"SCREEN TIME"}'::jsonb),
  ('emoji','brain-squeezing','{"emoji":"👩‍🏫🍎📝","answer":"PARENT TEACHER CONFERENCE"}'::jsonb);

-- CARPOOL MATH — easy
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('math','easy','{"q":"If you have 3 kids and each needs 2 snacks, how many snacks?","a":"6"}'::jsonb),
  ('math','easy','{"q":"Soccer practice is 45 mins. It starts at 4:00. When does it end?","a":"4:45"}'::jsonb),
  ('math','easy','{"q":"You buy 4 coffees at $5 each. What''s the total?","a":"20"}'::jsonb),
  ('math','easy','{"q":"Naptime is 2 hours. If it starts at 1:00 PM, when do they wake up?","a":"3:00"}'::jsonb),
  ('math','easy','{"q":"You have 10 diapers. A baby uses 5 a day. How many days will they last?","a":"2"}'::jsonb),
  ('math','easy','{"q":"School starts at 8:00 AM. It takes 15 mins to drive. When must you leave?","a":"7:45"}'::jsonb),
  ('math','easy','{"q":"A recipe calls for 2 cups of flour. You want to double it. How many cups?","a":"4"}'::jsonb),
  ('math','easy','{"q":"The bus arrives in 10 minutes. It''s 7:20. When does the bus arrive?","a":"7:30"}'::jsonb),
  ('math','easy','{"q":"You give your child $10. They buy a $4 toy. How much change?","a":"6"}'::jsonb),
  ('math','easy','{"q":"If a movie is 90 minutes long, how many hours and minutes is that?","a":"1 hr 30 min"}'::jsonb);

-- CARPOOL MATH — brain-squeezing (challenging mirrors easy in source — we''ll grow this over time)
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('math','brain-squeezing','{"q":"You need 24 cupcakes. A box mix makes 10. How many boxes do you need to buy?","a":"3"}'::jsonb),
  ('math','brain-squeezing','{"q":"Child A needs to be at soccer at 5:00. Child B needs to be at dance at 5:15. Drive time between them is 20 mins. Can you make both on time? (Yes/No)","a":"No"}'::jsonb),
  ('math','brain-squeezing','{"q":"A babysitter charges $15/hr. You are gone from 6:30 PM to 10:30 PM. How much do you owe?","a":"60"}'::jsonb),
  ('math','brain-squeezing','{"q":"Your baby wakes up every 3 hours. If they go to sleep at 8 PM, what are the next two wake times?","a":"11 PM, 2 AM"}'::jsonb),
  ('math','brain-squeezing','{"q":"If you buy 3 shirts for $12 each and have a 20% off coupon, what is the total?","a":"28.80"}'::jsonb),
  ('math','brain-squeezing','{"q":"A car gets 25 mpg. The trip is 150 miles. Gas is $3/gallon. How much will gas cost?","a":"18"}'::jsonb),
  ('math','brain-squeezing','{"q":"You start making dinner at 5:15. It takes 20 mins to prep and 35 mins to bake. When is it ready?","a":"6:10"}'::jsonb),
  ('math','brain-squeezing','{"q":"If 4 kids share 14 cookies equally, how many are left over?","a":"2"}'::jsonb),
  ('math','brain-squeezing','{"q":"Your child''s fever is 39.5 Celsius. What is it in Fahrenheit? (approximate)","a":"103.1"}'::jsonb),
  ('math','brain-squeezing','{"q":"You need to save $500 for summer camp in 4 months. How much do you need to save per week? (assume 4 weeks/month)","a":"31.25"}'::jsonb);

-- WORD SEARCH — stored as one row per (difficulty) with full word list + grid
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('word-search','easy',
    '{"words":["SLEEP","MOMMY","BABY","MILK","CRIB","BOTTLE","NAP","PLAY","HUG","TOY"],
      "grid":["S","L","E","E","P","X","T","O","Y","X","B","A","B","Y","C","D","X","X","X","X","M","O","M","M","Y","E","N","A","P","X","X","X","M","I","L","K","X","X","X","X","P","L","A","Y","I","C","X","X","X","X","B","O","T","T","L","E","X","X","X","X","C","R","I","B","X","X","H","U","G","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X"],
      "cols":10}'::jsonb),
  ('word-search','challenging',
    '{"words":["TODDLER","DIAPER","TEETHING","STROLLER","PACIFIER","BLANKET","ONESIE","BATH","SNACK","POTTY"],
      "grid":["T","O","D","D","L","E","R","X","S","N","D","I","A","P","E","R","X","X","N","A","T","E","E","T","H","I","N","G","A","C","S","T","R","O","L","L","E","R","C","K","P","A","C","I","F","I","E","R","K","X","B","L","A","N","K","E","T","X","P","O","O","N","E","S","I","E","X","X","O","T","B","A","T","H","X","X","X","X","T","T","X","X","X","X","X","X","X","X","T","Y","X","X","X","X","X","X","X","X","Y","X"],
      "cols":10}'::jsonb),
  ('word-search','brain-squeezing',
    '{"words":["PEDIATRICIAN","VACCINE","MONTESSORI","CURRICULUM","MILESTONE","SWADDLE","BASSINET","STROLLER","PACIFIER","FORMULA"],
      "grid":["P","E","D","I","A","T","R","I","C","I","A","N","V","A","C","C","I","N","E","X","X","X","X","X","M","O","N","T","E","S","S","O","R","I","X","X","C","U","R","R","I","C","U","L","U","M","X","X","M","I","L","E","S","T","O","N","E","X","X","X","S","W","A","D","D","L","E","X","X","X","X","X","B","A","S","S","I","N","E","T","X","X","X","X","S","T","R","O","L","L","E","R","X","X","X","X","P","A","C","I","F","I","E","R","X","X","X","X","F","O","R","M","U","L","A","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X","X"],
      "cols":12}'::jsonb);

-- MEMORY MATCH — fixed icon pool; difficulty controls pair count
INSERT INTO game_content (game_type, difficulty, payload) VALUES
  ('memory','easy',            '{"icons":["🍼","🧸","🧷","🚗","📚","🎨"],            "pairs":6}'::jsonb),
  ('memory','challenging',     '{"icons":["🍼","🧸","🧷","🚗","📚","🎨","🛁","🥪"],   "pairs":8}'::jsonb),
  ('memory','brain-squeezing', '{"icons":["🍼","🧸","🧷","🚗","📚","🎨","🛁","🥪","🎈","🎂"],"pairs":10}'::jsonb);
