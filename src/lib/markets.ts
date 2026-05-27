// Single source of truth for publication / market metadata.
// Slugs come from publications.slug in the DB; this file mirrors them so the
// admin UI doesn't need a DB roundtrip just to render labels and colors.
//
// Anywhere new admin code needs to enumerate brands or convert a slug into a
// display label, pull from here — don't hard-code the slug list inline.

export interface MarketDef {
  slug:        string
  short:       string  // 3–4 letter chip label (RRP, BOOM, AOP)
  displayName: string
  city:        string
  state:       string
}

export const MARKETS: MarketDef[] = [
  { slug: 'rrp',  short: 'RRP',  displayName: 'River Region Parents',     city: 'Montgomery', state: 'AL' },
  { slug: 'boom', short: 'BOOM', displayName: 'River Region Boom',        city: 'Montgomery', state: 'AL' },
  { slug: 'aop',  short: 'AOP',  displayName: 'Auburn Opelika Parents',   city: 'Auburn',     state: 'AL' },
  { slug: 'mbp',  short: 'MBP',  displayName: 'Mobile Bay Parents',       city: 'Mobile',     state: 'AL' },
  { slug: 'esp',  short: 'ESP',  displayName: 'Eastern Shore Parents',    city: 'Daphne',     state: 'AL' },
  { slug: 'gpp',  short: 'GPP',  displayName: 'Greater Pensacola Parents', city: 'Pensacola',  state: 'FL' },
]

export const ALL_MARKET_SLUGS: string[] = MARKETS.map(m => m.slug)

// The synthetic 'all' value is what a super-admin selects to aggregate across
// every market. It's distinct from a real publication slug and only valid for
// users with role='super'.
export const ALL_MARKETS_SLUG = 'all' as const
export type ActiveMarket = string | typeof ALL_MARKETS_SLUG

export function isKnownMarket(slug: unknown): slug is string {
  return typeof slug === 'string' && ALL_MARKET_SLUGS.includes(slug)
}

export function marketDisplayName(slug: string): string {
  if (slug === ALL_MARKETS_SLUG) return 'All brands'
  return MARKETS.find(m => m.slug === slug)?.displayName ?? slug
}

export function marketShort(slug: string): string {
  if (slug === ALL_MARKETS_SLUG) return 'ALL'
  return MARKETS.find(m => m.slug === slug)?.short ?? slug.toUpperCase()
}
