// ── Family Favorites shared configuration ────────────────────────────────────
// Used by both public pages and admin. Single source of truth for groups,
// categories, phases, and sponsor tier definitions.

// ── Category groups ───────────────────────────────────────────────────────────

export interface FFCategoryDef {
  slug:         string
  name:         string
  description:  string
  displayOrder: number
}

export interface FFGroup {
  name:       string
  slug:       string
  emoji:      string
  categories: FFCategoryDef[]
}

export const FF_GROUPS: FFGroup[] = [
  {
    name: 'Family Health & Wellness', slug: 'family-health-wellness', emoji: '🩺',
    categories: [
      { slug: 'best-pediatric-practice',      name: 'Best Pediatric Practice',               displayOrder: 10,  description: 'The pediatric practice River Region families trust most.' },
      { slug: 'best-pediatric-dentist',       name: 'Best Pediatric Dentist',                displayOrder: 20,  description: 'The dental practice families love to bring their kids to.' },
      { slug: 'best-childrens-mental-health', name: "Best Children's Mental Health Provider", displayOrder: 30,  description: 'Therapists and behavioral health providers serving River Region children.' },
      { slug: 'best-mom-wellness',            name: 'Best Mom Wellness Experience',          displayOrder: 40,  description: 'The spa, studio, or wellness destination River Region moms return to.' },
    ],
  },
  {
    name: 'Education & Childcare', slug: 'education-childcare', emoji: '📚',
    categories: [
      { slug: 'best-childcare-center',     name: 'Best Childcare Center',           displayOrder: 110, description: 'The childcare center families trust with their youngest.' },
      { slug: 'best-preschool-prek',       name: 'Best Preschool or Pre-K Program', displayOrder: 120, description: 'The early learning program where River Region children begin.' },
      { slug: 'best-after-school-program', name: 'Best After-School Program',       displayOrder: 130, description: 'The after-school program families rely on for enrichment and care.' },
      { slug: 'best-private-school',       name: 'Best Private School',             displayOrder: 140, description: 'The private school River Region families recommend to every new family.' },
      { slug: 'best-tutoring-center',      name: 'Best Tutoring or Learning Center',displayOrder: 150, description: 'The tutoring service helping River Region students reach their potential.' },
    ],
  },
  {
    name: 'Summer & Camps', slug: 'summer-camps', emoji: '⛺',
    categories: [
      { slug: 'best-summer-day-camp',  name: 'Best Summer Day Camp',    displayOrder: 210, description: 'The day camp River Region families register for first every January.' },
      { slug: 'best-specialty-camp',   name: 'Best Specialty Camp',     displayOrder: 220, description: 'The themed camp that becomes a family tradition — arts, sports, STEM.' },
      { slug: 'best-youth-sports',     name: 'Best Youth Sports Program',displayOrder: 230, description: 'The league or training program where kids discover their love of the game.' },
      { slug: 'best-summer-activity',  name: 'Best Summer Activity',    displayOrder: 240, description: 'The summer destination that becomes a family highlight every year.' },
    ],
  },
  {
    name: 'Food & Dining', slug: 'food-dining', emoji: '🍽️',
    categories: [
      { slug: 'best-family-restaurant',     name: 'Best Family Restaurant',          displayOrder: 310, description: 'The local restaurant where River Region families gather and celebrate.' },
      { slug: 'best-birthday-cake-bakery',  name: 'Best Birthday Cake or Custom Bakery', displayOrder: 320, description: "The baker behind River Region's most celebrated birthday cakes." },
      { slug: 'best-family-cafe',           name: 'Best Family Café or Coffee Shop', displayOrder: 330, description: 'The café welcoming to families — relaxed, delicious, and community-spirited.' },
      { slug: 'best-ice-cream-treats',      name: 'Best Ice Cream or Treat Shop',    displayOrder: 340, description: 'The ice cream parlor or treat shop that makes summer sweeter.' },
    ],
  },
  {
    name: 'Birthday Parties & Celebrations', slug: 'birthday-parties', emoji: '🎂',
    categories: [
      { slug: 'best-birthday-party-venue',   name: 'Best Birthday Party Venue',              displayOrder: 410, description: 'The venue that makes River Region birthdays unforgettable.' },
      { slug: 'best-birthday-entertainment', name: 'Best Birthday Entertainment or Performer',displayOrder: 420, description: 'The entertainer who transforms any birthday into a celebration.' },
      { slug: 'best-party-planner',          name: 'Best Party Planner or Event Coordinator', displayOrder: 430, description: 'The planner behind the most beautiful, stress-free celebrations.' },
    ],
  },
  {
    name: 'Shopping & Services', slug: 'shopping-services', emoji: '🛍️',
    categories: [
      { slug: 'best-childrens-boutique',   name: "Best Children's Boutique",      displayOrder: 510, description: "The local children's boutique River Region families love to browse." },
      { slug: 'best-family-photographer',  name: 'Best Family Photographer',      displayOrder: 520, description: "The photographer who captures families' most treasured moments." },
      { slug: 'best-family-owned-business',name: 'Best Family-Owned Local Business',displayOrder: 530, description: 'The family-owned business that embodies River Region community values.' },
      { slug: 'best-family-home-services', name: 'Best Family Home Services',     displayOrder: 540, description: 'The contractor or home professional River Region families trust.' },
    ],
  },
  {
    name: 'Local Life & Community', slug: 'local-life-community', emoji: '🌳',
    categories: [
      { slug: 'best-family-attraction',   name: 'Best Family Activity or Attraction',    displayOrder: 610, description: 'The attraction where River Region families spend weekend time.' },
      { slug: 'best-water-experience',    name: 'Best Splash Pad, Pool, or Water Experience',displayOrder: 620, description: 'The water destination that defines River Region summers.' },
      { slug: 'best-outdoor-experience',  name: 'Best Outdoor Family Experience',        displayOrder: 630, description: 'The park, trail, or outdoor adventure where families connect.' },
      { slug: 'best-fitness-wellness-space',name: 'Best Fitness or Wellness Space',      displayOrder: 640, description: 'The gym or studio that welcomes the whole family.' },
      { slug: 'best-farmers-market',      name: 'Best Farmers Market or Local Food Experience',displayOrder: 650, description: 'The market that connects families with local food.' },
      { slug: 'best-community-event',     name: 'Best Family-Friendly Community Event', displayOrder: 660, description: 'The event River Region families look forward to all year.' },
    ],
  },
]

