-- Migration 081: Family Connect (replaces Word Search in the rotation)
-- Adds the new 'family-connect' game type to the content pool with seed
-- puzzles, and retires existing word-search rows (weight=0) so they stop
-- appearing in the public rotation but stay in the DB for history.
--
-- Mechanic: 16 words on a 4x4 board belong to 4 secret groups of 4.
-- Player picks 4 and submits. Server validates against a stored group.
-- Tone determines the reveal color (yellow → easiest, purple → trickiest).
--
-- Payload shape:
-- {
--   "groups": [
--     { "label": "...", "tone": "yellow"|"green"|"blue"|"purple", "words": ["w1","w2","w3","w4"] },
--     ...4 entries total
--   ]
-- }

-- ── Retire word-search rows ─────────────────────────────────────────────────
UPDATE game_content
   SET weight = 0,
       notes  = COALESCE(notes || E'\n', '') || 'Retired in migration 081 — replaced by Family Connect.'
 WHERE game_type = 'word-search'
   AND weight > 0;

-- ── Seed Family Connect puzzles ─────────────────────────────────────────────

-- EASY — obvious groupings, no red herrings
INSERT INTO game_content (game_type, difficulty, payload) VALUES
('family-connect', 'easy',
  '{"groups":[
    {"label":"Diaper bag essentials","tone":"yellow","words":["WIPES","BOTTLE","PACIFIER","DIAPERS"]},
    {"label":"On the playground","tone":"green","words":["SLIDE","SWING","SANDBOX","MONKEY BARS"]},
    {"label":"Bedtime routine","tone":"blue","words":["BATH","STORY","PAJAMAS","LULLABY"]},
    {"label":"School supplies","tone":"purple","words":["PENCIL","CRAYON","ERASER","GLUE"]}
   ]}'::jsonb),

('family-connect', 'easy',
  '{"groups":[
    {"label":"In the lunchbox","tone":"yellow","words":["SANDWICH","JUICE BOX","APPLE","COOKIE"]},
    {"label":"Toys all over the floor","tone":"green","words":["LEGO","BLOCKS","DOLL","TRUCK"]},
    {"label":"Morning rush items","tone":"blue","words":["BACKPACK","SHOES","JACKET","LUNCHBOX"]},
    {"label":"Mom''s survival kit","tone":"purple","words":["COFFEE","WIPES","SNACKS","DRY SHAMPOO"]}
   ]}'::jsonb),

('family-connect', 'easy',
  '{"groups":[
    {"label":"Sports gear","tone":"yellow","words":["BAT","HELMET","CLEATS","GLOVE"]},
    {"label":"Art supplies","tone":"green","words":["PAINT","BRUSH","PAPER","MARKER"]},
    {"label":"Snack drawer","tone":"blue","words":["GOLDFISH","CHEERIOS","PRETZELS","RAISINS"]},
    {"label":"Bath time","tone":"purple","words":["BUBBLES","RUBBER DUCK","TOWEL","SHAMPOO"]}
   ]}'::jsonb),

('family-connect', 'easy',
  '{"groups":[
    {"label":"Things at the park","tone":"yellow","words":["BENCH","DUCKS","PICNIC","SCOOTER"]},
    {"label":"At the kitchen table","tone":"green","words":["PLATE","SPOON","BIB","SIPPY"]},
    {"label":"Backyard fun","tone":"blue","words":["SPRINKLER","HOSE","KIDDIE POOL","CHALK"]},
    {"label":"Family movie night","tone":"purple","words":["POPCORN","BLANKET","REMOTE","PILLOW"]}
   ]}'::jsonb),

-- CHALLENGING — categories overlap slightly; words could fit two groups
('family-connect', 'challenging',
  '{"groups":[
    {"label":"Things in a backpack","tone":"yellow","words":["FOLDER","CALCULATOR","HEADPHONES","WATER BOTTLE"]},
    {"label":"Gym class","tone":"green","words":["SHORTS","WHISTLE","CONES","MAT"]},
    {"label":"Cleaning supplies","tone":"blue","words":["MOP","SPONGE","SPRAY","RAG"]},
    {"label":"Cry triggers","tone":"purple","words":["HUNGRY","TIRED","BUMPED HEAD","WET DIAPER"]}
   ]}'::jsonb),

