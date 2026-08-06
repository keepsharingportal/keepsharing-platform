// ── Education Matters districts ────────────────────────────────────────────
//
// Every Education Matters column belongs to one of the four River Region
// school districts. Each district carries the identity that would
// otherwise have to be re-entered on every monthly article: name, county
// label, accent color, and its superintendent's bio / photo / title /
// location.
//
// This is hardcoded on purpose. Superintendents change every few years
// (not every few weeks), so a code push per change is fine and keeps the
// data model simple — no admin CRUD, no schema migration, no editor
// having to remember which fields are "static per district" vs "new
// this month." When we onboard sibling brands (Boom, GPP, etc.) with
// their own districts, add a second constant.
//
// Editors only fill in the per-month fields on the article itself:
//   - Title + body (the superintendent's message)
//   - Focus for the month (optional; defaults per district)
//   - Sponsor block (optional; per month, stored in spotlight_data)
//   - Pull quote (optional; parser can also auto-lift)
//   - Photos (optional; stored in gallery_images)

export interface DistrictSuperintendent {
  name:      string
  title:     string
  /** Public URL of the headshot. Drop the file into /public/images/superintendents
   *  and reference it here. Falls back to a neutral avatar when missing. */
  photoUrl:  string
  bio:       string
}

export interface DistrictConfig {
  /** column_slug — the value stored on guide_articles.column_slug and
   *  used to look this district up. */
  slug:           string
  /** Short label used on tabs + breadcrumbs. */
  shortName:      string
  /** Full district name — appears on the superintendent card + at-a-glance. */
  fullName:       string
  /** Small pill on the hero (e.g. "PIKE ROAD"). */
  countyLabel:    string
  /** Brand color the district's tab + accents render in. */
  accent:         string
  /** Softer tint of the same color for filled backgrounds. */
  softAccent:     string
  /** "City, State" line under the superintendent name. */
  location:       string
  /** Default value for "This Month's Focus" when the editor doesn't
   *  override it on the article. */
  focusDefault:   string
  superintendent: DistrictSuperintendent
}

// ── Data ─────────────────────────────────────────────────────────────────
// Real superintendent bios/photos should replace these placeholders as
// they're supplied. Only Pike Road's Dr. Jason Goodwin data was provided
// at build time; the other three carry stub bios you can update.

export const EDUCATION_DISTRICTS: DistrictConfig[] = [
  {
    slug:         'education-matters-montgomery',
    shortName:    'Montgomery',
    fullName:     'Montgomery Public Schools',
    countyLabel:  'Montgomery',
    accent:       '#138F8F',
    softAccent:   '#E8F5F4',
    location:     'Montgomery, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      name:     'Superintendent Name',
      title:    'Superintendent',
      photoUrl: '/images/superintendents/montgomery.jpg',
      bio:      'Placeholder bio — update in src/lib/education-matters/districts.ts once we have the Montgomery Public Schools superintendent’s real bio and headshot.',
    },
  },
  {
    slug:         'education-matters-pike-road',
    shortName:    'Pike Road',
    fullName:     'Pike Road Schools',
    countyLabel:  'Pike Road',
    accent:       '#08264A',
    softAccent:   '#EDF3F8',
    location:     'Pike Road, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      name:     'Dr. Jason Goodwin',
      title:    'Superintendent',
      photoUrl: '/images/superintendents/pike-road.jpg',
      bio:      'Dr. Jason Goodwin is the Superintendent of Pike Road Schools and has dedicated his career to serving students as a teacher, coach, principal, and district leader. He believes great schools are built on strong relationships, high expectations, and a shared commitment to excellence, with every decision focused on what is best for students.',
    },
  },
  {
    slug:         'education-matters-elmore',
    shortName:    'Elmore County',
    fullName:     'Elmore County Schools',
    countyLabel:  'Elmore County',
    accent:       '#F4C21B',
    softAccent:   '#FFF7D6',
    location:     'Wetumpka, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      name:     'Superintendent Name',
      title:    'Superintendent',
      photoUrl: '/images/superintendents/elmore.jpg',
      bio:      'Placeholder bio — update in src/lib/education-matters/districts.ts once we have the Elmore County Schools superintendent’s real bio and headshot.',
    },
  },
  {
    slug:         'education-matters-autauga',
    shortName:    'Autauga County',
    fullName:     'Autauga County Schools',
    countyLabel:  'Autauga County',
    accent:       '#6F2C8F',
    softAccent:   '#FAF6FC',
    location:     'Prattville, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      name:     'Superintendent Name',
      title:    'Superintendent',
      photoUrl: '/images/superintendents/autauga.jpg',
      bio:      'Placeholder bio — update in src/lib/education-matters/districts.ts once we have the Autauga County Schools superintendent’s real bio and headshot.',
    },
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────

export function isEducationMattersColumn(slug: string | null | undefined): boolean {
  return !!slug && EDUCATION_DISTRICTS.some(d => d.slug === slug)
}

export function getDistrictForColumn(slug: string | null | undefined): DistrictConfig | null {
  if (!slug) return null
  return EDUCATION_DISTRICTS.find(d => d.slug === slug) ?? null
}

/** URL the district tab links to — the district's column landing page.
 *  Uses the /columns/<slug> route that already lists all articles for
 *  the column, so no new hub route is required. */
export function districtColumnUrl(district: DistrictConfig): string {
  return `/columns/${district.slug}`
}
