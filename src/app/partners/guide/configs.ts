// ── Guide Partner Configs ─────────────────────────────────────────────────────
// One config per guide. Drives all rendering in /partners/guide/[slug].
// Psychological profile (urgency, trustProfile) shapes copy + visual register.

export type GuideUrgency   = 'evergreen' | 'seasonal' | 'time-critical'
export type TrustProfile   = 'browse' | 'research' | 'high-trust' | 'critical-trust'

export interface CategoryConfig {
  name: string
  slug: string
  sponsorOpen: boolean
  intentSignal: string // what families are actively searching for in this category
}

export interface DiscoveryStep {
  timing: string
  surface: string
  moment: string
}

export interface GuideConfig {
  slug: string
  name: string
  shortName: string
  emoji: string
  audience: string
  urgency: GuideUrgency
  trustProfile: TrustProfile

  hero: {
    badge: string
    headline: string
    subheadline: string
  }

  howFamiliesUseIt: string[]
  visitFrequency: string
  researchWindow: string
  peakPeriod: string
  seasonalNote: string

  advertiserInsight: string
  competitiveInsight: string
  urgencyFrame: string

  categories: CategoryConfig[]

  stats: { value: string; label: string }[]

  discoveryJourney: DiscoveryStep[]

  cta: {
    headline: string
    body: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export const GUIDE_CONFIGS: GuideConfig[] = [

  // ── 1. FAMILY RESOURCE GUIDE ──────────────────────────────────────────────
  {
    slug: 'family-resource-guide',
    name: 'Family Resource Guide',
    shortName: 'Resource Guide',
    emoji: '🏡',
    audience: 'River Region families with children of all ages — seeking year-round local resources across 11 categories.',
    urgency: 'evergreen',
    trustProfile: 'research',
    hero: {
      badge: 'Year-Round · Anchor Guide · 11 Categories',
      headline: 'The Guide River Region Families Return to All Year.',
      subheadline: 'The Family Resource Guide is not a one-time search. It is the go-to reference for families every time they have a new need — healthcare, childcare, education, activities, and local services.',
    },
    howFamiliesUseIt: [
      'A new family moves to the River Region. The Guide is the first local resource they find.',
      'A mom needs a new pediatrician. She opens the Guide and evaluates featured listings in her category.',
      'A parent looking for after-school enrichment scrolls through six providers before bookmarking three.',
      'A family moves through child development stages — preschool to elementary, elementary to middle — and returns to the Guide at every transition.',
    ],
    visitFrequency: 'Year-round, multiple visits per family across multiple categories',
    researchWindow: 'Open-ended — families return whenever a new need emerges',
    peakPeriod: 'Back-to-school (Aug–Sep), new year enrollment (Jan–Feb), summer planning (Mar–May)',
    seasonalNote: 'The Family Resource Guide has no off-season. Family needs cycle continuously across healthcare, childcare, activities, and schools. Every month brings new families to a new category.',
    advertiserInsight: 'Your business is not competing for a moment. It is competing for a position in the trusted local landscape that every River Region family navigates throughout the year.',
    competitiveInsight: 'The Family Resource Guide is the first place families look when they move to the region or face a new family decision. A business listed here is one a family considers. A business not here is one they never see.',
    urgencyFrame: 'New families move to the River Region every month. Every month your business is not in the Guide is a month those families find someone else.',
    categories: [
      { name: 'Pediatric & Family Healthcare', slug: 'pediatric-family-healthcare', sponsorOpen: true,  intentSignal: 'Finding a trusted pediatrician, dentist, or specialist — new family or new provider search.' },
      { name: 'Childcare & Early Learning',    slug: 'childcare-early-learning',    sponsorOpen: false, intentSignal: 'Evaluating daycares, preschools, and early childhood programs — often months in advance.' },
      { name: 'Private & Independent Schools', slug: 'private-independent-schools', sponsorOpen: true,  intentSignal: 'Comparing private and parochial school options before enrollment decisions.' },
      { name: 'Sports & Recreation',           slug: 'sports-recreation',           sponsorOpen: true,  intentSignal: 'Youth sports leagues, gymnastics, swim programs, and family activities.' },
      { name: 'Family Services',               slug: 'family-services',             sponsorOpen: true,  intentSignal: 'Family-centered legal, financial, home, and community service providers.' },
      { name: 'Mom Wellness',                  slug: 'mom-wellness',                sponsorOpen: true,  intentSignal: 'Fitness, mental health, self-care, and wellness resources for moms.' },
      { name: 'Shopping & Boutiques',          slug: 'shopping-boutiques',          sponsorOpen: true,  intentSignal: 'Local shops, children\'s clothing, gifts, and family-oriented retail.' },
      { name: 'Tutoring & Academic Enrichment',slug: 'tutoring-enrichment',         sponsorOpen: true,  intentSignal: 'Tutors, learning centers, and academic support for school-age children.' },
      { name: 'Home & Family Services',        slug: 'home-family-services',        sponsorOpen: true,  intentSignal: 'Trusted local contractors, cleaners, and home professionals families use.' },
      { name: 'Farmers Markets & Local Food',  slug: 'farmers-markets',             sponsorOpen: true,  intentSignal: 'Local food sources, markets, and farm-to-table connections.' },
      { name: 'Family Photographers',          slug: 'family-photographers',        sponsorOpen: true,  intentSignal: 'Family portraits, milestone sessions, and newborn photographers.' },
    ],
    stats: [
      { value: '11',         label: 'Categories in this guide' },
      { value: 'Year-round', label: 'Active season — no off-months' },
      { value: '14,000+',    label: 'Households reached in print each month' },
      { value: '9',          label: 'Specialized guides in the full ecosystem' },
    ],
    discoveryJourney: [
      { timing: 'Month 1',  surface: 'Family Resource Guide', moment: 'A new family searches their category. Your featured listing is the first substantive profile they see.' },
      { timing: 'Month 2',  surface: 'RRP Newsletter',        moment: 'Your category is spotlighted in the Tuesday edition. They click through and revisit your profile.' },
      { timing: 'Month 3',  surface: 'Print Magazine',        moment: 'They see your name in the magazine at their pediatrician\'s office. Recognition builds.' },
      { timing: 'Month 4',  surface: 'Editorial Article',     moment: 'An RRP article about your category links to your profile. Editorial credibility transfers.' },
      { timing: 'Month 5',  surface: 'Word of Mouth',         moment: 'A friend mentions your business. They already know the name — they\'ve seen it four times.' },
    ],
    cta: {
      headline: 'See Your Category in the Family Resource Guide.',
      body: 'Jason will show you exactly how your business appears in your category, which positions are still open, and what a visibility strategy looks like for the families your business serves.',
    },
  },

  // ── 2. SUMMER CAMP GUIDE ──────────────────────────────────────────────────
  {
    slug: 'summer-camp-guide',
    name: 'Summer Camp Guide',
    shortName: 'Camp Guide',
    emoji: '⛺',
    audience: 'River Region parents actively planning summer for school-age children — research peaks January through April.',
    urgency: 'time-critical',
    trustProfile: 'research',
    hero: {
      badge: 'Seasonal · Jan–Apr Peak · Registration Fills Early',
      headline: 'Registration Closes. Parents Who Wait Lose the Camps They Wanted.',
      subheadline: 'River Region families start planning summer in January. The Summer Camp Guide is where they research, compare, and shortlist — long before registration opens.',
    },
    howFamiliesUseIt: [
      'Parents begin camp research in January — sometimes earlier — to compare options before spots fill.',
      'Multi-child families use the Guide to find camps that fit different ages, schedules, and interests.',
      'First-time camp parents use it to understand what types of programs exist and what to look for.',
      'Returning families check the Guide each year for new options and to confirm their usual camp is still running.',
    ],
    visitFrequency: 'High intensity January–April; lighter browsing May–December',
    researchWindow: 'January–March (primary planning), April (registration deadline urgency)',
    peakPeriod: 'January through April — the summer planning season',
    seasonalNote: 'The Summer Camp Guide has one critical window. Families who start in January have the most options. Businesses visible when planning season opens capture the majority of registrations before competitors even start marketing.',
    advertiserInsight: 'Summer camp decisions are made months in advance. By the time a parent asks friends for recommendations, they\'ve already shortlisted camps from the Guide. Visibility here means being on that shortlist.',
    competitiveInsight: 'Camps not visible in the Guide when planning season opens are invisible during the most important research window of the year. Families don\'t wait for marketing — they fill spots.',
    urgencyFrame: 'Registration opens and closes on a fixed calendar. Camps visible in the Guide when planning season starts capture the first-mover advantage — before competitors.',
    categories: [
      { name: 'Day Camps & General Programs',       slug: 'day-camps',           sponsorOpen: true,  intentSignal: 'Full-day summer programs with structured activities for elementary-age kids.' },
      { name: 'Academic & Enrichment Camps',        slug: 'academic-enrichment', sponsorOpen: true,  intentSignal: 'Keeping kids learning and engaged without falling behind over summer.' },
      { name: 'Sports & Athletics Camps',           slug: 'sports-athletics',    sponsorOpen: true,  intentSignal: 'Sport-specific training and multi-sport programs for competitive kids.' },
      { name: 'Arts, Drama & Performing Arts',      slug: 'arts-performing',     sponsorOpen: true,  intentSignal: 'Creative programs in visual arts, theater, music, and dance.' },
      { name: 'STEM & Technology Programs',         slug: 'stem-technology',     sponsorOpen: true,  intentSignal: 'Coding, robotics, science, and technology-focused summer learning.' },
      { name: 'Special Needs & Inclusive Programs', slug: 'special-needs-camps', sponsorOpen: true,  intentSignal: 'Summer programs that accommodate children with diverse needs.' },
      { name: 'Overnight & Residential Camps',      slug: 'overnight-camps',     sponsorOpen: true,  intentSignal: 'Multi-week overnight experiences for older children and teens.' },
    ],
    stats: [
      { value: 'Jan–Apr', label: 'Peak planning season' },
      { value: '7',       label: 'Camp categories in this guide' },
      { value: 'Months',  label: 'Before opening, most parents start researching' },
      { value: 'Limited', label: 'Spots per program — early visibility wins' },
    ],
    discoveryJourney: [
      { timing: 'January',   surface: 'Summer Camp Guide', moment: 'She opens the Guide in January. Your camp is featured at the top of your category. She reads the editorial description and bookmarks it.' },
      { timing: 'February',  surface: 'Newsletter',        moment: 'The newsletter runs a summer planning spotlight. Your camp is mentioned. She remembers seeing your name before.' },
      { timing: 'March',     surface: 'Social Media',      moment: 'An RRP post about local camps. Friends share it. Your camp\'s name appears. Social proof builds.' },
      { timing: 'April',     surface: 'Print Magazine',    moment: 'The spring issue has a summer camp feature. Your name is there. She\'s seen it four times. She registers.' },
    ],
    cta: {
      headline: 'Be Visible Before Registration Season Opens.',
      body: 'Families who plan earliest choose first. Jason will show you how your camp appears in the Guide and which category positions are still available before the season begins.',
    },
  },

  // ── 3. CHILDCARE GUIDE ────────────────────────────────────────────────────
  {
    slug: 'childcare-guide',
    name: 'Childcare Guide',
    shortName: 'Childcare Guide',
    emoji: '🧸',
    audience: 'Parents seeking infant care, toddler programs, preschool, and after-school options — often researching months before they need placement.',
    urgency: 'evergreen',
    trustProfile: 'high-trust',
    hero: {
      badge: 'High-Trust Decision · Waitlists Form Early · Year-Round',
      headline: 'Parents Don\'t Rush This Decision. They Research — For Months.',
      subheadline: 'Childcare is the most deliberate decision most parents make. Families use the Childcare Guide over weeks and months, returning repeatedly as they narrow options and weigh trust.',
    },
    howFamiliesUseIt: [
      'Expecting parents begin researching childcare during pregnancy — sometimes a year before they need placement.',
      'Families returning from leave have a narrow window. They research intensively across multiple providers.',
      'Parents compare not just price and availability — they compare philosophy, environment, and reputation.',
      'Once a child ages out of one program, families return to research the next stage.',
    ],
    visitFrequency: 'Intense multi-week research sessions; returned across multiple development stages',
    researchWindow: 'Months before care is needed — often beginning during pregnancy or 6+ months in advance',
    peakPeriod: 'Year-round; secondary peaks in January (new year placements) and August (school-year enrollment)',
    seasonalNote: 'Childcare decisions don\'t follow a single season — they follow a child\'s development. Families with infants, toddlers, and preschoolers are always in some stage of this search.',
    advertiserInsight: 'Families using the Childcare Guide are not browsing — they are deeply evaluating. A program with a strong editorial profile, professional photo, and credible community presence converts at far higher rates than a text-only listing.',
    competitiveInsight: 'Childcare is a trust-first decision. Families eliminate providers that don\'t appear credible before they ever visit. Visibility here means being in the consideration set. Invisibility means being pre-eliminated.',
    urgencyFrame: 'Waitlists form because families who start their research earliest get the best placements. Being visible when they begin means being on their shortlist before competitors know they\'re looking.',
    categories: [
      { name: 'Infant & Toddler Care',      slug: 'infant-toddler',    sponsorOpen: false, intentSignal: 'Safe, nurturing care for children under 3. Extremely high trust requirement.' },
      { name: 'Preschool & Pre-K Programs', slug: 'preschool-prek',    sponsorOpen: true,  intentSignal: 'Early education for ages 3–5. Families compare curriculum, teachers, and learning environment.' },
      { name: 'Full-Day Childcare Centers', slug: 'full-day-centers',  sponsorOpen: true,  intentSignal: 'Working parents seeking licensed full-time programs with reliable, flexible hours.' },
      { name: 'After-School Childcare',     slug: 'after-school-care', sponsorOpen: true,  intentSignal: 'Reliable pickup and care from school dismissal through evening for working families.' },
      { name: 'In-Home & Family Care',      slug: 'in-home-family',    sponsorOpen: true,  intentSignal: 'Smaller, personal settings — home-based and family daycare providers.' },
      { name: 'Special Needs Early Care',   slug: 'special-needs-early',sponsorOpen: true,  intentSignal: 'Programs with early intervention expertise and inclusive care for diverse learners.' },
    ],
    stats: [
      { value: 'Months',     label: 'Typical research window before placement' },
      { value: 'High',       label: 'Trust requirement — families read every word' },
      { value: 'Waitlists',  label: 'Form at the best programs — early visibility wins' },
      { value: 'Year-round', label: 'Families always in a stage of this search' },
    ],
    discoveryJourney: [
      { timing: '6 months out', surface: 'Childcare Guide',   moment: 'She\'s expecting. She opens the Guide to understand her options. Your featured listing is the first result in her category.' },
      { timing: '4 months out', surface: 'Editorial Article', moment: 'She reads an RRP article about choosing childcare in the River Region. Your program is cited as a trusted local resource.' },
      { timing: '2 months out', surface: 'Newsletter',        moment: 'A childcare spotlight in the weekly newsletter. Your program is mentioned. She clicks to your profile and reads everything.' },
      { timing: '1 month out',  surface: 'Word of Mouth',     moment: 'She asks friends for recommendations. Several have already seen your name through RRP.' },
      { timing: 'Tour',         surface: 'Decision',          moment: 'She schedules a tour. She already trusts you — she\'s seen your name everywhere she trusts.' },
    ],
    cta: {
      headline: 'Be the First Name They Trust.',
      body: 'Childcare is a trust-first decision built over months of research. Jason will show you how your program appears to families in the early stages of their search and what visibility looks like at each level of the guide.',
    },
  },

  // ── 4. PRIVATE SCHOOL GUIDE ───────────────────────────────────────────────
  {
    slug: 'private-school-guide',
    name: 'Private School Guide',
    shortName: 'School Guide',
    emoji: '📚',
    audience: 'Families researching private and parochial school options for K–12 — primarily during the fall enrollment window.',
    urgency: 'seasonal',
    trustProfile: 'high-trust',
    hero: {
      badge: 'Fall Enrollment · Tour Season Oct–Jan · High-Stakes Decision',
      headline: 'Families Research Here Before They Ever Schedule a Tour.',
      subheadline: 'The Private School Guide is where deliberate River Region families start — comparing philosophies, programs, and reputations long before they contact an admissions office.',
    },
    howFamiliesUseIt: [
      'Families beginning their school search use the Guide to understand what private school options exist in the region.',
      'Parents compare academic philosophy, religious affiliation, extracurriculars, and location before creating a shortlist.',
      'Families relocating to the River Region use the Guide to evaluate schools before deciding which neighborhood to settle in.',
      'Parents re-evaluate options at key transitions — elementary to middle, middle to high school.',
    ],
    visitFrequency: 'Intensive October–January; lighter browsing year-round',
    researchWindow: 'Fall enrollment season — October through January for most schools',
    peakPeriod: 'October–January (tour season and application deadlines)',
    seasonalNote: 'Private school admissions operates on a fixed annual calendar. Families who research in October make decisions in January. Visibility during this window determines who gets on the tour shortlist.',
    advertiserInsight: 'Private school admissions is a deliberate, high-stakes process. Families spend weeks researching before they tour. The guide is where they begin — and first impressions here determine whether a school makes the shortlist.',
    competitiveInsight: 'Families touring private schools have typically pre-selected their shortlist from research. Schools not visible in the guide during research season are not on the shortlist — regardless of what they offer.',
    urgencyFrame: 'Applications close on a fixed calendar. Schools that build visibility before tour season begins fill seats more easily. The guide is where that visibility starts.',
    categories: [
      { name: 'Pre-K & Kindergarten Programs',    slug: 'prek-kindergarten',    sponsorOpen: true,  intentSignal: 'Families making their first private education decision — high emphasis on environment and values fit.' },
      { name: 'Elementary Schools (K–5)',          slug: 'elementary-schools',   sponsorOpen: true,  intentSignal: 'Core academic years — families compare curriculum, class sizes, and teacher quality.' },
      { name: 'Middle Schools (6–8)',              slug: 'middle-schools',       sponsorOpen: true,  intentSignal: 'Transition-age families seeking structure, values formation, and academic preparation.' },
      { name: 'High Schools (9–12)',               slug: 'high-schools',         sponsorOpen: true,  intentSignal: 'College-preparatory programs, AP courses, extracurriculars, and faith-based formation.' },
      { name: 'Specialty & Alternative Education', slug: 'specialty-schools',    sponsorOpen: true,  intentSignal: 'Montessori, classical, Waldorf, and other alternative education models.' },
      { name: 'Tutoring & Academic Support',       slug: 'tutoring-support',     sponsorOpen: true,  intentSignal: 'Supplemental support for private school students — test prep, subject tutoring, learning specialists.' },
    ],
    stats: [
      { value: 'Oct–Jan',      label: 'Primary research and enrollment window' },
      { value: 'Months',       label: 'Families research before submitting applications' },
      { value: 'High-stakes',  label: 'Decision type — trust and credibility are paramount' },
      { value: 'Annual',       label: 'Enrollment cycle — one window per year' },
    ],
    discoveryJourney: [
      { timing: 'October',  surface: 'Private School Guide', moment: 'She starts researching. Your school\'s featured profile — with editorial description — is the first substantive impression she gets.' },
      { timing: 'November', surface: 'Newsletter',           moment: 'An RRP fall enrollment spotlight. Your school\'s name appears alongside editorial context. Trust transfers.' },
      { timing: 'December', surface: 'Print Magazine',       moment: 'She sees your school in the print guide at a community event. The name is now familiar.' },
      { timing: 'January',  surface: 'Tour Scheduled',       moment: 'She schedules a tour. She already has a positive impression — built over three months of trusted exposure.' },
    ],
    cta: {
      headline: 'Be on the Shortlist Before Tour Season Opens.',
      body: 'Families researching private schools decide based on trusted early impressions. Jason will show you what your school\'s profile looks like in the guide and how to be visible before families start scheduling tours.',
    },
  },

  // ── 5. HEALTHY KIDS GUIDE ─────────────────────────────────────────────────
  {
    slug: 'healthy-kids-guide',
    name: 'Healthy Kids Guide',
    shortName: 'Health Guide',
    emoji: '🩺',
    audience: 'River Region parents seeking pediatric healthcare providers — pediatricians, dentists, specialists, and family health services.',
    urgency: 'evergreen',
    trustProfile: 'critical-trust',
    hero: {
      badge: 'Critical Trust · Year-Round · Referral-Driven Discovery',
      headline: 'Families Don\'t Choose Their Pediatrician From an Instagram Ad.',
      subheadline: 'Healthcare decisions require the highest level of trust. The Healthy Kids Guide is where River Region families research pediatric providers — through editorial context, community reputation, and 30 years of trusted local positioning.',
    },
    howFamiliesUseIt: [
      'New families moving to the region use the Guide to find a pediatrician before they arrive.',
      'Parents seeking specialists — allergists, therapists, orthodontists — search the Guide by provider type.',
      'Families whose provider retires or moves use the Guide as their first search resource.',
      'Parents recommend providers to friends by saying "look them up in the RRP guide."',
    ],
    visitFrequency: 'Year-round; new families constantly entering the search',
    researchWindow: 'Open-ended — healthcare needs arise at all life stages',
    peakPeriod: 'Year-round; back-to-school checkup season (Jul–Sep) drives a secondary spike',
    seasonalNote: 'Healthcare needs don\'t follow a season. New families move in monthly, children develop new needs, and parents are always looking for trusted specialists. Every month matters in this guide.',
    advertiserInsight: 'Healthcare providers are chosen through trust, not price comparison. A practice that appears credibly positioned in the Healthy Kids Guide — with an editorial description and community association — earns consideration before families ever call.',
    competitiveInsight: 'Families new to the River Region have no local referral network yet. The Healthy Kids Guide is their first trusted source for providers. Practices visible here are the first ones called.',
    urgencyFrame: 'Every family that moves to the River Region starts their healthcare search somewhere. If that search lands in this guide and your practice isn\'t there — they\'re calling your competitor.',
    categories: [
      { name: 'Pediatricians & Family Practice',   slug: 'pediatricians',           sponsorOpen: true, intentSignal: 'Primary care for children of any age — new family or new provider search.' },
      { name: 'Pediatric Dentistry',               slug: 'pediatric-dentistry',      sponsorOpen: true, intentSignal: 'First visits, ongoing care, and kid-friendly dentists families can grow with.' },
      { name: 'Orthodontics',                      slug: 'orthodontics',             sponsorOpen: true, intentSignal: 'Braces, aligners, and orthodontic evaluations for school-age children and teens.' },
      { name: 'Pediatric Specialists',             slug: 'pediatric-specialists',    sponsorOpen: true, intentSignal: 'Allergists, ENTs, neurologists, and specialists for specific health needs.' },
      { name: 'Mental & Behavioral Health',        slug: 'mental-behavioral-health', sponsorOpen: true, intentSignal: 'Therapists, counselors, and psychiatrists for children — extremely high trust requirement.' },
      { name: 'Physical & Occupational Therapy',   slug: 'therapy-services',         sponsorOpen: true, intentSignal: 'Developmental, post-injury, and ongoing therapy for children of all ages.' },
      { name: 'Vision & Eye Care',                 slug: 'vision-eye-care',          sponsorOpen: true, intentSignal: 'Pediatric optometrists and vision care for school-age vision checks and prescriptions.' },
    ],
    stats: [
      { value: 'Critical',      label: 'Trust level — families research extensively before choosing' },
      { value: 'Year-round',    label: 'Active search — new families arrive every month' },
      { value: 'Referral-led',  label: 'How most practices grow — this is where referrals start' },
      { value: '30+ years',     label: 'Of RRP community trust transferred to listed businesses' },
    ],
    discoveryJourney: [
      { timing: 'Day 1 in region', surface: 'Healthy Kids Guide', moment: 'A new family moves to Montgomery. Before they unpack, they search for a pediatrician. Your practice is featured at the top.' },
      { timing: 'Week 2',          surface: 'Newsletter',         moment: 'They\'ve subscribed to the RRP newsletter. A healthcare spotlight. Your practice name appears again.' },
      { timing: 'Month 1',         surface: 'Word of Mouth',      moment: 'They mention at a neighborhood gathering they\'re still looking. A neighbor says "we see them — they\'re in the RRP guide."' },
      { timing: 'Month 1',         surface: 'First Call',         moment: 'They call. You\'re the practice whose name they\'ve heard most since arriving. Trust already exists.' },
    ],
    cta: {
      headline: 'Be the Practice New Families Call First.',
      body: 'Healthcare is the highest-trust decision families make. Jason will show you how your practice appears in the Healthy Kids Guide and what community visibility looks like for practices building long-term patient relationships.',
    },
  },

  // ── 6. SUMMER FUN GUIDE ───────────────────────────────────────────────────
  {
    slug: 'summer-fun-guide',
    name: 'Summer Fun Guide',
    shortName: 'Fun Guide',
    emoji: '☀️',
    audience: 'River Region families looking for activities, events, and adventures during summer — browsing with open minds and free weekends.',
    urgency: 'seasonal',
    trustProfile: 'browse',
    hero: {
      badge: 'Seasonal · Jun–Aug · High Browse Volume · Same-Day Decisions',
      headline: 'They Have a Free Saturday. They\'re Looking for Something to Do.',
      subheadline: 'The Summer Fun Guide is browsed, not researched. Families open it with an open mind and a free afternoon — looking for inspiration. Visibility here means being the answer they didn\'t know they were looking for.',
    },
    howFamiliesUseIt: [
      'Families scroll on a Friday evening planning the next day. They want inspiration, not comparison.',
      'Parents share guide links in moms groups: "What are we doing this weekend?" The Summer Fun Guide gets linked.',
      'Visiting grandparents and relatives use the Guide to find something special to do with the kids.',
      'Families treat it as a summer bucket list — revisiting it multiple times across the season.',
    ],
    visitFrequency: 'High June–August; repeat visits within the season',
    researchWindow: 'In-season — decisions often made within hours of opening the guide',
    peakPeriod: 'June, July, August — with holiday weekend spikes',
    seasonalNote: 'The Summer Fun Guide is the only guide where discovery and decision happen in the same session. Families open it, see something that looks fun, and go. A featured position means immediate action.',
    advertiserInsight: 'This guide captures families in inspiration mode — open to anything that looks like a great time. A business with a compelling photo, category-leading position, and direct booking link converts faster here than in any other guide.',
    competitiveInsight: 'In browse mode, families choose what catches their eye first. A featured position at the top of a category means being the obvious choice when they\'re ready to go — before they scroll to competitors.',
    urgencyFrame: 'The summer season is finite. Families have 12 weekends. Every weekend they spend somewhere else is a weekend they didn\'t spend with you.',
    categories: [
      { name: 'Pools, Splash Pads & Water Fun',    slug: 'water-fun',            sponsorOpen: true, intentSignal: 'Water-based activities for hot summer days — admission, hours, and what to expect.' },
      { name: 'Outdoor Adventures & Parks',         slug: 'outdoor-adventures',   sponsorOpen: true, intentSignal: 'Hiking, playgrounds, nature centers, and outdoor family experiences.' },
      { name: 'Family Entertainment Centers',       slug: 'family-entertainment', sponsorOpen: true, intentSignal: 'Arcades, mini golf, bowling, and indoor/outdoor activity venues.' },
      { name: 'Arts, Crafts & Creative Activities', slug: 'arts-crafts',          sponsorOpen: true, intentSignal: 'Paint parties, pottery, hands-on creative experiences for families.' },
      { name: 'Dining & Summer Treats',             slug: 'dining-treats',        sponsorOpen: true, intentSignal: 'Family-friendly restaurants, ice cream, shaved ice, and local favorites.' },
      { name: 'Events & Community Festivals',       slug: 'events-festivals',     sponsorOpen: true, intentSignal: 'Local events, concerts, festivals, and family gatherings throughout the summer.' },
    ],
    stats: [
      { value: 'Jun–Aug',    label: 'Active season' },
      { value: 'Same-day',   label: 'Decision cycle — families act on inspiration quickly' },
      { value: 'High',       label: 'Browse traffic across the summer months' },
      { value: '12',         label: 'Summer weekends — every one is a visibility opportunity' },
    ],
    discoveryJourney: [
      { timing: 'Friday, 7pm',   surface: 'Summer Fun Guide', moment: 'She opens the guide wondering what to do tomorrow. Your business is featured at the top of its category with a great photo.' },
      { timing: 'Friday, 7:05pm',surface: 'Website',          moment: 'She clicks through. Checks hours. Looks at photos. Decides this is exactly what they need.' },
      { timing: 'Saturday, 10am',surface: 'Visit',            moment: 'The whole family arrives. They post about it on social media.' },
      { timing: 'Next week',     surface: 'Word of Mouth',    moment: 'She tells three friends. "We found it in the River Region Parents Summer Fun Guide." The referral loop begins.' },
    ],
    cta: {
      headline: 'Be the Answer to "What Are We Doing This Weekend?"',
      body: 'The Summer Fun Guide is where River Region families go when they\'re ready to do something. Jason will show you how your business appears and which category positions are still available for this season.',
    },
  },

  // ── 7. BIRTHDAY PARTY GUIDE ───────────────────────────────────────────────
  {
    slug: 'birthday-party-guide',
    name: 'Birthday Party Guide',
    shortName: 'Party Guide',
    emoji: '🎂',
    audience: 'Parents planning birthday parties — venues, entertainment, cakes, and experiences — typically 4–8 weeks before the event.',
    urgency: 'time-critical',
    trustProfile: 'research',
    hero: {
      badge: 'Annual Urgency · Dates Book Out · Year-Round',
      headline: 'Every Child Has a Birthday. Every Parent Starts Somewhere.',
      subheadline: 'The Birthday Party Guide is where River Region parents go when planning begins — comparing venues, entertainment, and services before the date gets closer and availability disappears.',
    },
    howFamiliesUseIt: [
      'Parents start searching 4–8 weeks out. They need options fast, and the best venues book quickly.',
      'Multi-child families use the Guide annually — it\'s their first stop every year, every birthday.',
      'Parents looking for something different use the Guide to discover options they didn\'t know existed.',
      'Moms share Guide links in group chats when someone asks for venue recommendations.',
    ],
    visitFrequency: 'Year-round — birthdays happen every month; each family visits annually',
    researchWindow: '4–8 weeks before the birthday; popular venues book 2–3 months ahead',
    peakPeriod: 'Year-round; spring and summer see higher volume for outdoor venues',
    seasonalNote: 'Birthdays don\'t have an off-season. Every month, River Region families are planning parties. The guide is active year-round — and the businesses visible in it get booked year-round.',
    advertiserInsight: 'Birthday party decisions move fast once planning starts. Families that find a venue that looks right, fits the price, and has availability — book it. Visibility here puts your business in front of families in active booking mode.',
    competitiveInsight: 'Parents share venue recommendations constantly in moms groups. But when someone doesn\'t have a recommendation, the Guide is the first stop. Being visible means being bookable.',
    urgencyFrame: 'Dates book out. Parents who wait lose availability. Businesses in the Guide get contacted by families who are ready to book — not browsing indefinitely.',
    categories: [
      { name: 'Venues & Party Spaces',        slug: 'venues-spaces',           sponsorOpen: true, intentSignal: 'The right space for the party — indoor, outdoor, themed, or flexible.' },
      { name: 'Entertainment & Performers',   slug: 'entertainment-performers', sponsorOpen: true, intentSignal: 'Face painters, magicians, characters, DJs, and interactive entertainment.' },
      { name: 'Cakes, Treats & Desserts',     slug: 'cakes-treats',            sponsorOpen: true, intentSignal: 'Custom cakes, cupcakes, dessert tables, and specialty treats for celebrations.' },
      { name: 'Party Planning & Coordination',slug: 'planning-coordination',    sponsorOpen: true, intentSignal: 'Full-service planners and day-of coordinators for stress-free parties.' },
      { name: 'Party Supplies & Rentals',     slug: 'supplies-rentals',        sponsorOpen: true, intentSignal: 'Inflatables, décor, tableware, and rental supplies.' },
      { name: 'Photography & Memories',       slug: 'photography-memories',    sponsorOpen: true, intentSignal: 'Party photographers and videographers capturing the celebration.' },
    ],
    stats: [
      { value: 'Every month', label: 'River Region families planning parties' },
      { value: '4–8 weeks',   label: 'Typical planning window before the date' },
      { value: 'Year-round',  label: 'Active guide — birthdays have no off-season' },
      { value: 'High intent', label: 'Families in the Guide are actively booking' },
    ],
    discoveryJourney: [
      { timing: 'Day 1',    surface: 'Birthday Party Guide', moment: 'Planning begins. She opens the Guide. Your venue is featured at the top of its category with photos and an editorial description.' },
      { timing: 'Day 2',    surface: 'Website',              moment: 'She clicks through. Checks availability for the date. Sends an inquiry.' },
      { timing: 'Day 3',    surface: 'Booking',              moment: 'She books. The Guide was the starting point — you were the first impressive option she saw.' },
      { timing: 'Post-party',surface: 'Referral',            moment: 'She tells everyone at the party where she found the venue. "The River Region Parents guide — look it up."' },
    ],
    cta: {
      headline: 'Be the First Venue Families Call When Planning Starts.',
      body: 'Birthday party planning moves fast. Jason will show you how your business appears in the Birthday Party Guide and what visibility looks like when families are in active booking mode.',
    },
  },

  // ── 8. AFTER-SCHOOL GUIDE ─────────────────────────────────────────────────
  {
    slug: 'afterschool-guide',
    name: 'After-School Guide',
    shortName: 'After-School Guide',
    emoji: '🎨',
    audience: 'River Region parents seeking structured afternoon programs for school-age children — arts, sports, academics, and enrichment.',
    urgency: 'seasonal',
    trustProfile: 'research',
    hero: {
      badge: 'Fall Window · Aug–Sep Peak · Annual Enrollment Decision',
      headline: 'The Fall Enrollment Window Opens in August. It Closes Fast.',
      subheadline: 'River Region families decide where their children spend their afternoons in August and September. The After-School Guide is where those decisions start — and where early visibility wins enrollments.',
    },
    howFamiliesUseIt: [
      'Parents start evaluating after-school options in late July — before school starts.',
      'Multi-child families look for programs that work across different school schedules and age groups.',
      'Parents compare activities, not just care — they want enrichment and growth, not just supervision.',
      'Programs that fill early gain word-of-mouth momentum that carries through the whole school year.',
    ],
    visitFrequency: 'High July–September; moderate February–March for spring enrollment',
    researchWindow: 'July–September (fall); February–March (spring)',
    peakPeriod: 'August and September — the fall enrollment decision window',
    seasonalNote: 'After-school programs run on the academic calendar. The most critical window is July–September. Programs visible before school starts fill seats before competitors who wait until school is already in session.',
    advertiserInsight: 'After-school decisions are made during a finite window — and families who decide in August have the most options. Being visible in the Guide when the window opens means being on the shortlist before families start asking around.',
    competitiveInsight: 'Programs that fill early create waiting lists. Programs with waiting lists get word-of-mouth referrals. The cycle starts with early visibility — and the Guide is where that visibility begins.',
    urgencyFrame: 'Fall enrollment opens in August and typically closes by October. Programs visible before school starts fill faster. The window is short.',
    categories: [
      { name: 'Arts, Music & Creative Programs',    slug: 'arts-music-creative',   sponsorOpen: true, intentSignal: 'Visual arts, music lessons, theater, and creative enrichment after school.' },
      { name: 'Sports & Athletic Programs',          slug: 'sports-athletic',        sponsorOpen: true, intentSignal: 'Structured practices, individual training, and team programs for school-age kids.' },
      { name: 'Academic Enrichment & Tutoring',      slug: 'academic-enrichment',    sponsorOpen: true, intentSignal: 'Homework help, academic support, and enrichment keeping kids learning after school.' },
      { name: 'STEM & Technology',                   slug: 'stem-technology',        sponsorOpen: true, intentSignal: 'Coding, robotics, science clubs, and technology programs for curious kids.' },
      { name: 'Character & Values Programs',         slug: 'character-values',       sponsorOpen: true, intentSignal: 'Faith-based, community service, and character-building programs.' },
      { name: 'Special Needs & Adaptive Programs',   slug: 'special-needs-adaptive', sponsorOpen: true, intentSignal: 'After-school with adaptive structures for children with diverse learning needs.' },
    ],
    stats: [
      { value: 'Aug–Sep',    label: 'Peak enrollment window' },
      { value: 'Annual',     label: 'Decision — made anew each school year' },
      { value: 'Multi-child',label: 'Families often searching for several kids simultaneously' },
      { value: 'Early',      label: 'Programs that fill early gain year-round referral momentum' },
    ],
    discoveryJourney: [
      { timing: 'Late July',    surface: 'After-School Guide', moment: 'She\'s thinking about fall before school starts. She opens the Guide. Your program is featured in its category.' },
      { timing: 'August 1',     surface: 'Newsletter',         moment: 'Back-to-school spotlight in the newsletter. After-school programs featured. Your name appears.' },
      { timing: 'August 10',    surface: 'Social Media',       moment: 'An RRP post about fall enrollment. A friend comments she\'s enrolling at your program.' },
      { timing: 'August 15',    surface: 'Enrollment',         moment: 'She enrolls before school starts. Your program fills before September. Waiting list begins.' },
    ],
    cta: {
      headline: 'Fill Your Fall Roster Before School Starts.',
      body: 'The after-school enrollment window is short and decisive. Jason will show you how your program appears in the Guide and what visibility looks like during the critical August enrollment period.',
    },
  },

  // ── 9. SPECIAL NEEDS GUIDE ────────────────────────────────────────────────
  {
    slug: 'special-needs-guide',
    name: 'Special Needs Guide',
    shortName: 'Special Needs Guide',
    emoji: '💙',
    audience: 'Parents of children with diverse needs — developmental, medical, behavioral, and educational — seeking specialized providers and support.',
    urgency: 'evergreen',
    trustProfile: 'critical-trust',
    hero: {
      badge: 'Critical Trust · Mission-Driven Businesses · Year-Round',
      headline: 'These Families Aren\'t Browsing. They\'re Searching for Help.',
      subheadline: 'The Special Needs Guide is used by parents navigating some of the most important decisions of their lives. Editorial voice, community reputation, and trusted positioning matter more here than in any other guide in the ecosystem.',
    },
    howFamiliesUseIt: [
      'Parents of newly diagnosed children use the Guide to understand what local resources even exist in the region.',
      'Families relocating to the River Region use it to rebuild their provider network before they arrive.',
      'Parents share guide links in special needs support communities — "this is where we found our OT."',
      'Families return as their child\'s needs evolve — from early intervention through school years and beyond.',
    ],
    visitFrequency: 'Deep, purposeful research sessions — families read every word, multiple visits',
    researchWindow: 'Open-ended — needs change as children grow; continuous discovery across stages',
    peakPeriod: 'Year-round; IEP seasons (fall/spring) drive secondary spikes in specific categories',
    seasonalNote: 'Special needs families are always in some stage of research. A new diagnosis, a new school year, a new therapy need — the Guide is consulted at every transition. There is no off-season here.',
    advertiserInsight: 'Families using the Special Needs Guide read editorial descriptions carefully. They look for evidence of experience, compassion, and community reputation. A strong guide profile is the difference between a call and a scroll past.',
    competitiveInsight: 'Special needs families share resources extensively in support communities. A provider that appears credibly in this guide — with editorial context and community association — becomes the provider recommended in every support group in the region.',
    urgencyFrame: 'These families are searching for help, not options. A provider with a trusted presence in this guide becomes the first call — before families ask anyone else.',
    categories: [
      { name: 'OT, PT & Speech Therapy',      slug: 'therapy-services',        sponsorOpen: true, intentSignal: 'Qualified OT, PT, and speech therapy with pediatric specialization and availability.' },
      { name: 'Behavioral & Mental Health',   slug: 'behavioral-mental-health', sponsorOpen: true, intentSignal: 'ABA therapy, behavioral support, counseling, and psychiatry for diverse learners.' },
      { name: 'Special Education Support',    slug: 'special-education',        sponsorOpen: true, intentSignal: 'Advocacy, tutoring, consulting, and IEP support for families navigating school systems.' },
      { name: 'Adaptive Sports & Recreation', slug: 'adaptive-recreation',      sponsorOpen: true, intentSignal: 'Inclusive sports, therapeutic recreation, and adaptive programs for all abilities.' },
      { name: 'Support Organizations',        slug: 'support-organizations',    sponsorOpen: true, intentSignal: 'Local nonprofits, support groups, and advocacy serving the special needs community.' },
      { name: 'Respite & Family Support',     slug: 'respite-support',          sponsorOpen: true, intentSignal: 'Services supporting the whole family — respite care, parent resources, and caregiver support.' },
    ],
    stats: [
      { value: 'Critical',         label: 'Trust level — the highest of any guide in the ecosystem' },
      { value: 'Deep',             label: 'Research behavior — families read everything, multiple visits' },
      { value: 'Community-driven', label: 'Referrals spread through tight-knit support networks' },
      { value: 'Year-round',       label: 'Active season — needs evolve continuously' },
    ],
    discoveryJourney: [
      { timing: 'Initial search',  surface: 'Special Needs Guide', moment: 'A family receives a diagnosis. They open the Guide within the week. Your practice is the first they see in their category — with a credible editorial description.' },
      { timing: 'Week 2',          surface: 'Support Community',   moment: 'They mention the search in a local Facebook support group. Someone replies: "we found ours in the River Region Parents guide — look up [your name]."' },
      { timing: 'Week 3',          surface: 'Editorial Article',   moment: 'They find an RRP article about local resources for families navigating their diagnosis. Your practice is linked as a trusted provider.' },
      { timing: 'Week 4',          surface: 'First Call',          moment: 'They call. They already have a positive impression — built through trusted sources. The conversation begins from trust, not from scratch.' },
    ],
    cta: {
      headline: 'Be the Trusted Provider These Families Find First.',
      body: 'Families navigating special needs decisions need providers they already trust before they ever call. Jason will show you how your practice appears in the Special Needs Guide and what community presence looks like for mission-driven businesses.',
    },
  },

] // end GUIDE_CONFIGS

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getGuideConfig(slug: string): GuideConfig | undefined {
  return GUIDE_CONFIGS.find(g => g.slug === slug)
}

export const TRUST_LABELS: Record<TrustProfile, string> = {
  'browse':          'Inspiration & Discovery',
  'research':        'Active Research',
  'high-trust':      'High-Trust Decision',
  'critical-trust':  'Critical Trust Required',
}

export const TRUST_COLORS: Record<TrustProfile, string> = {
  'browse':          '#2d5a2d',
  'research':        '#1a2744',
  'high-trust':      '#c4622d',
  'critical-trust':  '#6d2d9a',
}

export const URGENCY_LABELS: Record<GuideUrgency, string> = {
  'evergreen':     'Year-Round',
  'seasonal':      'Seasonal Window',
  'time-critical': 'Time-Critical',
}

export const URGENCY_COLORS: Record<GuideUrgency, string> = {
  'evergreen':     '#2d5a2d',
  'seasonal':      '#b8860b',
  'time-critical': '#c4622d',
}
