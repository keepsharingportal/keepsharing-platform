// Central content taxonomy for River Region Parents.
// Used by admin article forms, sidebars, and public routing logic.

// ── Base types ─────────────────────────────────────────────────────────────

export interface ColumnDef        { slug: string; label: string; vertical: string; description?: string }
export interface GuideDef         { slug: string; label: string }
export interface VerticalDef      { slug: string; label: string }
export interface ContentTypeDef   { slug: string; label: string; description: string }
export interface SchoolZoneSection { slug: string; label: string; columnSlug?: string }
export interface LifeStageDef     { slug: string; label: string; description: string; active: boolean }

// ── Columns ────────────────────────────────────────────────────────────────

export const COLUMNS: ColumnDef[] = [
  // ── School Zone ──────────────────────────────────
  { slug: 'school-bits',             label: 'School Bits',               vertical: 'school-zone',
    description: 'Roundup of school news, awards, and community wins for one school region. Appears on /school-bits and the School Zone landing.' },
  { slug: 'teacher-of-month',        label: 'Teacher of the Month',      vertical: 'school-zone',
    description: 'Profile of one outstanding River Region educator. Appears in the Teacher of the Month spot on School Zone.' },
  { slug: 'education-matters',       label: 'Education Matters',         vertical: 'school-zone',
    description: 'Bigger-picture education topics — policy, how-to, district news. Sits in the Education Matters section of School Zone.' },
  { slug: 'education-matters-montgomery', label: 'Education Matters — Montgomery County', vertical: 'school-zone',
    description: 'Education Matters voiced by the Montgomery County Public Schools superintendent. Each article surfaces under the Montgomery County identity on the public site.' },
  { slug: 'education-matters-elmore', label: 'Education Matters — Elmore County',     vertical: 'school-zone',
    description: 'Education Matters voiced by the Elmore County Public Schools superintendent. Each article surfaces under the Elmore County identity on the public site.' },
  { slug: 'education-matters-autauga', label: 'Education Matters — Autauga County',   vertical: 'school-zone',
    description: 'Education Matters voiced by the Autauga County Public Schools superintendent. Each article surfaces under the Autauga County identity on the public site.' },
  { slug: 'student-spotlights',      label: 'Student Spotlights',        vertical: 'school-zone',
    description: 'Individual student profile — accomplishments, hobbies, what makes them stand out.' },
  { slug: 'superintendent-updates',  label: 'Superintendent Updates',    vertical: 'school-zone',
    description: 'District-level updates voiced by a superintendent. Appears alongside Education Matters.' },
  { slug: 'student-athletes',        label: 'Student Athletes',          vertical: 'school-zone',
    description: 'Sports profiles, team coverage, and season previews.' },
  { slug: 'counselor-corner',        label: 'Counselor Corner',          vertical: 'school-zone',
    description: 'Mental health, social-emotional learning, and family advice from school counselors.' },
  { slug: 'arts-performances',       label: 'Arts & Performances',       vertical: 'school-zone',
    description: 'School arts, plays, music, dance recitals — anything performance-related.' },
  // ── Mom Life ─────────────────────────────────────
  { slug: 'mom-knows-best',          label: 'Mom Knows Best',            vertical: 'mom-life',
    description: 'Blog post from a Mom Knows Best contributor. You must assign a blogger so the byline + profile link work.' },
  { slug: 'mom-to-mom',              label: 'Mom to Mom',                vertical: 'mom-life',
    description: 'Q&A or essay-style column written by a local mom, for local moms.' },
  { slug: 'grumpy-but-grateful',     label: 'Grumpy but Grateful',       vertical: 'mom-life',
    description: 'Honest, humorous monthly mom-life column.' },
  // ── Family ───────────────────────────────────────
  { slug: 'grands-greatest',         label: 'Grands are the Greatest',   vertical: 'family-fun',
    description: 'Profile or essay celebrating River Region grandparents.' },
  { slug: 'play-ball',               label: 'Play Ball',                 vertical: 'family-fun',
    description: 'Youth sports column — leagues, tournaments, coaching, getting your kid started.' },
  { slug: 'dave-says',               label: 'Dave Says',                 vertical: 'family-fun',
    description: 'Recurring expert column from Dave (financial advice for families).' },
  { slug: 'teens-tweens-screens',    label: 'Teens, Tweens & Screens',   vertical: 'family-fun',
    description: 'Navigating older kids, technology, and growing up.' },
  // ── Health ───────────────────────────────────────
  { slug: 'meeting-kids',            label: 'Meeting Kids Where They Are', vertical: 'health',
    description: 'Special-needs parenting column — practical advice and personal stories.' },
  { slug: 'ask-the-doctor',          label: 'Ask the Doctor',            vertical: 'health',
    description: 'Reader Q&A answered by a local doctor or specialist.' },
  // ── Summer ───────────────────────────────────────
  { slug: 'summer-fun',              label: 'Summer Fun',                vertical: 'summer',
    description: 'Article that fits the Summer Fun Guide — camps, activities, splash pads, summer parenting.' },
  // ── Family Resource Guide ────────────────────────
  { slug: 'frg-best-of',             label: 'Best of the Region',        vertical: 'guides',
    description: 'Curated "Best Of" list — Best Parks, Best Day Trips, Sweet Treats, etc. Appears on the Family Resource Guide home as a featured editorial card.' },
  { slug: 'frg-newcomer',            label: 'Newcomer Stories',          vertical: 'guides',
    description: 'Newcomer-focused story or guide — moving in, first-month tips, getting connected. Surfaces on the FRG getting-connected sub-page.' },
  // ── General ──────────────────────────────────────
  { slug: 'feature',                 label: 'Feature Article',           vertical: 'general',
    description: 'Standalone feature article without a specific column. Use when nothing else fits.' },
]

