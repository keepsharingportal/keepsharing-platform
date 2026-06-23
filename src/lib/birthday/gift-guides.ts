// Birthday gift guides by age bucket. Each bucket has 15 curated
// ideas the editor stands behind for River Region kids that age.
//
// Used in two places:
//   1. Home portal — <GiftGuidesByAge> renders a card per bucket
//      that teases the count and links to the detail page.
//   2. /birthday-party-guide/gifts + /gifts/[age] — full guide
//      with each idea rendered as a card.
//
// Future-state: each idea grows an `amazonUrl` (or other affiliate
// link) for revenue. Adding the URL doesn't change anything else —
// the card just becomes clickable.

export interface GiftIdea {
  name:       string
  blurb:      string
  priceBand:  '$' | '$$' | '$$$' | '$$$$'
  /** Where to get it (rough — affiliate links land here later). */
  where?:     string
  /** Optional tags — 'screen-free', 'open-ended', 'experience', etc. */
  tags?:      string[]
}

export interface AgeBucket {
  slug:       string
  range:      string
  label:      string
  color:      string
  pitch:      string
  intro:      string
  ideas:      GiftIdea[]
}

export const AGE_BUCKETS: AgeBucket[] = [
  // ── 1-2 · Toddler ────────────────────────────────────────────
  {
    slug:  'toddler',
    range: '1-2',
    label: 'Toddler',
    color: '#60a5fa',
    pitch: 'First-birthday must-haves and toys that grow with them',
    intro: 'At 1 and 2, the kid won\'t remember the gift — but the parents will remember which one got actual play and which one ended up in the donation bin. These 15 are the ones that earn shelf space.',
    ideas: [
      { name: 'Melissa & Doug shape sorter',         blurb: 'The classic developmental toy. Lasts through toddler-hood and beyond.',                priceBand: '$',  tags: ['classic','motor'] },
      { name: 'Indestructibles board books',         blurb: 'Chew-proof, rip-proof, dishwasher-safe. The only books toddlers can\'t destroy.',     priceBand: '$',  tags: ['books','parent-sanity'] },
      { name: 'Nesting + stacking cups',             blurb: 'Bath, sandbox, tea-party, tower — one toy, fifty play patterns.',                       priceBand: '$',  tags: ['open-ended'] },
      { name: 'Wooden push walker with blocks',      blurb: 'Helps new walkers find their balance; the block storage is a play pattern itself.',     priceBand: '$$', tags: ['motor'] },
      { name: 'Tabletop sensory bin',                blurb: 'Rice / pasta / kinetic sand bin with scoops. Endless quiet-time play.',                 priceBand: '$$', tags: ['sensory'] },
      { name: 'Soft foam ball pit',                  blurb: 'Foldable, washable, lives in the living room. Kids fight over it at every party.',     priceBand: '$$', tags: ['gross-motor'] },
      { name: 'Musical egg shaker set',              blurb: 'Six little shakers for music-class energy at home. Goes everywhere.',                   priceBand: '$',  tags: ['music'] },
      { name: 'Skip Hop activity cube',              blurb: 'Five-sided play table — beads, gears, mirrors, the works. Stays out for years.',       priceBand: '$$', tags: ['motor','open-ended'] },
      { name: 'Magnatiles starter set (24 pcs)',     blurb: 'Toddler-safe magnetic tiles that grow into preschool builds. The forever toy.',         priceBand: '$$$', tags: ['open-ended','grows-up'] },
      { name: 'Pretend phone (B. Toys or VTech)',    blurb: 'Toddlers want YOUR phone. Give them their own and the iPhone stays in your pocket.',   priceBand: '$',  tags: ['pretend-play'] },
      { name: 'Personalized name puzzle',            blurb: 'Wooden, chunky pieces with their name. They\'ll learn the letters this year.',         priceBand: '$$', tags: ['personalized','learning'] },
      { name: 'Bath crayons + foam letters',         blurb: 'Bath time stretches to 45 minutes. Parents weep with gratitude.',                       priceBand: '$',  tags: ['parent-sanity'] },
      { name: 'Family photo board book',             blurb: 'Custom photo book of family members. Kids point at faces for months.',                  priceBand: '$$', tags: ['personalized','books'] },
      { name: 'River Region Children\'s Museum membership', blurb: 'Annual pass beats any wrapped toy. Rainy-day plan for the whole year.',           priceBand: '$$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Roll & play activity gym',            blurb: 'Tummy time → sitting → standing. The same mat earns its keep for a year.',             priceBand: '$$', tags: ['motor','grows-up'] },
    ],
  },

  // ── 3-4 · Preschool ─────────────────────────────────────────
  {
    slug:  'preschool',
    range: '3-4',
    label: 'Preschool',
    color: '#34d399',
    pitch: 'Imagination toys, building sets, and sensory wins',
    intro: 'Pretend play takes over. They\'ll spend three hours on something that looks boring to you and 30 seconds on the flashy toy. The ones below skew imagination + building + outdoor energy.',
    ideas: [
      { name: 'Play kitchen + accessories',          blurb: 'Wooden if you\'re feeling fancy, plastic if you\'re feeling realistic. Both get destroyed equally.', priceBand: '$$$', tags: ['pretend-play'] },
      { name: 'Magnatiles 100-piece set',            blurb: 'The toy parents complain about stepping on AND ask for at every gift exchange.',        priceBand: '$$$', tags: ['open-ended','classic'] },
      { name: 'Doctor / vet kit',                    blurb: 'Stethoscope, otoscope, syringe (no needle). Real-feeling tools = hours of pretend.',    priceBand: '$$', tags: ['pretend-play'] },
      { name: 'Costume / dress-up trunk',            blurb: 'Princess, knight, firefighter, astronaut. Rotate based on the year\'s obsession.',     priceBand: '$$', tags: ['pretend-play'] },
      { name: 'Balance bike',                        blurb: 'Skip training wheels entirely. They\'ll ride a real bike by 5.',                        priceBand: '$$$', tags: ['outdoor','motor'] },
      { name: 'Kinetic sand + molds',                blurb: 'Less messy than real sand, more satisfying. Travel-size tubs save road trips.',         priceBand: '$',  tags: ['sensory'] },
      { name: 'Crayola Color Wonder',                blurb: 'Markers that only color on the special paper. Walls survive. Worth every penny.',       priceBand: '$',  tags: ['parent-sanity','art'] },
      { name: 'Pretend cash register + play food',   blurb: 'Restaurant, grocery store, ice-cream shop. Parents become customers for months.',       priceBand: '$$', tags: ['pretend-play'] },
      { name: 'Watercolor paint set',                blurb: 'A real one — not the dollar-store one. Stays in the rotation for actual artwork.',     priceBand: '$$', tags: ['art'] },
      { name: '24-48 piece puzzles',                 blurb: 'The sweet spot — hard enough to be proud, easy enough to finish.',                      priceBand: '$',  tags: ['quiet-time'] },
      { name: 'Montgomery Zoo membership',           blurb: 'Annual pass + Mann Wildlife Center. Costs less than 3 day-passes.',                     priceBand: '$$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Lovevery Play Kit subscription',      blurb: 'Quarterly box matched to developmental stage. Curated, screen-free.',                   priceBand: '$$$$', tags: ['subscription'] },
      { name: 'Wooden train set (Brio-style)',       blurb: 'Compatible with everything. Track expands every birthday. Lives in the play area.',     priceBand: '$$$', tags: ['open-ended','grows-up'] },
      { name: 'Personalized backpack',               blurb: 'Pre-K ready. Their name on it = won\'t get lost at the museum.',                        priceBand: '$$', tags: ['personalized','practical'] },
      { name: 'Pete the Cat / Llama Llama book set', blurb: 'Picture books they ask for every night. Worth more than the gift card to Target.',      priceBand: '$$', tags: ['books'] },
    ],
  },

  // ── 5-7 · Early Elem. ──────────────────────────────────────
  {
    slug:  'early-elem',
    range: '5-7',
    label: 'Early Elem.',
    color: '#a78bfa',
    pitch: "Big-kid finds that don't bust the present budget",
    intro: 'School-age. Reading. Hands-on building. First sleepovers. They start having opinions about what\'s "cool." Give a gift card if you\'re unsure — but the ones below are safer.',
    ideas: [
      { name: 'LEGO Classic creative bricks box',    blurb: 'Open-ended bricks beat themed sets at this age. Build, smash, rebuild — repeat.',      priceBand: '$$', tags: ['open-ended','classic'] },
      { name: 'Vtech Kidizoom kid camera',           blurb: 'Real photos, kid-proof body, fun filters. Parents get a peek at the kid\'s world.',     priceBand: '$$', tags: ['tech-light'] },
      { name: 'Science kit (crystal, slime, magnet)', blurb: 'National Geographic or Thames & Kosmos. Real lab-feeling experiments at home.',       priceBand: '$$', tags: ['stem'] },
      { name: 'Scooter (Razor A3 or A5)',            blurb: 'The classic. Helmets sold separately but please don\'t forget them.',                  priceBand: '$$', tags: ['outdoor','gross-motor'] },
      { name: 'Sidewalk chalk + paint set',          blurb: 'Goes way beyond the bucket from CVS. Spray chalk + stencils = neighborhood gallery.',  priceBand: '$',  tags: ['outdoor','art'] },
      { name: 'BuddyPhones volume-limited headphones', blurb: 'Caps at 85dB so their hearing survives. Built for kid heads.',                       priceBand: '$$', tags: ['tech','parent-approved'] },
      { name: 'Board games for early readers',       blurb: 'Outfoxed, Sushi Go, Sleeping Queens, Hoot Owl Hoot. Family-friendly, 15-min games.',   priceBand: '$$', tags: ['games'] },
      { name: 'Personalized children\'s book',       blurb: 'Wonderbly or I See Me — their name woven into the story. Treasured for years.',       priceBand: '$$', tags: ['personalized','books'] },
      { name: 'Pokemon trading card starter',        blurb: 'Whether you get it or not, they will. Booster packs are the universal kid currency.',  priceBand: '$',  tags: ['collectibles'] },
      { name: 'Build-your-own birdhouse kit',        blurb: 'Hammer, nails, paint. Comes home from school and hangs in the yard for years.',        priceBand: '$',  tags: ['hands-on'] },
      { name: 'KiwiCo Tinker Crate subscription',    blurb: 'Monthly STEM project. Building rocket cars and circuit games beats the toy aisle.',    priceBand: '$$$', tags: ['stem','subscription'] },
      { name: 'Defy / Sky Zone punch card',          blurb: 'Trampoline-park visits — local punch cards trade for birthday currency.',              priceBand: '$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Action figure or doll of choice',     blurb: 'Whatever the obsession is this month. Give the gift; don\'t guess the franchise.',     priceBand: '$$', tags: ['pretend-play'] },
      { name: 'Library bookstore gift card',         blurb: 'Capitol Book & News or any local indie — beats Amazon for a special trip.',           priceBand: '$',  where: 'Local', tags: ['books','local'] },
      { name: 'Bey-Blades + stadium',                blurb: 'Spinning-top battles. Two kids will play this for 90 minutes uninterrupted.',          priceBand: '$$', tags: ['hands-on'] },
    ],
  },

  // ── 8-10 · Big Kids ────────────────────────────────────────
  {
    slug:  'big-kids',
    range: '8-10',
    label: 'Big Kids',
    color: '#fb923c',
    pitch: 'STEM kits, sports gear, and screen-free fun',
    intro: 'Independence starts. Hobbies form. They want to be trusted with real-er tools. These pick up where preschool toys left off.',
    ideas: [
      { name: 'Snap Circuits Jr',                    blurb: 'Build actual working circuits. They\'ll show off the radio they made for weeks.',     priceBand: '$$$', tags: ['stem'] },
      { name: 'Holy Stone HS210 starter drone',      blurb: 'Beginner drone that flies indoor + survives crashes. Practice yard, then the park.',  priceBand: '$$$', tags: ['stem','outdoor'] },
      { name: 'LEGO Friends or City themed set',     blurb: 'They want the box-art project. Building it together is the gift.',                    priceBand: '$$$', tags: ['hands-on'] },
      { name: 'Pokemon card binder + booster packs', blurb: 'Trading-card economy is real. The binder is what they actually need.',                priceBand: '$$', tags: ['collectibles'] },
      { name: 'Razor RipStik or pogo stick',         blurb: 'Backyard balance toys that look way cooler than a scooter.',                          priceBand: '$$$', tags: ['outdoor','gross-motor'] },
      { name: 'Midland LXT500 walkie talkies',       blurb: 'REAL ones (not the cheap kid pair). Hours of neighborhood adventure.',                priceBand: '$$', tags: ['outdoor'] },
      { name: 'Yoto Player + audiobook cards',       blurb: 'Screen-free audio player. Kid-controlled. Roald Dahl on a Saturday morning.',         priceBand: '$$$$', tags: ['screen-free','tech'] },
      { name: 'Osmo Coding starter kit',             blurb: 'iPad-based coding game that teaches real logic. Parent-approved screen time.',        priceBand: '$$$', tags: ['stem','tech'] },
      { name: 'Basketball / football / lacrosse stick', blurb: 'Whatever sport they love. Personal equipment beats whatever the rec center has.', priceBand: '$$', tags: ['sports'] },
      { name: 'Hammock + carabiners',                blurb: 'Backyard or sleepovers. Costs $30 and gets used way more than the trampoline.',       priceBand: '$',  tags: ['outdoor'] },
      { name: 'Friendship-bracelet kit',             blurb: 'Pura Vida or Klutz — embroidery floss + clipboards. Sleepover-party-ready.',         priceBand: '$$', tags: ['hands-on','crafts'] },
      { name: 'Personalized name hoodie or shirt',   blurb: 'Sports team, cartoon character, glitter monogram — pick their flavor.',               priceBand: '$$', tags: ['personalized'] },
      { name: 'National Geographic Kids subscription', blurb: 'Mail every month, not screen time. The Animal Jam crowd loves it.',                 priceBand: '$$', tags: ['subscription','books'] },
      { name: 'Local ninja gym 10-pack',             blurb: 'Pumped Up Sports, Defy, etc. — beats handing them a $20.',                            priceBand: '$$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Card games: Skip-Bo, Phase 10, Uno',  blurb: 'Family-game-night staples. Tag in cousins, grandparents, the whole crew.',           priceBand: '$',  tags: ['games'] },
    ],
  },

  // ── 11-13 · Tweens ─────────────────────────────────────────
  {
    slug:  'tweens',
    range: '11-13',
    label: 'Tweens',
    color: '#f472b6',
    pitch: 'Gifts that feel grown-up without crossing teen-only lines',
    intro: 'They roll their eyes at "toys" and want real-er things — but the line between tween and teen is thin. These hit the cool factor without the parent veto.',
    ideas: [
      { name: 'Sony WF-C500 earbuds',                blurb: 'Real wireless earbuds, kid-budget price. Adult-looking, not childish.',                priceBand: '$$$', tags: ['tech'] },
      { name: 'Instax Mini camera',                  blurb: 'Polaroid revival. Photos for the bedroom wall. Aesthetic of the decade.',              priceBand: '$$$', tags: ['tech','aesthetic'] },
      { name: 'Stanley cup or Hydroflask',           blurb: 'The status water bottle. Sticker collection sold separately.',                         priceBand: '$$', tags: ['aesthetic','practical'] },
      { name: 'Bubble or Drunk Elephant skincare set', blurb: 'Tween-safe skincare brands — into self-care, not chemicals.',                       priceBand: '$$$', tags: ['self-care','aesthetic'] },
      { name: 'Roblox / Steam / V-Bucks gift card',  blurb: 'Cash for them, exact-currency for you. No mis-guess on the game they play.',          priceBand: '$$', tags: ['cash','gaming'] },
      { name: 'Audible or Spotify subscription',     blurb: 'Audiobooks for car rides; Spotify for the rest of life. Quiet game-changer.',          priceBand: '$$', tags: ['subscription'] },
      { name: 'Polaroid printer (HP Sprocket)',      blurb: 'Phone → physical photo. Decorates lockers and Polaroid walls.',                       priceBand: '$$$', tags: ['tech','aesthetic'] },
      { name: 'Lululemon belt bag',                  blurb: 'The fanny pack but cool. Holds phone + cards + lip balm. Forever in rotation.',       priceBand: '$$$', tags: ['aesthetic','practical'] },
      { name: 'Pottery wheel or acrylic paint set',  blurb: 'Real art supplies — not the kiddie kit. Studio-grade ambitions.',                     priceBand: '$$$', tags: ['art','hands-on'] },
      { name: 'Concert / sports event tickets',      blurb: 'Their favorite band, Trojans football, ASF Saturday — make a memory.',                priceBand: '$$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Adidas Sambas, Crocs, or beanie',     blurb: 'Whatever the trend is this year. Ask their best friend\'s mom first.',                priceBand: '$$$', tags: ['aesthetic'] },
      { name: 'Smashbook / locked diary',            blurb: 'Private space for ideas, doodles, friend signatures. Old-school cool.',                priceBand: '$',  tags: ['journaling'] },
      { name: 'Hello Bello / Bubble Bath box subscription', blurb: 'Tween-targeted subscription boxes — care-package vibe each month.',             priceBand: '$$$', tags: ['subscription','self-care'] },
      { name: 'Boutique fitness class pack',          blurb: 'Pure Barre teen class, kickboxing, or yoga punch card — grown-up gym energy.',        priceBand: '$$$', where: 'Local', tags: ['experience','local'] },
      { name: 'Stanley Carafe or Owala water bottle', blurb: 'The non-Stanley Stanley — same energy, different brand. (Refer back to #3.)',         priceBand: '$$', tags: ['aesthetic'] },
    ],
  },
]

export function bucketBySlug(slug: string): AgeBucket | null {
  return AGE_BUCKETS.find(b => b.slug === slug) ?? null
}
