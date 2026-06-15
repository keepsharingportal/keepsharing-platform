// ── Market intelligence — per-brand geographic + cultural seeding ──────
//
// The family template handles "who the audience is + what voice." This
// file handles "where you operate + what's specific about this market"
// — the locality intelligence that should ship with the brand from day
// one so Claude doesn't have to guess.
//
// Updates are rare (population shifts over years, school systems
// rebrand over decades). Code-defining this means:
//   - First drafts for any brand are immediately good — no editor data
//     entry required before AI works
//   - Local knowledge is version-controlled — we can see WHY we listed
//     Prattville as a hot growth area
//   - Editor can override per-brand via the Brand Profile UI; this is
//     the seed, not the source of truth

export interface SubAreaIntel {
  name:                 string
  county?:              string
  population?:          number
  distanceFromHubMin?:  number       // drive time in minutes from primary city
  /** Free-text intelligence — the why behind this sub-area mattering.
   *  Drives Claude's recommendations more than the bare stats do. */
  notes:                string
  /** Local search modifiers — what people actually type. Plural / variations welcome. */
  searchModifiers:      string[]
}

export interface InstitutionIntel {
  name:        string
  kind:        'school-system' | 'hospital-system' | 'university' | 'military' | 'employer' | 'culture'
  notes:       string
}

export interface MarketIntel {
  /** The market hub city/region as readers refer to it. */
  hubLabel:         string
  /** Population estimate of the brand's service area. */
  serviceAreaPop?:  number
  /** Cultural fingerprints unique to this market — military families,
   *  college town, beach lifestyle, etc. Drives voice + angle. */
  culturalNotes:    string
  /** Sub-areas the brand explicitly serves, in priority order. */
  subAreas:         SubAreaIntel[]
  /** Notable institutions readers care about (school systems,
   *  hospitals, universities, military bases). */
  institutions:    InstitutionIntel[]
  /** Local search-modifier shorthand readers use. */
  regionalShorthand: string[]
}

// ── Per-brand intel registry ─────────────────────────────────────────────
// Add new brands here as they come online. Keys are brand slugs.

