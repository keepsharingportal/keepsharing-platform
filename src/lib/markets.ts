// Single source of truth for publication / market metadata.
// Slugs come from publications.slug in the DB; this file mirrors them so the
// admin UI doesn't need a DB roundtrip just to render labels and colors.
//
// Anywhere new admin code needs to enumerate brands or convert a slug into a
// display label, pull from here — don't hard-code the slug list inline.

/** Brand families gate cross-publish defaults. A 'parents' article shouldn't
 *  syndicate to a 50+ brand by accident — the audiences don't overlap. The
 *  admin editor restricts the syndicated-brands picker to the origin's
 *  family by default, with a manual "show all brands" expand for the rare
 *  intentional cross-family piece. */
export type BrandFamily = 'parents' | 'fifty-plus'

export interface MarketDef {
  slug:        string
  short:       string  // 3–4 letter chip label (RRP, BOOM, AOP)
  displayName: string
  city:        string
  state:       string
  family:      BrandFamily
  /** Public origin URL — emitted in rel=canonical for syndicated articles
   *  and used by middleware to map host header → brand. Falls back to a
   *  generic per-brand subdomain pattern if you deploy on subdomains
   *  before owning the separate domains. */
  publicHost:  string
  /** The geographic region phrase used in body copy: "Real stories from
   *  <regionLabel> moms", "Reach <regionLabel> families". Lets each brand
   *  refer to its readership without saying "River Region" everywhere. */
  regionLabel: string
}

export const MARKETS: MarketDef[] = [
  { slug: 'rrp',  short: 'RRP',  displayName: 'River Region Parents',      city: 'Montgomery', state: 'AL', family: 'parents',    publicHost: 'riverregionparents.com',     regionLabel: 'River Region' },
  { slug: 'boom', short: 'BOOM', displayName: 'River Region Boom',         city: 'Montgomery', state: 'AL', family: 'fifty-plus', publicHost: 'riverregionboom.com',        regionLabel: 'River Region' },
  { slug: 'aop',  short: 'AOP',  displayName: 'Auburn Opelika Parents',    city: 'Auburn',     state: 'AL', family: 'parents',    publicHost: 'auburnopelikaparents.com',   regionLabel: 'Auburn Opelika' },
  { slug: 'mbp',  short: 'MBP',  displayName: 'Mobile Bay Parents',        city: 'Mobile',     state: 'AL', family: 'parents',    publicHost: 'mobilebayparents.com',       regionLabel: 'Mobile Bay' },
  { slug: 'esp',  short: 'ESP',  displayName: 'Eastern Shore Parents',     city: 'Daphne',     state: 'AL', family: 'parents',    publicHost: 'easternshoreparents.com',    regionLabel: 'Eastern Shore' },
  { slug: 'gpp',  short: 'GPP',  displayName: 'Greater Pensacola Parents', city: 'Pensacola',  state: 'FL', family: 'parents',    publicHost: 'greaterpensacolaparents.com', regionLabel: 'Greater Pensacola' },
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

/** All brands in the same family as the given slug, excluding the slug
 *  itself. Used by the syndicated-brands picker in the article editor to
 *  show sensible defaults (parents brands for a parents article, fifty-plus
 *  for a 50+ article). */
export function siblingBrandsInFamily(slug: string): MarketDef[] {
  const m = MARKETS.find(x => x.slug === slug)
  if (!m) return []
  return MARKETS.filter(x => x.family === m.family && x.slug !== slug)
}

/** Resolve a host header (request.headers.get('host')) to a brand slug.
 *  Returns null if no match — middleware decides whether to default-to-rrp
 *  or 404 based on env. Strips port + www, lowercases. */
export function brandFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const cleaned = host.toLowerCase().replace(/^www\./, '').split(':')[0]
  for (const m of MARKETS) {
    if (cleaned === m.publicHost) return m.slug
    // Also accept subdomain pattern <slug>.<anyparent> for staging /
    // preview deployments where you don't yet own the separate domains.
    if (cleaned.startsWith(`${m.slug}.`)) return m.slug
  }
  return null
}

export function publicOriginForBrand(slug: string): string {
  const m = MARKETS.find(x => x.slug === slug)
  return m ? `https://${m.publicHost}` : ''
}
