export type NeighborhoodSlug =
  | 'prattville'
  | 'wetumpka'
  | 'millbrook'
  | 'pike-road'
  | 'eastchase'
  | 'montgomery'

export type NeighborhoodMeta = {
  slug: NeighborhoodSlug
  label: string
  county: string
  schoolDistrict: string
  zips: string[]
  description: string
}

export const NEIGHBORHOODS: Record<NeighborhoodSlug, NeighborhoodMeta> = {
  prattville: {
    slug: 'prattville',
    label: 'Prattville',
    county: 'Autauga County',
    schoolDistrict: 'Autauga County Schools',
    zips: ['36066', '36067'],
    description: 'Serving families in Prattville and Autauga County',
  },
  wetumpka: {
    slug: 'wetumpka',
    label: 'Wetumpka',
    county: 'Elmore County',
    schoolDistrict: 'Elmore County Schools',
    zips: ['36092', '36093'],
    description: 'Serving families in Wetumpka and Elmore County',
  },
  millbrook: {
    slug: 'millbrook',
    label: 'Millbrook',
    county: 'Elmore County',
    schoolDistrict: 'Elmore County Schools',
    zips: ['36054'],
    description: 'Serving families in Millbrook and Elmore County',
  },
  'pike-road': {
    slug: 'pike-road',
    label: 'Pike Road',
    county: 'Montgomery County',
    schoolDistrict: 'Montgomery County Schools',
    zips: ['36064'],
    description: 'Serving families in Pike Road',
  },
  eastchase: {
    slug: 'eastchase',
    label: 'Eastchase',
    county: 'Montgomery County',
    schoolDistrict: 'Montgomery County Schools',
    zips: ['36117'],
    description: 'Serving families in the Eastchase area',
  },
  montgomery: {
    slug: 'montgomery',
    label: 'Montgomery',
    county: 'Montgomery County',
    schoolDistrict: 'Montgomery City Schools',
    zips: [],
    description: 'Serving all Montgomery-area families',
  },
}

// Explicit ZIP → neighborhood map (remainder of 361xx defaults to montgomery)
const ZIP_MAP: Record<string, NeighborhoodSlug> = {
  '36066': 'prattville',
  '36067': 'prattville',
  '36092': 'wetumpka',
  '36093': 'wetumpka',
  '36054': 'millbrook',
  '36064': 'pike-road',
  '36117': 'eastchase',
}

export function zipToNeighborhood(zip: string): NeighborhoodSlug {
  const exact = ZIP_MAP[zip]
  if (exact) return exact
  if (zip.startsWith('361')) return 'montgomery'
  return 'montgomery'
}

export function isValidSlug(slug: string): slug is NeighborhoodSlug {
  return slug in NEIGHBORHOODS
}

export const NEIGHBORHOOD_SLUGS = Object.keys(NEIGHBORHOODS) as NeighborhoodSlug[]

export const NEIGHBORHOOD_STORAGE_KEY = 'rrp_neighborhood'