export const MARKET_INTEL: Record<string, MarketIntel> = {

  // ── River Region Parents (Montgomery, AL + surrounding) ──────────────
  rrp: {
    hubLabel:        'River Region',
    serviceAreaPop:  370000,
    culturalNotes:   `Hub-and-spoke market: Montgomery is the urban + commercial center,
but families increasingly choose surrounding suburbs (Prattville,
Pike Road, Wetumpka, Millbrook) for schools + quality of life.
Montgomery public schools face challenges, which drives heavy
search demand for school-quality content focused on the suburbs.
Maxwell-Gunter Air Force Base is a significant employer with high
PCS (relocation) turnover — newcomer content has consistent
seasonal demand. Auburn-Tuscaloosa football culture overlays
weekend planning. The Alabama River + Lake Martin offer outdoor
weekend escapes — content about both performs well.`,
    subAreas: [
      {
        name:                'Montgomery',
        county:              'Montgomery',
        population:          195000,
        notes:               `Urban hub + state capital. High volume but families researching
schools often skip to suburbs. Best for restaurants, museums,
state government family activities, downtown events.`,
        searchModifiers:     ['Montgomery AL', 'in Montgomery', 'downtown Montgomery'],
      },
      {
        name:                'Prattville',
        county:              'Autauga',
        population:          37000,
        distanceFromHubMin:  20,
        notes:               `Fastest-growing family suburb. Strong schools relative to
Montgomery proper. Big-box + chain retail anchor + family
restaurants. "Moving to Prattville" is high-intent relocation
search territory.`,
        searchModifiers:     ['Prattville AL', 'in Prattville', 'Prattville schools'],
      },
      {
        name:                'Pike Road',
        county:              'Montgomery',
        population:          11000,
        distanceFromHubMin:  20,
        notes:               `School-driven family destination. Pike Road Schools is THE
keyword cluster — high-income relocation, strong school ratings,
intense parent engagement. Lower commercial volume but
disproportionate authority value.`,
        searchModifiers:     ['Pike Road AL', 'in Pike Road', 'Pike Road schools', 'Pike Road Elementary'],
      },
      {
        name:                'Wetumpka',
        county:              'Elmore',
        population:          8500,
        distanceFromHubMin:  25,
        notes:               `Growing river-adjacent community. Wetumpka City Schools.
Featured on TV (Home Town Takeover) — has elevated profile.
Tourism crossover with family content opportunity.`,
        searchModifiers:     ['Wetumpka AL', 'in Wetumpka'],
      },
      {
        name:                'Millbrook',
        county:              'Elmore',
        population:          15000,
        distanceFromHubMin:  20,
        notes:               `Family-residential, lower commercial density. Stanhope-Elmore
High district. Worth claiming for "Millbrook events" + community
content before competitors do.`,
        searchModifiers:     ['Millbrook AL', 'in Millbrook'],
      },
      {
        name:                'Tallassee',
        county:              'Elmore',
        population:          5000,
        distanceFromHubMin:  30,
        notes:               `Smaller community on the east edge. Less competition; capture
"Tallassee family events" type searches at low cost.`,
        searchModifiers:     ['Tallassee AL'],
      },
    ],
    institutions: [
      { name: 'Montgomery Public Schools',  kind: 'school-system',  notes: 'Largest district, faces persistent quality challenges driving suburban migration.' },
      { name: 'Pike Road Schools',          kind: 'school-system',  notes: 'Smaller but strong-rated K-12 — major draw for relocating families.' },
      { name: 'Autauga County Schools',     kind: 'school-system',  notes: 'Serves Prattville families.' },
      { name: 'Elmore County Schools',      kind: 'school-system',  notes: 'Serves Millbrook, Wetumpka families.' },
      { name: 'Baptist Health',             kind: 'hospital-system', notes: 'Major regional health system; pediatric services + family practice.' },
      { name: 'Jackson Hospital',           kind: 'hospital-system', notes: 'Independent hospital downtown.' },
      { name: 'Maxwell-Gunter AFB',         kind: 'military',        notes: 'Significant employer; high PCS turnover = recurring newcomer content demand.' },
      { name: 'Alabama State University',   kind: 'university',      notes: 'HBCU in Montgomery; community + cultural relevance.' },
      { name: 'Auburn University Montgomery', kind: 'university',    notes: 'Branch campus; family-related programs + events.' },
      { name: 'Montgomery Biscuits',        kind: 'culture',         notes: 'Minor-league baseball; family-friendly affordable evenings.' },
    ],
    regionalShorthand: ['River Region', 'Tri-County', 'Capital City'],
  },

  // ── Mobile Bay Parents (Mobile + Eastern Shore, AL) ──────────────────
  mbp: {
    hubLabel:        'Mobile Bay',
    serviceAreaPop:  410000,
    culturalNotes:   `Coastal Alabama, deep Mardi Gras culture (oldest Mardi Gras in
the US — distinct from New Orleans). Heavy military presence
(Coast Guard, naval), aerospace (Airbus), shipbuilding. Hot,
humid summers drive year-round outdoor + water content. Mobile
proper + Eastern Shore (Daphne, Fairhope, Spanish Fort) are
distinct culturally — Fairhope artsy + upscale, Daphne suburban
growth, Mobile urban historic. Strong Catholic family tradition.`,
    subAreas: [
      { name: 'Mobile',         county: 'Mobile',  notes: 'Urban hub, historic. Largest population.', searchModifiers: ['Mobile AL', 'in Mobile'] },
      { name: 'Daphne',         county: 'Baldwin', notes: 'Fastest-growing Eastern Shore suburb. Strong schools, family relocation target.', searchModifiers: ['Daphne AL'] },
      { name: 'Fairhope',       county: 'Baldwin', notes: 'Upscale artsy small town. High income, strong schools, walkable downtown.', searchModifiers: ['Fairhope AL'] },
      { name: 'Spanish Fort',   county: 'Baldwin', notes: 'Eastern Shore growth community. Newer schools.', searchModifiers: ['Spanish Fort AL'] },
      { name: 'Saraland',       county: 'Mobile',  notes: 'Mobile northern suburb.', searchModifiers: ['Saraland AL'] },
    ],
    institutions: [
      { name: 'Mobile County Public Schools', kind: 'school-system', notes: 'Largest district, mixed performance.' },
      { name: 'Baldwin County Public Schools', kind: 'school-system', notes: 'Eastern Shore schools, strong rated.' },
      { name: 'USA Health Children\'s & Women\'s Hospital', kind: 'hospital-system', notes: 'Pediatric specialty hub.' },
      { name: 'Mobile Mardi Gras', kind: 'culture', notes: 'Family parades + tradition — content niche unique to this market.' },
    ],
    regionalShorthand: ['Mobile Bay', 'Eastern Shore', 'Coastal Alabama', 'Lower Alabama'],
  },

  // ── Auburn Opelika Parents ──────────────────────────────────────────
  aop: {
    hubLabel:        'Auburn-Opelika',
    serviceAreaPop:  165000,
    culturalNotes:   `College town gravity. Auburn University dominates culture +
economy + calendar. Game weekends shape the entire region.
Strong faculty + grad-student family demographic alongside
working-class Opelika families. Opelika has revitalized
downtown, charter school + maker culture.`,
    subAreas: [
      { name: 'Auburn',     county: 'Lee',   notes: 'University hub + family residential mix. Strong public schools.', searchModifiers: ['Auburn AL'] },
      { name: 'Opelika',    county: 'Lee',   notes: 'Smaller, growing, mixed-economy. Distinct identity from Auburn.', searchModifiers: ['Opelika AL'] },
      { name: 'Smiths Station', county: 'Lee', notes: 'Eastern edge family community.', searchModifiers: ['Smiths Station AL'] },
    ],
    institutions: [
      { name: 'Auburn City Schools',  kind: 'school-system', notes: 'Highly rated, drives family relocation.' },
      { name: 'Opelika City Schools', kind: 'school-system', notes: 'Separate district from Auburn.' },
      { name: 'Auburn University',    kind: 'university',    notes: 'Defines the calendar + economy.' },
      { name: 'East Alabama Medical Center', kind: 'hospital-system', notes: 'Regional health system.' },
    ],
    regionalShorthand: ['Auburn-Opelika', 'The Plains', 'East Alabama'],
  },

  // ── Eastern Shore Parents ───────────────────────────────────────────
  esp: {
    hubLabel:        'Eastern Shore',
    serviceAreaPop:  225000,
    culturalNotes:   `Baldwin County's family-coastal lifestyle. Daphne is the growth
engine, Fairhope is the upscale + arts pole, Spanish Fort is
newer schools + family residential. Beaches accessible without
being beach towns. Strong outdoor culture, sailing + soccer +
youth sports prominent. Coastal AL accent + tradition without
the urban density of Mobile.`,
    subAreas: [
      { name: 'Daphne',       county: 'Baldwin', notes: 'Largest Eastern Shore city. Family-residential growth.', searchModifiers: ['Daphne AL'] },
      { name: 'Fairhope',     county: 'Baldwin', notes: 'Upscale, walkable, artsy. Highest-income.', searchModifiers: ['Fairhope AL'] },
      { name: 'Spanish Fort', county: 'Baldwin', notes: 'Newer schools, family-friendly residential.', searchModifiers: ['Spanish Fort AL'] },
      { name: 'Robertsdale',  county: 'Baldwin', notes: 'Rural-suburban edge, agricultural roots.', searchModifiers: ['Robertsdale AL'] },
    ],
    institutions: [
      { name: 'Baldwin County Public Schools', kind: 'school-system', notes: 'Highly rated, primary draw for relocation.' },
      { name: 'USA Health Eastern Shore', kind: 'hospital-system', notes: 'Regional health system anchor.' },
    ],
    regionalShorthand: ['Eastern Shore', 'Baldwin County', 'L.A. (Lower Alabama)'],
  },

  // ── Greater Pensacola Parents ───────────────────────────────────────
  gpp: {
    hubLabel:        'Greater Pensacola',
    serviceAreaPop:  500000,
    culturalNotes:   `Northwest Florida panhandle, Gulf Coast beach culture. Naval
Air Station Pensacola is THE economic anchor — Blue Angels home
+ massive military family population (high PCS turnover). White
sand beaches + family-tourism overlay. Hot summers, mild winters,
hurricane awareness baked in.`,
    subAreas: [
      { name: 'Pensacola',         county: 'Escambia', notes: 'Urban hub, historic, military adjacent.', searchModifiers: ['Pensacola FL'] },
      { name: 'Pace',              county: 'Santa Rosa', notes: 'Fast-growing family suburb. Strong schools.', searchModifiers: ['Pace FL'] },
      { name: 'Milton',            county: 'Santa Rosa', notes: 'River + outdoor recreation, growing.', searchModifiers: ['Milton FL'] },
      { name: 'Gulf Breeze',       county: 'Santa Rosa', notes: 'Coastal upscale, strong schools, beach access.', searchModifiers: ['Gulf Breeze FL'] },
      { name: 'Pensacola Beach',   county: 'Escambia', notes: 'Beach community, tourism + permanent residents.', searchModifiers: ['Pensacola Beach'] },
    ],
    institutions: [
      { name: 'Escambia County School District', kind: 'school-system', notes: 'Largest district.' },
      { name: 'Santa Rosa County Schools', kind: 'school-system', notes: 'Higher-rated alternative serving Pace, Milton, Gulf Breeze.' },
      { name: 'Naval Air Station Pensacola', kind: 'military', notes: 'Massive military family population, recurring PCS = newcomer content demand.' },
      { name: 'Blue Angels', kind: 'culture', notes: 'Year-round air shows + practice = family activity content niche.' },
    ],
    regionalShorthand: ['Greater Pensacola', 'Pensacola Bay Area', 'NWFL', 'the Panhandle'],
  },

  // ── River Region 50+ (Boom) ─────────────────────────────────────────
  rr50plus: {
    hubLabel:        'River Region',
    serviceAreaPop:  370000,
    culturalNotes:   `Same geography as RRP but different audience reality. Many 50+
readers raised their families in Montgomery and have deep
institutional + community memory. Maxwell-Gunter retiree
population is significant. Aging-in-place strong preference over
moving to FL/AZ. Healthcare access + community engagement +
fixed-income value matter more than upscale lifestyle.`,
    subAreas: [
      { name: 'Montgomery',  county: 'Montgomery', notes: 'Urban hub; established healthcare + state government retirees.', searchModifiers: ['Montgomery AL'] },
      { name: 'Prattville',  county: 'Autauga',    notes: 'Suburban retirees + grandparent population.', searchModifiers: ['Prattville AL'] },
      { name: 'Wetumpka',    county: 'Elmore',     notes: 'River + outdoors retirement appeal.', searchModifiers: ['Wetumpka AL'] },
      { name: 'Millbrook',   county: 'Elmore',     notes: 'Residential, aging-in-place common.', searchModifiers: ['Millbrook AL'] },
      { name: 'Pike Road',   county: 'Montgomery', notes: 'Higher-income retirees + active grandparents.', searchModifiers: ['Pike Road AL'] },
    ],
    institutions: [
      { name: 'Baptist Health', kind: 'hospital-system', notes: 'Major regional system; geriatrics + cardiology.' },
      { name: 'Jackson Hospital', kind: 'hospital-system', notes: 'Independent hospital downtown.' },
      { name: 'Maxwell-Gunter AFB', kind: 'military', notes: 'Large retiree population.' },
      { name: 'Montgomery Symphony', kind: 'culture', notes: 'Strong 50+ engagement.' },
      { name: 'Alabama Shakespeare Festival', kind: 'culture', notes: 'Year-round cultural calendar anchor.' },
    ],
    regionalShorthand: ['River Region', 'Tri-County', 'Capital Region'],
  },
}

/** Returns the intel for a brand, or null if not seeded yet. New brands
 *  without intel still work — the seed prompt just doesn't get the
 *  locality preloading. */
export function getMarketIntel(brandSlug: string): MarketIntel | null {
  return MARKET_INTEL[brandSlug] ?? null
}
