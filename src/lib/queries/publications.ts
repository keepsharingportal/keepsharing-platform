// ── src/lib/queries/publications.ts ───────────────────────────────────────────
// Publication filter foundation.
// All platform publications as a typed constant; helpers for normalizing
// and applying publication filters consistently across admin dashboards.
// ─────────────────────────────────────────────────────────────────────────────

export const PUBLICATIONS = ['rrp', 'mbp', 'aop', 'esp', 'gpp', 'boom'] as const
export type PublicationSlug = typeof PUBLICATIONS[number]

export const PUBLICATION_NAMES: Record<PublicationSlug, string> = {
  rrp:  'River Region Parents',
  mbp:  'Mobile Bay Parents',
  aop:  'Auburn Opelika Parents',
  esp:  'Eastern Shore Parents',
  gpp:  'Greater Pensacola Parents',
  boom: 'River Region Boom',
}

export const PUBLICATION_COLORS: Record<PublicationSlug, string> = {
  rrp:  '#22c55e',
  mbp:  '#3b82f6',
  aop:  '#f97316',
  esp:  '#a855f7',
  gpp:  '#14b8a6',
  boom: '#eab308',
}

/**
 * Validate and normalize a raw publication string from URL params or form data.
 * Returns null if the value is absent or not a recognized publication slug.
 */
export function normalizePublication(raw: string | undefined | null): PublicationSlug | null {
  if (!raw) return null
  const lower = raw.toLowerCase().trim()
  return (PUBLICATIONS as readonly string[]).includes(lower)
    ? (lower as PublicationSlug)
    : null
}

/**
 * Human-readable name for a publication slug.
 * Returns the slug itself if not recognized.
 */
export function publicationName(pub: string): string {
  return PUBLICATION_NAMES[pub as PublicationSlug] ?? pub
}

/**
 * Short name for display in compact UI (e.g. "River Region" instead of "River Region Parents").
 */
export function publicationShortName(pub: string): string {
  const full = publicationName(pub)
  if (full.includes('River Region')) return 'River Region'
  const words = full.split(' ')
  return words.slice(0, 2).join(' ')
}

/**
 * Apply a publication filter to a Supabase query builder.
 * No-ops if pub is null (returns all publications).
 *
 * Usage:
 *   let q = supabase.from('community_submissions').select('...')
 *   q = applyPublicationFilter(q, filterPub)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyPublicationFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  pub: PublicationSlug | null,
  column = 'target_publication',
): T {
  if (!pub) return query
  return query.eq(column, pub)
}
