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
  /** author_slug in the seo_authors table — the DB is the source of
   *  truth for name / bio / photo / title. Editor updates them at
   *  /admin/seo/authors/[slug]. The code fields below are a safety
   *  net if the row is missing. */
  authorSlug: string
  /** Fallback fields, used when the DB row is missing OR the field
   *  is empty on the row. Once the seo_authors seed migration has
   *  run, DB values win. */
  name:       string
  title:      string
  /** Public URL of the headshot. When migrated to seo_authors this
   *  is used only if the DB row has no headshot_url. */
  photoUrl:   string
  bio:        string
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
  /** District's real brand color. Drives district tabs, accent bars,
   *  and the branded hero card that renders when an article has no
   *  uploaded hero image. Pulled from each district's own logo, not
   *  arbitrary — so cards read as instantly-recognizable district
   *  identity. */
  accent:         string
  /** Softer tint of the same color for filled backgrounds (superintendent
   *  card left panel, tab hover states). */
  softAccent:     string
  /** Path to the district's logo PNG under /public. Rendered white-on-
   *  brand-color inside the branded hero card. When the file is missing
   *  (404), the card falls back to rendering the district name in big
   *  block letters — so the layout ships and works even before the logo
   *  asset lands in the repo. */
  logoUrl:        string
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
    accent:       '#7B152D',  // MPS maroon (matches the shield/dome logo)
    softAccent:   '#F7E9EC',
    logoUrl:      '/images/districts/montgomery.png',
    location:     'Montgomery, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      authorSlug: 'zickeyous-byrd',
      name:       'Dr. Zickeyous Byrd',
      title:      'Superintendent',
      photoUrl:   '/images/superintendents/montgomery.jpg',
      bio:        'Bio maintained in the seo_authors row — edit at /admin/seo/authors/zickeyous-byrd.',
    },
  },
  {
    slug:         'education-matters-pike-road',
    shortName:    'Pike Road',
    fullName:     'Pike Road Schools',
    countyLabel:  'Pike Road',
    accent:       '#1B2A55',  // PRS navy (matches PRS shield)
    softAccent:   '#EDF0F7',
    logoUrl:      '/images/districts/pike-road.png',
    location:     'Pike Road, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      authorSlug: 'jason-goodwin',
      name:       'Dr. Jason Goodwin',
      title:      'Superintendent',
      photoUrl:   '/images/superintendents/pike-road.jpg',
      bio:        'Dr. Jason Goodwin is the Superintendent of Pike Road Schools and has dedicated his career to serving students as a teacher, coach, principal, and district leader. He believes great schools are built on strong relationships, high expectations, and a shared commitment to excellence, with every decision focused on what is best for students.',
    },
  },
  {
    slug:         'education-matters-elmore',
    shortName:    'Elmore County',
    fullName:     'Elmore County Schools',
    countyLabel:  'Elmore County',
    accent:       '#1E3766',  // ECPS navy (matches the round shield inner)
    softAccent:   '#EAF0F8',
    logoUrl:      '/images/districts/elmore.png',
    location:     'Wetumpka, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      authorSlug: 'richard-dennis',
      name:       'Richard Dennis',
      title:      'Superintendent',
      photoUrl:   '/images/superintendents/elmore.jpg',
      bio:        'Bio maintained in the seo_authors row — edit at /admin/seo/authors/richard-dennis.',
    },
  },
  {
    slug:         'education-matters-autauga',
    shortName:    'Autauga County',
    fullName:     'Autauga County Schools',
    countyLabel:  'Autauga County',
    accent:       '#B0201F',  // ACS red (from the district site header + logo accent)
    softAccent:   '#FBECEB',
    logoUrl:      '/images/districts/autauga.png',
    location:     'Prattville, Alabama',
    focusDefault: 'Superintendent’s Message',
    superintendent: {
      // Editor edited the seeded 'autauga-superintendent' row in place
      // (updating display_name to 'Lyman Woodfin') instead of creating
      // a new slug — so the DB row still lives at this slug. Fine for
      // now; slug is admin-only surface area.
      authorSlug: 'autauga-superintendent',
      name:       'Lyman Woodfin',
      title:      'Superintendent',
      photoUrl:   '/images/superintendents/autauga.jpg',
      bio:        'Bio maintained in the seo_authors row — edit at /admin/seo/authors/autauga-superintendent.',
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
