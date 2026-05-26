// Shared school-news enums + helpers. Used by the API, the admin UI, the
// public submission form, and the public browse page.

export type Area = 'montgomery' | 'autauga' | 'elmore' | 'pike-road'

export const AREAS: Area[] = ['montgomery', 'autauga', 'elmore', 'pike-road']

export const AREA_LABELS: Record<Area, string> = {
  'montgomery': 'Montgomery County',
  'autauga':    'Autauga County',
  'elmore':     'Elmore County',
  'pike-road':  'Pike Road',
}

// Short labels for tight badges on cards
export const AREA_SHORT_LABELS: Record<Area, string> = {
  'montgomery': 'Montgomery',
  'autauga':    'Autauga',
  'elmore':     'Elmore',
  'pike-road':  'Pike Road',
}

// Color-coded badge classes so each area has a distinct visual signature
// across the magazine — same palette the homepage uses for category accents.
export const AREA_BADGE_CLASS: Record<Area, string> = {
  'montgomery': 'bg-blue-600 text-white',
  'autauga':    'bg-orange-500 text-white',
  'elmore':     'bg-purple-600 text-white',
  'pike-road':  'bg-green-600 text-white',
}

// Soft (lower-contrast) variant for non-card surfaces — chip backgrounds etc.
export const AREA_SOFT_CLASS: Record<Area, string> = {
  'montgomery': 'bg-blue-50 text-blue-800 ring-blue-200',
  'autauga':    'bg-orange-50 text-orange-800 ring-orange-200',
  'elmore':     'bg-purple-50 text-purple-800 ring-purple-200',
  'pike-road':  'bg-green-50 text-green-800 ring-green-200',
}

// Special bucket: private schools cut across all areas
export const PRIVATE_BADGE_CLASS = 'bg-indigo-600 text-white'
export const PRIVATE_SOFT_CLASS  = 'bg-indigo-50 text-indigo-800 ring-indigo-200'

export function isValidArea(s: string | null | undefined): s is Area {
  return typeof s === 'string' && (AREAS as string[]).includes(s)
}

export type GradeBand = 'elementary' | 'middle' | 'high' | 'k12' | 'other'

export const GRADE_BANDS: GradeBand[] = ['elementary', 'middle', 'high', 'k12', 'other']

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  'elementary': 'Elementary',
  'middle':     'Middle',
  'high':       'High',
  'k12':        'K-12',
  'other':      'Other',
}

export function isValidGradeBand(s: string | null | undefined): s is GradeBand {
  return typeof s === 'string' && (GRADE_BANDS as string[]).includes(s)
}

// Normalize CSV cell values for boolean-like inputs: "yes"/"no"/"true"/"false"/"1"/"0"
export function parseBoolish(s: string | null | undefined): boolean {
  if (s === null || s === undefined) return false
  const v = String(s).trim().toLowerCase()
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'private'
}
