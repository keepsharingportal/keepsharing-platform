// The Business Spotlight industry taxonomy — one source of truth for the hub
// filter, the admin dropdown, and the URL.
//
// Two representations on purpose:
//
//   label — what's stored in guide_articles.industry and shown to readers.
//           Exact strings, set by the editor. Changing one here without a
//           data migration orphans every story already tagged with the old
//           text, so treat these as fixed.
//
//   slug  — what appears in ?industry=. The labels contain spaces and
//           ampersands, so using them raw would produce
//           ?industry=Education%20%26%20Learning in a link someone pastes
//           into Facebook. The slug keeps shared URLs readable.

export interface Industry {
  slug:  string
  label: string
  /** One line for the chip's tooltip and the filtered view's subhead. */
  blurb: string
}

export const INDUSTRIES: Industry[] = [
  { slug: 'healthcare',           label: 'Healthcare',              blurb: 'Pediatricians, dentists, therapists and family clinics.' },
  { slug: 'education-learning',   label: 'Education & Learning',    blurb: 'Schools, tutors, preschools and enrichment programs.' },
  { slug: 'fun-activities',       label: 'Fun & Activities',        blurb: 'Places to take the kids on a Saturday.' },
  { slug: 'home-services',        label: 'Home & Services',         blurb: 'The people you call when something needs doing.' },
  { slug: 'food-dining',          label: 'Food & Dining',           blurb: 'Family-friendly tables around the River Region.' },
  { slug: 'faith-community',      label: 'Faith & Community',       blurb: 'Churches, nonprofits and the groups holding things together.' },
  { slug: 'sports-fitness',       label: 'Sports & Fitness',        blurb: 'Leagues, gyms, dance and everything that burns energy.' },
  { slug: 'shopping-local-goods', label: 'Shopping & Local Goods',  blurb: 'Local shops and the people who make things here.' },
]

const BY_SLUG  = new Map(INDUSTRIES.map(i => [i.slug, i]))
const BY_LABEL = new Map(INDUSTRIES.map(i => [i.label.toLowerCase(), i]))

/** ?industry=education-learning → the Industry, or null when unrecognized.
 *  Also accepts the raw label, so an old link built before the slugs existed
 *  still resolves instead of silently showing everything. */
export function industryFromParam(param: string | null | undefined): Industry | null {
  if (!param) return null
  const key = param.trim().toLowerCase()
  return BY_SLUG.get(key) ?? BY_LABEL.get(key) ?? null
}

/** Stored label → its Industry. Returns null for a label that isn't in the
 *  taxonomy (possible if a row was tagged before a label was renamed). */
export function industryFromLabel(label: string | null | undefined): Industry | null {
  if (!label) return null
  return BY_LABEL.get(label.trim().toLowerCase()) ?? null
}

/** Hub URL for an industry, or the unfiltered hub when null. */
export function industryHref(industry: Industry | null): string {
  return industry ? `/business-spotlight?industry=${industry.slug}` : '/business-spotlight'
}
