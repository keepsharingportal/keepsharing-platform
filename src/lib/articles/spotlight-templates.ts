// Play Ball Spotlight templates — single source of truth for what questions
// appear per profile type (Athlete / Coach / Volunteer). Used by both the
// admin editor (renders the right form fields) and the public article page
// (renders the magazine-matching layout).
//
// Adding a new question = add it to the template's quickHits or topStrip
// array. The admin form picks it up automatically; the public render too.
// No DB changes needed — the data is JSONB.

export type SpotlightType = 'athlete' | 'coach' | 'volunteer'

// Lucide icon name for each field — looked up by the renderer
export type SpotlightIcon =
  | 'GraduationCap' | 'Trophy' | 'Calendar' | 'Award' | 'Music'
  | 'Star' | 'Quote' | 'Heart' | 'Users' | 'Megaphone' | 'BookOpen'
  | 'Flag' | 'Sparkles'

export interface SpotlightField {
  key:   string         // JSONB key under spotlight_data
  label: string         // displayed label (ALL CAPS rendered in component)
  icon:  SpotlightIcon
  placeholder?: string  // editor hint
}

export interface SpotlightTemplate {
  type:           SpotlightType
  label:          string             // shown in the admin dropdown
  eyebrow:        string             // right side of "PLAY BALL | <eyebrow>"
  quickHitsTitle: string             // e.g. "Player Quick Hits", "Coach Quick Hits"
  topStrip:       SpotlightField[]   // 5 vitals shown above the article body
  quickHits:      SpotlightField[]   // Q&A sidebar
}

// ── ATHLETE ──────────────────────────────────────────────────────────────────
export const ATHLETE_TEMPLATE: SpotlightTemplate = {
  type:    'athlete',
  label:   'Athlete Spotlight',
  eyebrow: 'Player Spotlight',
  quickHitsTitle: 'Player Quick Hits',
  topStrip: [
    { key: 'school_league',  label: 'School/League',  icon: 'GraduationCap', placeholder: 'Pike Road School' },
    { key: 'sport',          label: 'Sport',          icon: 'Trophy',        placeholder: 'Varsity Tennis' },
    { key: 'grade',          label: 'Grade',          icon: 'BookOpen',      placeholder: 'Rising 8th' },
    { key: 'years_playing',  label: 'Years Playing',  icon: 'Calendar',      placeholder: '9' },
    { key: 'season_record',  label: 'Season Record',  icon: 'Award',         placeholder: '15-0 Singles, 13-1 Doubles' },
  ],
  quickHits: [
    { key: 'favorite_athlete', label: 'Favorite Athlete',          icon: 'Trophy',     placeholder: 'Naomi Osaka' },
    { key: 'pregame_routine',  label: 'Pregame Routine',           icon: 'Music',      placeholder: 'Snack with jogging and stretching' },
    { key: 'favorite_memory',  label: 'Favorite Sports Memory',    icon: 'Star',       placeholder: 'Winning sectionals in singles and doubles' },
    { key: 'dream_college',    label: 'Dream College',             icon: 'GraduationCap', placeholder: 'Auburn' },
    { key: 'best_advice',      label: 'Best Advice from Coach',    icon: 'Quote',      placeholder: '"No matter how far down you are, there is always room for a comeback."' },
    { key: 'sports_taught',    label: 'What Sports Has Taught Me', icon: 'Heart',      placeholder: 'Believe in myself and work hard.' },
    { key: 'shout_out',        label: 'Shout Out',                 icon: 'Users',      placeholder: 'To my family, Haley Dokas and friends!' },
  ],
}