// ── Guides ────────────────────────────────────────────────────────────────

export const GUIDES: GuideDef[] = [
  { slug: 'family-resource-guide',  label: 'Family Resource Guide'  },
  { slug: 'private-school-guide',   label: 'Private School Guide'   },
  { slug: 'summer-camp-guide',      label: 'Summer Camp Guide'      },
  { slug: 'childcare-guide',        label: 'Childcare Guide'        },
  { slug: 'healthy-kids-guide',     label: 'Healthy Kids Guide'     },
  { slug: 'summer-fun-guide',       label: 'Summer Fun Guide'       },
  { slug: 'birthday-party-guide',   label: 'Birthday Party Guide'   },
  { slug: 'afterschool-guide',      label: 'After-School Guide'     },
  { slug: 'special-needs-guide',    label: 'Special Needs Guide'    },
  { slug: 'school-bits',            label: 'School Bits'            },
  { slug: 'summer-fun',             label: 'Summer Fun'             },
  { slug: 'newcomer-guide',         label: 'Newcomer Guide'         },
]

// ── Content Topics ─────────────────────────────────────────────────────────
// Cross-cutting theme tags an article can carry IN ADDITION to its primary
// column_slug and guide_slug. A single piece can carry multiple topics — a
// "moving to the River Region" essay might be ['newcomer-life','village'].
//
// These are intentionally universal, not FRG-specific. Each guide page picks
// the subset relevant to its audience and renders an "Across the Site" row
// pulling articles tagged with those topics (excluding articles whose
// primary guide_slug already matches the page, to avoid duplication).
//
// Stored on guide_articles.topics (text[]) — see migration 087.

export interface ContentTopicDef {
  slug:        string
  label:       string
  description: string
}

export const CONTENT_TOPICS: ContentTopicDef[] = [
  { slug: 'newcomer-life',   label: 'Newcomer Life',
    description: 'Moving to the River Region, first months, getting oriented to a new place.' },
  { slug: 'village',         label: 'Finding Your Village',
    description: 'Community, friendships, mom-crew, connection. Building support around your family.' },
  { slug: 'real-talk',       label: 'Real Talk From Moms',
    description: 'Reflective parenting essays — postpartum, struggles, growth, the honest stuff.' },
  { slug: 'how-to-choose',   label: 'How to Choose Wisely',
    description: 'Decision guidance — picking childcare, schools, pediatricians, therapies, programs.' },
  { slug: 'family-wellness', label: 'Family Wellness',
    description: 'Physical health, mental health, nutrition, development — for kids and parents.' },
  { slug: 'family-fun',      label: 'Family Fun',
    description: 'Activities, day trips, traditions, holidays — things to do as a family.' },
  { slug: 'birthday',        label: 'Birthday Planning',
    description: 'Birthday venues, vendors, themes, budgets, planning. Surfaces on The Big Birthday Bash portal.' },
]