('family-connect', 'challenging',
  '{"groups":[
    {"label":"Daycare drop-off","tone":"yellow","words":["NAP MAT","EXTRA CLOTHES","SIGN-IN","KISS GOODBYE"]},
    {"label":"After-school activities","tone":"green","words":["SOCCER","PIANO","TUTOR","SCOUTS"]},
    {"label":"Toddler joys","tone":"blue","words":["STICKERS","BUBBLES","SPRINKLER","TRUCKS"]},
    {"label":"Things lost daily","tone":"purple","words":["KEYS","PHONE","SOCK","REMOTE"]}
   ]}'::jsonb),

('family-connect', 'challenging',
  '{"groups":[
    {"label":"Birthday party","tone":"yellow","words":["CAKE","BALLOONS","CANDLES","PRESENT"]},
    {"label":"At a soccer game","tone":"green","words":["BALL","WHISTLE","ORANGE SLICES","COOLER"]},
    {"label":"On a road trip","tone":"blue","words":["SNACKS","TABLET","TRAVEL PILLOW","ARE WE THERE YET"]},
    {"label":"Sounds a baby makes","tone":"purple","words":["COO","BABBLE","FUSS","GIGGLE"]}
   ]}'::jsonb),

('family-connect', 'challenging',
  '{"groups":[
    {"label":"Toddler tantrum words","tone":"yellow","words":["NO","MINE","WHY","STOP"]},
    {"label":"Story time books","tone":"green","words":["GOODNIGHT MOON","HUNGRY CATERPILLAR","LLAMA LLAMA","BROWN BEAR"]},
    {"label":"Mom hacks","tone":"blue","words":["MEAL PREP","CARPOOL","NAP TRADE","BATCH COOK"]},
    {"label":"Doctor visit","tone":"purple","words":["WAITING ROOM","STICKER","SHOT","LOLLIPOP"]}
   ]}'::jsonb),

-- BRAIN-SQUEEZING — heavy red herrings, abstract themes
('family-connect', 'brain-squeezing',
  '{"groups":[
    {"label":"Things that come in pairs","tone":"yellow","words":["SHOES","SOCKS","GLOVES","EARRINGS"]},
    {"label":"___ swing","tone":"green","words":["MOOD","TIRE","PARK","DANCE"]},
    {"label":"Drips","tone":"blue","words":["FAUCET","HONEY","CANDLE","SARCASM"]},
    {"label":"Parts of a car","tone":"purple","words":["HOOD","TRUNK","BUMPER","HUBCAP"]}
   ]}'::jsonb),

('family-connect', 'brain-squeezing',
  '{"groups":[
    {"label":"Things that ring","tone":"yellow","words":["BELL","PHONE","EARS","BOXING"]},
    {"label":"Mom ___","tone":"green","words":["BRAIN","JEANS","LIFE","FRIENDS"]},
    {"label":"School ___","tone":"blue","words":["BUS","NIGHT","ZONE","HOUSE"]},
    {"label":"Comes in a box","tone":"purple","words":["CRAYONS","CEREAL","PIZZA","JUICE"]}
   ]}'::jsonb),

('family-connect', 'brain-squeezing',
  '{"groups":[
    {"label":"Types of pickup","tone":"yellow","words":["SCHOOL","TRUCK","LINE","TIME"]},
    {"label":"Comes after ''play''","tone":"green","words":["DATE","GROUND","PEN","ROOM"]},
    {"label":"Three little ___","tone":"blue","words":["PIGS","WORDS","KITTENS","BIRDS"]},
    {"label":"Diaper ___","tone":"purple","words":["BAG","RASH","CHANGING","GENIE"]}
   ]}'::jsonb),

('family-connect', 'brain-squeezing',
  '{"groups":[
    {"label":"___ chair","tone":"yellow","words":["HIGH","TIME-OUT","ROCKING","BEACH"]},
    {"label":"Bedtime stalling moves","tone":"green","words":["JUST ONE MORE STORY","I''M THIRSTY","NEED A HUG","BAD DREAM"]},
    {"label":"Has a ''yolk''","tone":"blue","words":["EGG","JOKE","OXEN","OXEN TEAM"]},
    {"label":"Where snacks vanish","tone":"purple","words":["CAR SEAT","COUCH CUSHION","BACKPACK","TODDLER MOUTH"]}
   ]}'::jsonb);
