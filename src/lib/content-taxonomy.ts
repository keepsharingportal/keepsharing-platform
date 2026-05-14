// Central content taxonomy for River Region Parents.
// Used by admin article forms, sidebars, and public routing logic.

// ── Base types ─────────────────────────────────────────────────────────────

export interface ColumnDef        { slug: string; label: string; vertical: string }
export interface GuideDef         { slug: string; label: string }
export interface VerticalDef      { slug: string; label: string }
export interface ContentTypeDef   { slug: string; label: string; description: string }
export interface SchoolZoneSection { slug: string; label: string; columnSlug?: string }
export interface LifeStageDef     { slug: string; label: string; description: string; active: boolean }

// ── Columns ────────────────────────────────────────────────────────────────

export const COLUMNS: ColumnDef[] = [
  // ── School Zone ──────────────────────────────────
  { slug: 'school-bits',             label: 'School Bits',               vertical: 'school-zone' },
  { slug: 'teacher-of-month',        label: 'Teacher of the Month',      vertical: 'school-zone' },
  { slug: 'education-matters',       label: 'Education Matters',         vertical: 'school-zone' },
  { slug: 'student-spotlights',      label: 'Student Spotlights',        vertical: 'school-zone' },
  { slug: 'superintendent-updates',  label: 'Superintendent Updates',    vertical: 'school-zone' },
  { slug: 'student-athletes',        label: 'Student Athletes',          vertical: 'school-zone' },
  { slug: 'counselor-corner',        label: 'Counselor Corner',          vertical: 'school-zone' },
  { slug: 'arts-performances',       label: 'Arts & Performances',       vertical: 'school-zone' },
  // ── Mom Life ─────────────────────────────────────
  { slug: 'mom-to-mom',              label: 'Mom to Mom',                vertical: 'mom-life'    },
  { slug: 'grumpy-but-grateful',     label: 'Grumpy but Grateful',       vertical: 'mom-life'    },
  // ── Family ───────────────────────────────────────
  { slug: 'grands-greatest',         label: 'Grands are the Greatest',   vertical: 'family-fun'  },
  { slug: 'dave-says',               label: 'Dave Says',                 vertical: 'family-fun'  },
  { slug: 'teens-tweens-screens',    label: 'Teens, Tweens & Screens',   vertical: 'family-fun'  },
  // ── Health ───────────────────────────────────────
  { slug: 'meeting-kids',            label: 'Meeting Kids Where They Are', vertical: 'health'    },
  { slug: 'ask-the-doctor',          label: 'Ask the Doctor',            vertical: 'health'      },
  // ── Summer ───────────────────────────────────────
  { slug: 'summer-fun',              label: 'Summer Fun',                vertical: 'summer'      },
  // ── General ──────────────────────────────────────
  { slug: 'feature',                 label: 'Feature Article',           vertical: 'general'     },
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