// ── COACH ────────────────────────────────────────────────────────────────────
export const COACH_TEMPLATE: SpotlightTemplate = {
  type:    'coach',
  label:   'Coach Spotlight',
  eyebrow: 'Coach Spotlight',
  quickHitsTitle: 'Coach Quick Hits',
  topStrip: [
    { key: 'school_league',   label: 'School',         icon: 'GraduationCap', placeholder: 'Elmore County High School' },
    { key: 'role',            label: 'Role',           icon: 'Award',         placeholder: 'Varsity Head Baseball Coach' },
    { key: 'years_coaching',  label: 'Years Coaching', icon: 'Calendar',      placeholder: '12' },
    { key: 'season_record',   label: 'Season Record',  icon: 'Trophy',        placeholder: '27-8 (Regional Champs)' },
    { key: 'playoffs',        label: 'Playoffs',       icon: 'Star',          placeholder: '3rd Round State Playoffs' },
  ],
  quickHits: [
    { key: 'coaching_philosophy', label: 'Coaching Philosophy',         icon: 'Trophy', placeholder: 'Discipline, effort, and selflessness.' },
    { key: 'favorite_part',       label: 'Favorite Part of the Job',    icon: 'Star',   placeholder: 'Watching young men grow up on and off the field.' },
    { key: 'pregame_routine',     label: 'Pregame Routine',             icon: 'Music',  placeholder: 'Prayer, lineup card, and a walk the field.' },
    { key: 'favorite_quote',      label: 'Favorite Quote',              icon: 'Quote',  placeholder: '"Champions are made in the offseason."' },
    { key: 'role_model',          label: 'Role Model',                  icon: 'Users',  placeholder: 'My dad. He taught me what hard work looks like.' },
    { key: 'advice_to_players',   label: 'Advice to Players',           icon: 'Heart',  placeholder: 'Control what you can control and compete every single day.' },
  ],
}

// ── VOLUNTEER ────────────────────────────────────────────────────────────────
export const VOLUNTEER_TEMPLATE: SpotlightTemplate = {
  type:    'volunteer',
  label:   'Volunteer Spotlight',
  eyebrow: 'Volunteer Spotlight',
  quickHitsTitle: 'Volunteer Quick Hits',
  topStrip: [
    { key: 'school_league',      label: 'School',             icon: 'GraduationCap', placeholder: 'Prattville High School' },
    { key: 'role',               label: 'Role',               icon: 'Award',         placeholder: 'Booster Club President' },
    { key: 'years_volunteering', label: 'Years Volunteering', icon: 'Calendar',      placeholder: '8' },
    { key: 'supports',           label: 'Supports',           icon: 'Users',         placeholder: 'Softball Program & Players' },
    { key: 'passion',            label: 'Passion',            icon: 'Heart',         placeholder: 'Building Community & Opportunities' },
  ],
  quickHits: [
    { key: 'why_volunteer',     label: 'Why I Volunteer',            icon: 'Heart',     placeholder: 'To support these girls and give back to a program that has given us so much.' },
    { key: 'favorite_moment',   label: 'Favorite Moment',            icon: 'Star',      placeholder: 'Seeing the girls\' faces after a big win.' },
    { key: 'what_i_do',         label: 'What I Do',                  icon: 'Megaphone', placeholder: 'Fundraising, events, team meals, and anything that helps the program.' },
    { key: 'couldnt_do_without',label: 'I Couldn\'t Do It Without',  icon: 'Users',     placeholder: 'Our booster club board and amazing softball families.' },
    { key: 'advice_to_parents', label: 'Advice to Parents',          icon: 'Quote',     placeholder: 'Get involved! You\'ll build friendships and help your athlete in ways you never expected.' },
    { key: 'team_pride',        label: 'Team Pride',                 icon: 'Trophy',    placeholder: 'Once a Panther, always a Panther!' },
  ],
}

export const SPOTLIGHT_TEMPLATES: Record<SpotlightType, SpotlightTemplate> = {
  athlete:   ATHLETE_TEMPLATE,
  coach:     COACH_TEMPLATE,
  volunteer: VOLUNTEER_TEMPLATE,
}

export const SPOTLIGHT_TYPE_OPTIONS = [
  { value: 'athlete',   label: 'Athlete Spotlight' },
  { value: 'coach',     label: 'Coach Spotlight' },
  { value: 'volunteer', label: 'Volunteer Spotlight' },
] as const

export function getSpotlightTemplate(type: string | null | undefined): SpotlightTemplate | null {
  if (!type) return null
  return SPOTLIGHT_TEMPLATES[type as SpotlightType] ?? null
}
