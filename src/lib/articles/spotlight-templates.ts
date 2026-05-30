// Play Ball Spotlight templates — single source of truth for what questions
// appear per profile type (Athlete / Coach / Volunteer). Used by both the
// admin editor (renders the right form fields) and the public article page
// (renders the magazine-matching layout).
//
// Adding a new question = add it to the template's quickHits or topStrip
// array. The admin form picks it up automatically; the public render too.
// No DB changes needed — the data is JSONB.

export type SpotlightType = 'athlete' | 'coach' | 'volunteer' | 'teacher' | 'mom'

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

// ── TEACHER OF THE MONTH ─────────────────────────────────────────────────────
// Different brand family than Play Ball — column is 'teacher-of-the-month',
// not 'play-ball'. The eyebrow + lightbox color come from getColumnBrand()
// based on column_slug, not from the template's eyebrow field (which is the
// right-side of the pipe for Play Ball only).
//
// Top strip: school, title (Algebra 2 Teacher / Asst Principal), years
// teaching, education, honors. NO Quick Hits — the article body carries
// the philosophy + goals like the print piece does.
export const TEACHER_TEMPLATE: SpotlightTemplate = {
  type:    'teacher',
  label:   'Teacher of the Month',
  eyebrow: 'Teacher of the Month',
  quickHitsTitle: 'Teacher Quick Hits',     // unused unless user opts in
  topStrip: [
    { key: 'school',         label: 'School',         icon: 'GraduationCap', placeholder: 'Prattville High School' },
    { key: 'title',          label: 'Title',          icon: 'Award',         placeholder: 'Algebra 2 Teacher' },
    { key: 'years_teaching', label: 'Years Teaching', icon: 'Calendar',      placeholder: '12' },
    { key: 'education',      label: 'Education',      icon: 'BookOpen',      placeholder: 'B.S. Auburn · M.Ed Troy' },
    { key: 'honors',         label: 'Honors',         icon: 'Sparkles',      placeholder: 'Teacher of the Year 2024' },
  ],
  quickHits: [],   // empty by default; can be opted into later
}

// ── MOM TO MOM ───────────────────────────────────────────────────────────────
// 4-cell at-a-glance row for the Mom to Mom interview profile. No Quick Hits —
// the article body's Q&A is the content. The About card at the bottom of the
// article uses `bio` (optional) + the article's profile_image_url.
export const MOM_TEMPLATE: SpotlightTemplate = {
  type:    'mom',
  label:   'Mom Spotlight',
  eyebrow: 'Mom to Mom',
  quickHitsTitle: 'Mom Quick Hits',  // unused unless an editor opts in
  topStrip: [
    { key: 'town',            label: 'Town',                  icon: 'Flag',         placeholder: 'Hillwood, Montgomery' },
    { key: 'years_here',      label: 'Years in River Region', icon: 'Calendar',     placeholder: '12' },
    { key: 'kids',            label: 'Kids',                  icon: 'Users',        placeholder: '3 — ages 8, 12, 16' },
    { key: 'fav_spot',        label: 'Fav Spot in Town',      icon: 'Heart',        placeholder: 'Old Cloverdale on a Saturday morning' },
  ],
  quickHits: [],
  // Mom-specific extras for the About card at the bottom of the article.
  // The `bio` field is rendered as a closing "About [Name]" card with the
  // profile_image_url. Optional — if empty the card doesn't render.
}

export const SPOTLIGHT_TEMPLATES: Record<SpotlightType, SpotlightTemplate> = {
  athlete:   ATHLETE_TEMPLATE,
  coach:     COACH_TEMPLATE,
  volunteer: VOLUNTEER_TEMPLATE,
  teacher:   TEACHER_TEMPLATE,
  mom:       MOM_TEMPLATE,
}

export const SPOTLIGHT_TYPE_OPTIONS = [
  { value: 'athlete',   label: 'Athlete Spotlight' },
  { value: 'coach',     label: 'Coach Spotlight' },
  { value: 'volunteer', label: 'Volunteer Spotlight' },
  { value: 'teacher',   label: 'Teacher of the Month' },
  { value: 'mom',       label: 'Mom to Mom Spotlight' },
] as const

// Filter the type dropdown options based on the article's column so editors
// only see relevant choices (Play Ball doesn't need a Teacher option).
export function getSpotlightOptionsForColumn(columnSlug: string | null | undefined) {
  if (columnSlug === 'play-ball')             return SPOTLIGHT_TYPE_OPTIONS.filter(o => ['athlete','coach','volunteer'].includes(o.value))
  if (columnSlug === 'teacher-of-the-month')  return SPOTLIGHT_TYPE_OPTIONS.filter(o => o.value === 'teacher')
  if (columnSlug === 'mom-to-mom')            return SPOTLIGHT_TYPE_OPTIONS.filter(o => o.value === 'mom')
  return SPOTLIGHT_TYPE_OPTIONS  // unknown column — show everything
}

// Which columns surface the Spotlight editor section in admin. Mirrored
// from the keys above for clarity.
export const SPOTLIGHT_ENABLED_COLUMNS = ['play-ball', 'teacher-of-the-month', 'mom-to-mom']

export function getSpotlightTemplate(type: string | null | undefined): SpotlightTemplate | null {
  if (!type) return null
  return SPOTLIGHT_TEMPLATES[type as SpotlightType] ?? null
}