export function contentTopicLabel(slug: string): string {
  return CONTENT_TOPICS.find(t => t.slug === slug)?.label ?? slug
}

// Per-guide topic subsets — which topics each guide page surfaces in its
// "Across the Site" row. FRG = all 6 (it's the hub). Others pick the
// themes most relevant to their audience. Tweak as you see how it reads.
export const GUIDE_TOPIC_FILTERS: Record<string, string[]> = {
  'family-resource-guide': ['newcomer-life', 'village', 'real-talk', 'how-to-choose', 'family-wellness', 'family-fun'],
  'newcomer-guide':        ['newcomer-life', 'village', 'how-to-choose'],
  'childcare-guide':       ['how-to-choose', 'real-talk', 'family-wellness'],
  'special-needs-guide':   ['how-to-choose', 'family-wellness', 'real-talk', 'village'],
  'healthy-kids-guide':    ['family-wellness', 'how-to-choose'],
  'afterschool-guide':     ['family-fun', 'how-to-choose'],
  'private-school-guide':  ['how-to-choose', 'real-talk'],
}

// ── Verticals ─────────────────────────────────────────────────────────────

export const VERTICALS: VerticalDef[] = [
  { slug: 'school-zone', label: 'School Zone'      },
  { slug: 'mom-life',    label: 'Mom Life'          },
  { slug: 'family-fun',  label: 'Family Fun'        },
  { slug: 'health',      label: 'Health & Wellness' },
  { slug: 'summer',      label: 'Summer'            },
  { slug: 'guides',      label: 'Local Guides'      },
  { slug: 'general',     label: 'General'           },
]

// ── Column → vertical-row mapping ──────────────────────────────────────────
// Maps a column_slug to the row in the public.verticals table (the year-round
// content homes that have a public landing page). NOT the same as the broader
// category 'vertical' field above on each ColumnDef. Only verticals with a
// public landing page should appear here — currently school-zone and
// mom-knows-best. Returns null for columns that don't roll up to a vertical.

const COLUMN_TO_VERTICAL_ROW: Record<string, string> = {
  // School Zone
  'school-bits':                    'school-zone',
  'teacher-of-month':               'school-zone',
  'education-matters':              'school-zone',
  'education-matters-montgomery':   'school-zone',
  'education-matters-elmore':       'school-zone',
  'education-matters-autauga':      'school-zone',
  'student-spotlights':             'school-zone',
  'superintendent-updates':         'school-zone',
  'student-athletes':               'school-zone',
  'counselor-corner':               'school-zone',
  'arts-performances':              'school-zone',
  // Mom Knows Best
  'mom-knows-best':         'mom-knows-best',
}

export function columnToVerticalRowSlug(columnSlug: string | null | undefined): string | null {
  if (!columnSlug) return null
  return COLUMN_TO_VERTICAL_ROW[columnSlug] ?? null
}

// ── Section dropdown helpers ───────────────────────────────────────────────
// Used by the article editor to group the Section dropdown by vertical and
// look up the human-readable description for the currently-selected column.

export function findColumn(slug: string | null | undefined): ColumnDef | null {
  if (!slug) return null
  return COLUMNS.find(c => c.slug === slug) ?? null
}

export function columnsByVertical(): Array<{ vertical: VerticalDef; columns: ColumnDef[] }> {
  return VERTICALS
    .map(v => ({
      vertical: v,
      columns: COLUMNS.filter(c => c.vertical === v.slug),
    }))
    .filter(group => group.columns.length > 0)
}

// ── Content Types ──────────────────────────────────────────────────────────
// Describes the structural format of a piece of content, distinct from vertical/column.

export const CONTENT_TYPES: ContentTypeDef[] = [
  { slug: 'article',        label: 'Article',               description: 'Standard editorial article'                 },
  { slug: 'roundup',        label: 'Roundup',               description: 'Multi-item roundup (e.g. School Bits)'      },
  { slug: 'spotlight',      label: 'Spotlight',             description: 'Single person, place, or program featured'  },
  { slug: 'superintendent', label: 'Superintendent Update', description: 'Official district announcement'             },
  { slug: 'guide-article',  label: 'Guide Article',         description: 'Content tied to a specific guide'           },
  { slug: 'event-story',    label: 'Event Story',           description: 'Recap or preview of a community event'      },
  { slug: 'sponsored',      label: 'Sponsored Article',     description: 'Paid content — clearly labeled'             },
  { slug: 'column',         label: 'Column',                description: 'Recurring contributor piece'                 },
  { slug: 'qa',             label: 'Q&A',                   description: 'Interview or question-and-answer format'    },
]