// Flat list of all categories for quick lookup
export const ALL_FF_CATEGORIES: FFCategoryDef[] = FF_GROUPS.flatMap(g => g.categories)

// ── Season phases ─────────────────────────────────────────────────────────────

export type FFPhase =
  | 'planning'
  | 'nominations'
  | 'finalist-review'
  | 'voting'
  | 'announcing'
  | 'complete'

export const PHASE_CONFIG: Record<FFPhase, { label: string; publicLabel: string; color: string; description: string }> = {
  'planning':         { label: 'Planning',         publicLabel: 'Coming Soon',         color: '#9ca3af', description: 'Season is being configured. Not yet public.' },
  'nominations':      { label: 'Nominations Open', publicLabel: 'Nominations Open',    color: '#22c55e', description: 'Community nominations are being accepted.' },
  'finalist-review':  { label: 'Finalist Review',  publicLabel: 'Finalists Being Chosen',color: '#eab308', description: 'Editorial team is reviewing nominations.' },
  'voting':           { label: 'Voting Open',       publicLabel: 'Vote Now!',           color: '#3b82f6', description: 'Community voting is open.' },
  'announcing':       { label: 'Announcing',        publicLabel: 'Winners Revealed!',   color: '#ef6442', description: 'Winners are being revealed.' },
  'complete':         { label: 'Complete',          publicLabel: 'See the Winners',     color: '#b8860b', description: 'Season complete. Winners archived.' },
}

// ── Sponsor tiers ─────────────────────────────────────────────────────────────

export const FF_SPONSOR_TIERS = [
  {
    tier:       'ecosystem',
    label:      'Presenting Sponsor',
    color:      '#b8860b',
    what:       '"Presented By" across all Family Favorites content — nominations, voting, and winners.',
    inventory:  1,
    description: 'Maximum visibility across the entire Family Favorites ecosystem for the full season.',
  },
  {
    tier:       'category',
    label:      'Category Sponsor',
    color:      '#ef6442',
    what:       '"Presented By" for one specific award category — nomination page, voting, and winner reveal.',
    inventory:  30,
    description: 'Own a specific category. Your name appears whenever that category is featured.',
  },
  {
    tier:       'voting-week',
    label:      'Voting Week Sponsor',
    color:      '#1e3a5f',
    what:       'Featured sponsor across all voting-week emails, social posts, and guide placements.',
    inventory:  3,
    description: 'High-visibility presence during the most active engagement period of the season.',
  },
  {
    tier:       'print',
    label:      'Print Winners Issue',
    color:      '#374151',
    what:       'Ad placement in the annual Family Favorites print winners issue.',
    inventory:  8,
    description: 'Permanent placement in the most-saved issue of the year.',
  },
] as const

// ── Annual calendar phases ─────────────────────────────────────────────────────

export const FF_ANNUAL_CALENDAR = [
  { phase: 'Season Planning',        months: 'September–October',  color: '#9ca3af', icon: '🗓️', desc: 'Admin configures season, categories, sponsors. Editorial team begins planning coverage.' },
  { phase: 'Sponsor Recruitment',    months: 'October',            color: '#b8860b', icon: '🤝', desc: 'Category and ecosystem sponsor positions offered. Premium opportunity for advertisers.' },
  { phase: 'Nominations Open',       months: 'November',           color: '#22c55e', icon: '⭐', desc: 'Community nominates their favorites. Email list grows. Social sharing peaks.' },
  { phase: 'Finalist Review',        months: 'December',           color: '#eab308', icon: '🔍', desc: 'Editorial team reviews, deduplicates, and selects 5 finalists per category.' },
  { phase: 'Finalists Announced',    months: 'January 1',          color: '#3b82f6', icon: '📣', desc: 'Major announcement moment. Finalist businesses get social graphics. Voting opens.' },
  { phase: 'Community Voting',       months: 'January',            color: '#3b82f6', icon: '🗳️', desc: '2–3 week voting window. Newsletter features. Social campaigns. Sponsor visibility peak.' },
  { phase: 'Winners Announced',      months: 'February/March',     color: '#ef6442', icon: '🏆', desc: 'Winners revealed via social, newsletter, and dedicated email. Digital badges deployed.' },
  { phase: 'Print Issue Integration',months: 'March/April',        color: '#1e3a5f', icon: '📖', desc: 'Annual Family Favorites winners issue. The most saved and shared issue of the year.' },
  { phase: 'Afterglow & Badges',     months: 'Year-round',         color: '#b8860b', icon: '🎖️', desc: 'Winners display badges across listings, social, and print. Prestige builds year over year.' },
  { phase: 'Next Year Anticipation', months: 'September',          color: '#9ca3af', icon: '🔁', desc: 'Cycle begins again. Past winners teased. Sponsor positions offered early.' },
] as const
