// Birthday gift guides by age bucket. Each bucket has 15 curated
// ideas the editor stands behind for kids that age.
//
// Used in three places:
//   1. /birthday-party-guide — <GiftGuidesByAge> teaser cards
//   2. /birthday-party-guide/gifts — hub page
//   3. /birthday-party-guide/gifts/[age] — full guide page
//
// Monetization model (the data shape supports it; the renderers
// wire it up):
//   - affiliateUrl on each idea → 'Where to shop' button → revenue
//   - featured: true marks the editor's pick → hero card slot
//   - tags drive client-side filter chips for engagement
//
// No locally-named picks in this list — they were guessed and the
// editor caught it. Local spots get their own sponsor slot on the
// page so they're editor-managed, not hard-coded.

export type PriceBand = '$' | '$$' | '$$$' | '$$$$'

export interface GiftIdea {
  name:         string
  blurb:        string
  priceBand:    PriceBand
  /** Optional affiliate URL (Amazon, Target, etc.). When set, the
   *  card's CTA links here; when not, the card is informational. */
  affiliateUrl?: string
  /** Marks one idea per bucket as the editor's headline pick — gets
   *  the large hero card slot at the top of the per-age page. */
  featured?:    boolean
  /** Editor's note — surfaces on featured picks; one sentence beyond
   *  the standard blurb that lands the why. */
  editorNote?:  string
  /** Tags used by the page's client-side filter chips. */
  tags?:        string[]
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

/** Canonical tag vocabulary — used to build the filter chip bar.
 *  Keeping this small + intentional so the chips actually segment. */
export const TAG_FILTERS = [
  { tag: 'under-25',    label: 'Under $25',    matches: (i: GiftIdea) => i.priceBand === '$' },
  { tag: 'screen-free', label: 'Screen-free',  matches: (i: GiftIdea) => i.tags?.includes('screen-free') ?? false },
  { tag: 'open-ended',  label: 'Open-ended',   matches: (i: GiftIdea) => i.tags?.includes('open-ended') ?? false },
  { tag: 'experience',  label: 'Experiences',  matches: (i: GiftIdea) => i.tags?.includes('experience') ?? false },
  { tag: 'subscription',label: 'Subscriptions',matches: (i: GiftIdea) => i.tags?.includes('subscription') ?? false },
  { tag: 'grows-up',    label: 'Grows up with them', matches: (i: GiftIdea) => i.tags?.includes('grows-up') ?? false },
] as const

export const AGE_BUCKETS: AgeBucket[] = [
  // ── 1-2 · Toddler ────────────────────────────────────────────
  {
    slug:  'toddler',
    range: '1-2',
    label: 'Toddler',
    color: '#60a5fa',
    pitch: 'First-birthday must-haves and toys that grow with them',
    intro: 'At 1 and 2, the kid won\'t remember the gift — but the parents will remember which one got actual play and which one ended up in the donation bin. These 15 earn shelf space.',
    ideas: [
      { name: 'Magnatiles starter set (24 pcs)',     blurb: 'Toddler-safe magnetic tiles that grow into preschool builds. The forever toy.', priceBand: '$$$',
        featured: true, editorNote: "If you give one thing at a 1st or 2nd birthday, give this. It survives toddler-chew, scales into Magnatile cities at 6, and gets passed sibling-to-sibling for a decade.",
        tags: ['open-ended','grows-up','classic','screen-free'] },
      { name: 'Melissa & Doug shape sorter',         blurb: 'The classic developmental toy. Lasts through toddler-hood and beyond.',           priceBand: '$',  tags: ['classic','motor','screen-free'] },
      { name: 'Indestructibles board books',         blurb: 'Chew-proof, rip-proof, dishwasher-safe. The only books toddlers can\'t destroy.', priceBand: '$',  tags: ['books','parent-sanity','screen-free'] },
      { name: 'Nesting + stacking cups',             blurb: 'Bath, sandbox, tea-party, tower — one toy, fifty play patterns.',                  priceBand: '$',  tags: ['open-ended','screen-free'] },
      { name: 'Wooden push walker with blocks',      blurb: 'Helps new walkers find their balance; the block storage is a play pattern itself.', priceBand: '$$', tags: ['motor','screen-free'] },
      { name: 'Tabletop sensory bin',                blurb: 'Rice / pasta / kinetic sand bin with scoops. Endless quiet-time play.',            priceBand: '$$', tags: ['sensory','screen-free'] },
      { name: 'Soft foam ball pit',                  blurb: 'Foldable, washable, lives in the living room. Kids fight over it at every party.', priceBand: '$$', tags: ['gross-motor','screen-free'] },
      { name: 'Musical egg shaker set',              blurb: 'Six little shakers for music-class energy at home. Goes everywhere.',              priceBand: '$',  tags: ['music','screen-free'] },
      { name: 'Skip Hop activity cube',              blurb: 'Five-sided play table — beads, gears, mirrors, the works. Stays out for years.',  priceBand: '$$', tags: ['motor','open-ended','screen-free','grows-up'] },
      { name: 'Pretend phone (B. Toys or VTech)',    blurb: 'Toddlers want YOUR phone. Give them their own and the iPhone stays in your pocket.', priceBand: '$',  tags: ['pretend-play','parent-sanity'] },
      { name: 'Personalized name puzzle',            blurb: 'Wooden, chunky pieces with their name. They\'ll learn the letters this year.',    priceBand: '$$', tags: ['personalized','learning','screen-free'] },
      { name: 'Bath crayons + foam letters',         blurb: 'Bath time stretches to 45 minutes. Parents weep with gratitude.',                  priceBand: '$',  tags: ['parent-sanity','screen-free'] },
      { name: 'Family photo board book',             blurb: 'Custom photo book of family members. Kids point at faces for months.',             priceBand: '$$', tags: ['personalized','books','screen-free'] },
      { name: 'Lovevery Play Kit subscription',      blurb: 'Quarterly box matched to developmental stage. Curated, screen-free, no-think gifting.', priceBand: '$$$$', tags: ['subscription','screen-free'] },
      { name: 'Roll & play activity gym',            blurb: 'Tummy time → sitting → standing. The same mat earns its keep for a year.',        priceBand: '$$', tags: ['motor','grows-up','screen-free'] },
    ],
  },

  // ── 3-4 · Preschool ─────────────────────────────────────────
  {
    slug:  'preschool',
    range: '3-4',
    label: 'Preschool',
    color: '#34d399',
    pitch: 'Imagination toys, building sets, and sensory wins',
    intro: 'Pretend play takes over. They\'ll spend three hours on something boring-looking and 30 seconds on the flashy thing. The ones below skew imagination, building, outdoor energy.',
    ideas: [
      { name: 'Magnatiles 100-piece set',            blurb: 'The toy parents complain about stepping on AND ask for at every gift exchange.',  priceBand: '$$$',
        featured: true, editorNote: "Double down on the Magnatiles if it was already a toddler gift — the bigger set unlocks castles, ramps, marble runs. If they don't have any yet, start here.",
        tags: ['open-ended','classic','grows-up','screen-free'] },
      { name: 'Play kitchen + accessories',          blurb: 'Wooden if you\'re feeling fancy, plastic if you\'re feeling realistic. Both get destroyed equally.', priceBand: '$$$', tags: ['pretend-play','screen-free'] },
      { name: 'Doctor / vet kit',                    blurb: 'Stethoscope, otoscope, syringe (no needle). Real-feeling tools = hours of pretend.', priceBand: '$$', tags: ['pretend-play','screen-free'] },
      { name: 'Costume / dress-up trunk',            blurb: 'Princess, knight, firefighter, astronaut. Rotate based on the year\'s obsession.', priceBand: '$$', tags: ['pretend-play','screen-free'] },
      { name: 'Balance bike',                        blurb: 'Skip training wheels entirely. They\'ll ride a real bike by 5.',                    priceBand: '$$$', tags: ['outdoor','motor','grows-up','screen-free'] },
      { name: 'Kinetic sand + molds',                blurb: 'Less messy than real sand, more satisfying. Travel tubs save road trips.',          priceBand: '$',  tags: ['sensory','screen-free'] },
      { name: 'Crayola Color Wonder',                blurb: 'Markers that only color on the special paper. Walls survive. Worth every penny.',   priceBand: '$',  tags: ['parent-sanity','art','screen-free'] },
      { name: 'Pretend cash register + play food',   blurb: 'Restaurant, grocery store, ice-cream shop. Parents become customers for months.',   priceBand: '$$', tags: ['pretend-play','screen-free'] },
      { name: 'Watercolor paint set',                blurb: 'A real one — not the dollar-store one. Stays in the rotation for actual artwork.',  priceBand: '$$', tags: ['art','screen-free'] },
      { name: '24-48 piece puzzles',                 blurb: 'The sweet spot — hard enough to be proud, easy enough to finish.',                   priceBand: '$',  tags: ['quiet-time','screen-free'] },
      { name: 'Indoor mini climber set',             blurb: 'Pikler triangle or foam climbing blocks. Endless gross-motor without the park trip.', priceBand: '$$$$', tags: ['gross-motor','grows-up','screen-free'] },
      { name: 'Lovevery / KiwiCo subscription',      blurb: 'Curated monthly box of developmentally-matched activities. Better than the toy aisle.', priceBand: '$$$$', tags: ['subscription','screen-free'] },
      { name: 'Wooden train set (Brio-style)',       blurb: 'Compatible with everything. Track expands every birthday. Lives in the play area.',  priceBand: '$$$', tags: ['open-ended','grows-up','screen-free'] },
      { name: 'Personalized backpack',               blurb: 'Pre-K ready. Their name on it = won\'t get lost at the museum.',                     priceBand: '$$', tags: ['personalized','practical'] },
      { name: 'Pete the Cat / Llama Llama book set', blurb: 'Picture books they ask for every night. Worth more than the gift card to Target.',   priceBand: '$$', tags: ['books','screen-free'] },
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
      { name: 'LEGO Classic creative bricks box',    blurb: 'Open-ended bricks beat themed sets at this age. Build, smash, rebuild — repeat.',  priceBand: '$$',
        featured: true, editorNote: "Skip the franchise-themed sets at this age. The plain Classic bricks box is what builds a real LEGO kid; themed sets get built once and shelved.",
        tags: ['open-ended','classic','grows-up','screen-free'] },
      { name: 'Vtech Kidizoom kid camera',           blurb: 'Real photos, kid-proof body, fun filters. Parents get a peek at the kid\'s world.', priceBand: '$$', tags: ['tech-light'] },
      { name: 'Science kit (crystal, slime, magnet)', blurb: 'National Geographic or Thames & Kosmos. Real lab-feeling experiments at home.',    priceBand: '$$', tags: ['stem','screen-free'] },
      { name: 'Scooter (Razor A3 or A5)',            blurb: 'The classic. Helmets sold separately but please don\'t forget them.',               priceBand: '$$', tags: ['outdoor','gross-motor','screen-free'] },
      { name: 'Sidewalk chalk + paint set',          blurb: 'Goes way beyond the bucket from CVS. Spray chalk + stencils = neighborhood gallery.', priceBand: '$',  tags: ['outdoor','art','screen-free'] },
      { name: 'BuddyPhones volume-limited headphones', blurb: 'Caps at 85dB so their hearing survives. Built for kid heads.',                     priceBand: '$$', tags: ['tech','parent-approved'] },
      { name: 'Board games for early readers',       blurb: 'Outfoxed, Sushi Go, Sleeping Queens, Hoot Owl Hoot. Family-friendly, 15-min games.', priceBand: '$$', tags: ['games','screen-free','open-ended'] },
      { name: 'Personalized children\'s book',       blurb: 'Wonderbly or I See Me — their name woven into the story. Treasured for years.',     priceBand: '$$', tags: ['personalized','books','screen-free'] },
      { name: 'Pokemon trading card starter',        blurb: 'Whether you get it or not, they will. Booster packs are the universal kid currency.', priceBand: '$',  tags: ['collectibles'] },
      { name: 'Build-your-own birdhouse kit',        blurb: 'Hammer, nails, paint. Comes home from school and hangs in the yard for years.',     priceBand: '$',  tags: ['hands-on','screen-free'] },
      { name: 'KiwiCo Tinker Crate subscription',    blurb: 'Monthly STEM project. Building rocket cars and circuit games beats the toy aisle.',  priceBand: '$$$', tags: ['stem','subscription','screen-free'] },
      { name: 'Crazy Forts building set',            blurb: '69 plastic connectors + sticks = living-room forts for weeks. Rainy-Saturday saver.', priceBand: '$$', tags: ['open-ended','screen-free','grows-up'] },
      { name: 'Action figure or doll of choice',     blurb: 'Whatever the obsession is this month. Give the gift; don\'t guess the franchise.',   priceBand: '$$', tags: ['pretend-play'] },
      { name: 'Vooks audiobook subscription',        blurb: 'Animated story-time app for early readers. Replaces TV time some weeks.',           priceBand: '$$', tags: ['subscription','books'] },
      { name: 'Bey-Blades + stadium',                blurb: 'Spinning-top battles. Two kids will play this for 90 minutes uninterrupted.',        priceBand: '$$', tags: ['hands-on','screen-free'] },
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
      { name: 'Yoto Player + audiobook cards',       blurb: 'Screen-free audio player. Kid-controlled. Roald Dahl on a Saturday morning.',       priceBand: '$$$$',
        featured: true, editorNote: "The 'no-screen device' kids actually want. Stays in the bedroom and replaces the iPad battle most evenings.",
        tags: ['screen-free','tech','grows-up'] },
      { name: 'Snap Circuits Jr',                    blurb: 'Build actual working circuits. They\'ll show off the radio they made for weeks.',  priceBand: '$$$', tags: ['stem','screen-free'] },
      { name: 'Holy Stone HS210 starter drone',      blurb: 'Beginner drone that flies indoor + survives crashes. Practice yard, then the park.', priceBand: '$$$', tags: ['stem','outdoor'] },
      { name: 'LEGO Friends or City themed set',     blurb: 'They want the box-art project. Building it together is the gift.',                  priceBand: '$$$', tags: ['hands-on','screen-free'] },
      { name: 'Pokemon card binder + booster packs', blurb: 'Trading-card economy is real. The binder is what they actually need.',              priceBand: '$$', tags: ['collectibles'] },
      { name: 'Razor RipStik or pogo stick',         blurb: 'Backyard balance toys that look way cooler than a scooter.',                        priceBand: '$$$', tags: ['outdoor','gross-motor','screen-free'] },
      { name: 'Midland LXT500 walkie talkies',       blurb: 'REAL ones (not the cheap kid pair). Hours of neighborhood adventure.',              priceBand: '$$', tags: ['outdoor','screen-free'] },
      { name: 'Osmo Coding starter kit',             blurb: 'iPad-based coding game that teaches real logic. Parent-approved screen time.',      priceBand: '$$$', tags: ['stem','tech'] },
      { name: 'Basketball / football / lacrosse stick', blurb: 'Whatever sport they love. Personal equipment beats whatever the rec center has.', priceBand: '$$', tags: ['sports','outdoor','screen-free'] },
      { name: 'Hammock + carabiners',                blurb: 'Backyard or sleepovers. Costs $30 and gets used way more than the trampoline.',     priceBand: '$',  tags: ['outdoor','screen-free'] },
      { name: 'Friendship-bracelet kit',             blurb: 'Pura Vida or Klutz — embroidery floss + clipboards. Sleepover-party-ready.',       priceBand: '$$', tags: ['hands-on','crafts','screen-free'] },
      { name: 'Personalized name hoodie or shirt',   blurb: 'Sports team, cartoon character, glitter monogram — pick their flavor.',             priceBand: '$$', tags: ['personalized'] },
      { name: 'National Geographic Kids subscription', blurb: 'Mail every month, not screen time. The Animal Jam crowd loves it.',               priceBand: '$$', tags: ['subscription','books','screen-free'] },
      { name: 'First sleeping bag + headlamp',       blurb: 'Backyard camping starter. The first time they sleep outside is a core memory.',     priceBand: '$$', tags: ['outdoor','screen-free','grows-up'] },
      { name: 'Card games: Skip-Bo, Phase 10, Uno',  blurb: 'Family-game-night staples. Tag in cousins, grandparents, the whole crew.',         priceBand: '$',  tags: ['games','screen-free'] },
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
      { name: 'Instax Mini camera',                  blurb: 'Polaroid revival. Photos for the bedroom wall. Aesthetic of the decade.',          priceBand: '$$$',
        featured: true, editorNote: "The 'cool tween gift' that's also wholesome. Replaces phone-scrolling with print-photo decorating; aesthetic without algorithm.",
        tags: ['tech','aesthetic'] },
      { name: 'Sony WF-C500 earbuds',                blurb: 'Real wireless earbuds, kid-budget price. Adult-looking, not childish.',             priceBand: '$$$', tags: ['tech'] },
      { name: 'Stanley cup or Owala water bottle',   blurb: 'The status water bottle. Sticker collection sold separately.',                      priceBand: '$$', tags: ['aesthetic','practical'] },
      { name: 'Bubble or Drunk Elephant skincare',   blurb: 'Tween-safe skincare brands — into self-care, not chemicals.',                       priceBand: '$$$', tags: ['self-care','aesthetic'] },
      { name: 'Roblox / Steam / V-Bucks gift card',  blurb: 'Cash for them, exact-currency for you. No mis-guess on the game they play.',        priceBand: '$$', tags: ['cash','gaming'] },
      { name: 'Audible or Spotify subscription',     blurb: 'Audiobooks for car rides; Spotify for the rest of life. Quiet game-changer.',        priceBand: '$$', tags: ['subscription'] },
      { name: 'Polaroid printer (HP Sprocket)',      blurb: 'Phone → physical photo. Decorates lockers and Polaroid walls.',                     priceBand: '$$$', tags: ['tech','aesthetic'] },
      { name: 'Lululemon belt bag',                  blurb: 'The fanny pack but cool. Holds phone + cards + lip balm. Forever in rotation.',     priceBand: '$$$', tags: ['aesthetic','practical'] },
      { name: 'Pottery wheel or acrylic paint set',  blurb: 'Real art supplies — not the kiddie kit. Studio-grade ambitions.',                   priceBand: '$$$', tags: ['art','hands-on','screen-free'] },
      { name: 'Concert or sports-event tickets',     blurb: 'Their favorite band or team. Experience gift > another physical thing.',            priceBand: '$$$', tags: ['experience'] },
      { name: 'Adidas Sambas, Crocs, or beanie',     blurb: 'Whatever the trend is this year. Ask their best friend\'s mom first.',              priceBand: '$$$', tags: ['aesthetic'] },
      { name: 'Smashbook / locked diary',            blurb: 'Private space for ideas, doodles, friend signatures. Old-school cool.',             priceBand: '$',  tags: ['journaling','screen-free'] },
      { name: 'BoxyCharm or FabFitFun tween box',    blurb: 'Tween-targeted subscription boxes — care-package vibe each month.',                 priceBand: '$$$', tags: ['subscription','self-care'] },
      { name: 'Climbing-gym day pass + chalk bag',   blurb: 'Active gift that\'s tween-cool. Beats handing them another gift card.',             priceBand: '$$', tags: ['experience','outdoor','screen-free'] },
      { name: 'DIY jewelry kit (clay earrings, beads)', blurb: 'Make-and-sell hustle starter. Every tween wants to open an Etsy shop.',          priceBand: '$$', tags: ['hands-on','crafts','screen-free'] },
    ],
  },
]

export function bucketBySlug(slug: string): AgeBucket | null {
  return AGE_BUCKETS.find(b => b.slug === slug) ?? null
}

export function featuredPick(bucket: AgeBucket): GiftIdea | null {
  return bucket.ideas.find(i => i.featured) ?? null
}

export function nonFeaturedPicks(bucket: AgeBucket): GiftIdea[] {
  return bucket.ideas.filter(i => !i.featured)
}