// ── School Zone sections ───────────────────────────────────────────────────
// All distinct topic areas within the School Zone vertical.
// columnSlug is set when there is a matching COLUMNS entry.

export const SCHOOL_ZONE_SECTIONS: SchoolZoneSection[] = [
  { slug: 'school-bits',         label: 'School Bits',             columnSlug: 'school-bits'            },
  { slug: 'teacher-of-month',    label: 'Teacher of the Month',    columnSlug: 'teacher-of-month'       },
  { slug: 'superintendent',      label: 'Superintendent Updates',  columnSlug: 'superintendent-updates' },
  { slug: 'education-matters',   label: 'Education Matters',       columnSlug: 'education-matters'      },
  { slug: 'student-spotlights',  label: 'Student Spotlights',      columnSlug: 'student-spotlights'     },
  { slug: 'student-athletes',    label: 'Student Athletes',        columnSlug: 'student-athletes'       },
  { slug: 'arts-performances',   label: 'Arts & Performances',     columnSlug: 'arts-performances'      },
  { slug: 'counselor-corner',    label: 'Counselor Corner',        columnSlug: 'counselor-corner'       },
  { slug: 'scholarships',        label: 'Scholarships'                                                  },
  { slug: 'pto-pta',             label: 'PTO / PTA'                                                     },
  { slug: 'testing-tips',        label: 'Testing Tips'                                                  },
  { slug: 'kindergarten-ready',  label: 'Kindergarten Readiness'                                        },
  { slug: 'college-prep',        label: 'College Prep'                                                  },
  { slug: 'homeschool',          label: 'Homeschool'                                                    },
  { slug: 'private-schools',     label: 'Private Schools'                                               },
  { slug: 'school-calendar',     label: 'School Calendar'                                               },
  { slug: 'school-events',       label: 'School Events'                                                 },
]

// ── Life-stage verticals (future expansion) ────────────────────────────────
// active=false means the vertical is planned but not yet launched.
// The system is designed to support these without an architecture rebuild.

export const LIFE_STAGE_VERTICALS: LifeStageDef[] = [
  { slug: 'toddlers',         label: 'Toddlers',         description: 'Ages 1–3, early childhood',              active: false },
  { slug: 'elementary-years', label: 'Elementary Years', description: 'Ages 5–11, school-age',                  active: false },
  { slug: 'teen-life',        label: 'Teen Life',        description: 'Ages 12–18, middle & high school',       active: false },
  { slug: 'college-prep',     label: 'College Prep',     description: 'High school transition, applications',   active: false },
  { slug: 'special-needs',    label: 'Special Needs',    description: 'Resources, IEPs, community support',     active: false },
  { slug: 'moms',             label: 'Mom Life',         description: 'Parenting, self-care, community',        active: true  },
  { slug: 'dads',             label: 'Dad Life',         description: 'Dad perspective on family life',         active: false },
  { slug: 'grandparents',     label: 'Grandparents',     description: 'Grands are the Greatest',                active: false },
]

// ── All active School Zone column slugs ────────────────────────────────────
// Convenience array for query filters.

export const SCHOOL_ZONE_COLUMN_SLUGS = COLUMNS
  .filter(c => c.vertical === 'school-zone')
  .map(c => c.slug)

// ── Editorial statuses ─────────────────────────────────────────────────────

export const EDITORIAL_STATUSES = [
  { value: 'draft',          label: 'Draft',         color: 'bg-gray-100 text-gray-600'    },
  { value: 'pending',        label: 'Needs Review',  color: 'bg-amber-100 text-amber-700'  },
  { value: 'approved',       label: 'Approved',      color: 'bg-green-100 text-green-700'  },
  { value: 'needs_revision', label: 'Needs Edits',   color: 'bg-blue-100 text-blue-700'    },
  { value: 'rejected',       label: 'Rejected',      color: 'bg-red-100 text-red-600'      },
  { value: 'archived',       label: 'Archived',      color: 'bg-gray-100 text-gray-400'    },
] as const

