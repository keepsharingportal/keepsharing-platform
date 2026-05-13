// src/lib/import/wp-category-mapper.ts
// Maps WordPress category names to guide_articles routing fields.
// column_slug drives homepage section and content type.
// guide_slug drives guide association (for guide-specific articles).
// Case-insensitive matching. First match wins — order by specificity.

export interface CategoryMapping {
  columnSlug: string | null
  guideSlug:  string | null
}

// ── Category rules (most specific first) ─────────────────────────────────────
//
// Each rule: an array of WP category name fragments (lowercase, partial match)
// and the resulting columnSlug / guideSlug.

const RULES: Array<{
  fragments:  string[]
  columnSlug: string | null
  guideSlug:  string | null
}> = [
  // ── Community spotlights ──────────────────────────────────────────────────
  { fragments: ['teacher of the month', 'teacher spotlight'],
    columnSlug: 'teacher-spotlight',  guideSlug: null },
  { fragments: ['student spotlight', 'student of the month'],
    columnSlug: 'student-spotlight',  guideSlug: null },
  { fragments: ['grands are the greatest', 'grands'],
    columnSlug: 'grands-are-the-greatest', guideSlug: null },
  { fragments: ['play ball', 'sports spotlight'],
    columnSlug: 'play-ball',          guideSlug: null },
  { fragments: ['mom to mom', 'moms know best', 'mom blogger', 'mom-to-mom'],
    columnSlug: 'mom-to-mom',         guideSlug: null },
  { fragments: ['boom profile', 'river region boom'],
    columnSlug: 'boom-profile',       guideSlug: null },

  // ── School content ────────────────────────────────────────────────────────
  { fragments: ['school bit', 'school news', 'school update', 'education news'],
    columnSlug: 'school-bits',        guideSlug: null },
  { fragments: ['private school', 'school guide'],
    columnSlug: 'school-bits',        guideSlug: 'private-school' },

  // ── Guides ────────────────────────────────────────────────────────────────
  { fragments: ['summer fun', 'summer activity', 'summer splash', 'splash pad'],
    columnSlug: 'summer-content',     guideSlug: 'summer-fun' },
  { fragments: ['summer camp', 'camp guide', 'day camp'],
    columnSlug: 'summer-content',     guideSlug: 'summer-camp' },
  { fragments: ['newcomer', 'new to river region', 'moving to', 'relocation'],
    columnSlug: 'local-highlights',   guideSlug: 'newcomer' },
  { fragments: ['childcare', 'daycare', 'child care', 'preschool guide'],
    columnSlug: 'local-highlights',   guideSlug: 'childcare' },
  { fragments: ['healthy kids', 'pediatric', 'children health', "kids' health"],
    columnSlug: 'local-highlights',   guideSlug: 'healthy-kids' },
  { fragments: ['birthday party', 'birthday venue', "kids' party"],
    columnSlug: 'local-highlights',   guideSlug: 'birthday-party' },
  { fragments: ['after school', 'afterschool', 'after-school', 'enrichment'],
    columnSlug: 'local-highlights',   guideSlug: 'afterschool' },
  { fragments: ['special needs', 'special education', 'disability'],
    columnSlug: 'local-highlights',   guideSlug: 'special-needs' },

  // ── General parenting/lifestyle ───────────────────────────────────────────
  { fragments: ['parent pick', 'business spotlight', 'local business'],
    columnSlug: 'parent-picks',       guideSlug: null },
  { fragments: ['family resource', 'community resource', 'local resource'],
    columnSlug: 'local-highlights',   guideSlug: null },
  { fragments: ['event', 'things to do', 'weekend', 'calendar'],
    columnSlug: 'events',             guideSlug: null },
  { fragments: ['recipe', 'food', 'cooking'],
    columnSlug: 'family-life',        guideSlug: null },
  { fragments: ['travel', 'day trip', 'vacation', 'road trip'],
    columnSlug: 'family-life',        guideSlug: null },
  { fragments: ['health', 'wellness', 'mental health'],
    columnSlug: 'family-life',        guideSlug: null },
  { fragments: ['parenting', 'toddler', 'baby', 'infant', 'teenager', 'teen'],
    columnSlug: 'family-life',        guideSlug: null },
  { fragments: ['community', 'neighborhood', 'river region', 'montgomery'],
    columnSlug: 'local-highlights',   guideSlug: null },
]

export function mapWpCategories(wpCategories: string[]): CategoryMapping {
  const lowerCats = wpCategories.map(c => c.toLowerCase())

  for (const rule of RULES) {
    const matched = rule.fragments.some(fragment =>
      lowerCats.some(cat => cat.includes(fragment))
    )
    if (matched) {
      return { columnSlug: rule.columnSlug, guideSlug: rule.guideSlug }
    }
  }

  // Default: general parenting content, no guide association
  return { columnSlug: 'family-life', guideSlug: null }
}

// ── Human-readable category label for UI display ──────────────────────────────

const COLUMN_LABELS: Record<string, string> = {
  'teacher-spotlight':      'Teacher Spotlights',
  'student-spotlight':      'Student Spotlights',
  'grands-are-the-greatest': 'Grands Are the Greatest',
  'play-ball':              'Play Ball',
  'mom-to-mom':             'Mom to Mom',
  'boom-profile':           'Boom Profiles',
  'school-bits':            'School Bits',
  'summer-content':         'Summer Content',
  'local-highlights':       'Local Highlights',
  'parent-picks':           'Parent Picks',
  'events':                 'Events & Things To Do',
  'family-life':            'Family Life',
}

export function getColumnLabel(columnSlug: string | null): string {
  if (!columnSlug) return 'Uncategorized'
  return COLUMN_LABELS[columnSlug] ?? columnSlug
}