export type EditorialStatus = typeof EDITORIAL_STATUSES[number]['value']

// ── Lookup helpers ─────────────────────────────────────────────────────────

export function columnLabel(slug: string | null): string {
  if (!slug) return '—'
  return COLUMNS.find(c => c.slug === slug)?.label ?? slug
}

// Single source of truth for column visual identity. Returns Tailwind classes
// for a SOLID badge so every surface (article header, homepage hero, sidebar
// spotlights, listing cards) shows the same color for a given column. Falls
// back to primary coral for unknown columns.
const COLUMN_BADGE_STYLES: Record<string, string> = {
  'mom-to-mom':              'bg-rose-500 text-white',
  'teacher-of-month':        'bg-primary text-primary-foreground',
  'teacher-of-the-month':    'bg-primary text-primary-foreground',
  'play-ball':               'bg-secondary text-secondary-foreground',
  'grands-greatest':         'bg-accent text-accent-foreground',
  'grands-are-the-greatest': 'bg-accent text-accent-foreground',
  'school-bits':             'bg-blue-600 text-white',
  'mom-knows-best':          'bg-pink-500 text-white',
  'grumpy-but-grateful':     'bg-orange-500 text-white',
  'dave-says':               'bg-blue-700 text-white',
  'meeting-kids':            'bg-teal-700 text-white',
  'teens-tweens-screens':    'bg-indigo-600 text-white',
}

export function columnBadgeStyle(slug: string | null | undefined): string {
  if (!slug) return 'bg-primary text-primary-foreground'
  return COLUMN_BADGE_STYLES[slug] ?? 'bg-primary text-primary-foreground'
}

// Soft-tinted background for cards / containers per column. Pairs with the
// solid badge so a card and its badge feel like the same color family.
const COLUMN_TINT_STYLES: Record<string, string> = {
  'mom-to-mom':              'bg-rose-50 border-rose-100',
  'teacher-of-month':        'bg-primary/5 border-primary/10',
  'teacher-of-the-month':    'bg-primary/5 border-primary/10',
  'play-ball':               'bg-secondary/5 border-secondary/15',
  'grands-greatest':         'bg-accent/10 border-accent/25',
  'grands-are-the-greatest': 'bg-accent/10 border-accent/25',
  'school-bits':             'bg-blue-50 border-blue-100',
  'mom-knows-best':          'bg-pink-50 border-pink-100',
  'grumpy-but-grateful':     'bg-orange-50 border-orange-100',
  'dave-says':               'bg-blue-50 border-blue-100',
  'meeting-kids':            'bg-teal-50 border-teal-100',
  'teens-tweens-screens':    'bg-indigo-50 border-indigo-100',
}

export function columnTintStyle(slug: string | null | undefined): string {
  if (!slug) return 'bg-primary/5 border-primary/10'
  return COLUMN_TINT_STYLES[slug] ?? 'bg-primary/5 border-primary/10'
}

export function guideLabel(slug: string | null): string {
  if (!slug) return '—'
  return GUIDES.find(g => g.slug === slug)?.label ?? slug
}

export function verticalLabel(slug: string | null): string {
  if (!slug) return '—'
  return VERTICALS.find(v => v.slug === slug)?.label ?? slug
}

// Resolve the parent vertical for a given column. Used by article pages to
// show the section badge ("School Zone") with the column ("School Bits") as a
// secondary chip — School Bits is a column inside the School Zone vertical,
// not the section itself.
export function verticalForColumn(columnSlug: string | null): VerticalDef | null {
  if (!columnSlug) return null
  const col = COLUMNS.find(c => c.slug === columnSlug)
  if (!col) return null
  return VERTICALS.find(v => v.slug === col.vertical) ?? null
}

// URL slug for a vertical's public landing page. School Zone is the only one
// with a real archive page today; the rest fall back to their column page.
const VERTICAL_HREFS: Record<string, string> = {
  'school-zone': '/school-zone',
}
export function verticalHref(verticalSlug: string | null): string | null {
  if (!verticalSlug) return null
  return VERTICAL_HREFS[verticalSlug] ?? null
}

export function editorialStatusInfo(status: string | null) {
  return EDITORIAL_STATUSES.find(s => s.value === status)
    ?? { value: status ?? '', label: status ?? '—', color: 'bg-gray-100 text-gray-500' }
}
