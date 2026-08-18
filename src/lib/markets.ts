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
  /** The towns the brand actually covers, most-recognizable first. Rendered
   *  in the footer as "Serving A, B, C and more."
   *
   *  Why this exists: regionLabel ("River Region") is an insider term. Someone
   *  who moved to Prattville six weeks ago doesn't know they live in the River
   *  Region, and search engines don't either — readers search "Prattville
   *  childcare", not "River Region childcare". Naming the towns is both a
   *  clarity fix for newcomers and the local-SEO signal regionLabel can't be.
   *
   *  Empty array renders nothing. Sibling brands: fill these in. */
  serviceArea: string[]
}

export const MARKETS: MarketDef[] = [
  // www, not apex: riverregionparents.com 308-redirects to www in Vercel, so
  // declaring the apex made every canonical, og:url, og:image, sitemap entry
  // and generated share link point at a URL that immediately redirects. RRP is
  // the only brand configured this way — the other four serve on the apex, and
  // their entries below are correct as-is. If RRP's Vercel domain is ever
  // flipped to apex-primary to match them, change this back.
  { slug: 'rrp',      short: 'RRP',  displayName: 'River Region Parents',      city: 'Montgomery', state: 'AL', family: 'parents',    publicHost: 'www.riverregionparents.com', regionLabel: 'River Region',     serviceArea: ['Montgomery', 'Prattville', 'Wetumpka', 'Pike Road'] },
  // Fifty-plus brands. River Region 50+ was previously slugged 'boom' (the
  // "BOOM" brand) — migration 169 renames it and all user data references.
  // Future markets follow the same xx50plus pattern (mb50plus, es50plus,
  // ao50plus, gp50plus). Domains write out "plus" because URL-encoding
  // turns "+" into "%2B" which is ugly + breaks share links.
  { slug: 'rr50plus', short: 'R50+', displayName: 'River Region 50+',          city: 'Montgomery', state: 'AL', family: 'fifty-plus', publicHost: 'riverregion50plus.com',      regionLabel: 'River Region',      serviceArea: ['Montgomery', 'Prattville', 'Wetumpka', 'Pike Road'] },
  { slug: 'aop',      short: 'AOP',  displayName: 'Auburn Opelika Parents',    city: 'Auburn',     state: 'AL', family: 'parents',    publicHost: 'auburnopelikaparents.com',   regionLabel: 'Auburn Opelika',    serviceArea: [] },
  { slug: 'mbp',      short: 'MBP',  displayName: 'Mobile Bay Parents',        city: 'Mobile',     state: 'AL', family: 'parents',    publicHost: 'mobilebayparents.com',       regionLabel: 'Mobile Bay',        serviceArea: [] },
  { slug: 'esp',      short: 'ESP',  displayName: 'Eastern Shore Parents',     city: 'Daphne',     state: 'AL', family: 'parents',    publicHost: 'easternshoreparents.com',    regionLabel: 'Eastern Shore',     serviceArea: [] },
  { slug: 'gpp',      short: 'GPP',  displayName: 'Greater Pensacola Parents', city: 'Pensacola',  state: 'FL', family: 'parents',    publicHost: 'greaterpensacolaparents.com', regionLabel: 'Greater Pensacola', serviceArea: [] },
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

/**
 * Absolute URL for a public page on a specific brand's own domain.
 *
 * THE RULE: any link from the admin to a reader-facing page must go through
 * this. The admin is served from app.keepsharing.com, which hosts every brand,
 * so a relative href like "/columns/play-ball/mark-hall" resolves to
 * app.keepsharing.com/columns/... — a 404, because that path only exists on
 * the brand domains. Selecting "River Region Parents" in the switcher changes
 * which content you see; it cannot change how the browser resolves a relative
 * URL.
 *
 * This was already being solved one link at a time — publicMapUrl and
 * publicRequestUrl below are the same fix written twice — while 30-odd other
 * admin links still point at the admin host. One helper, so the next brand
 * that comes online works without anyone remembering this.
 *
 * Unknown or all-brands slug returns the path unchanged, which is the current
 * behaviour rather than a fabricated host.
 */
export function publicUrl(path: string, slug: string | null | undefined): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  const host  = slug ? MARKETS.find(m => m.slug === slug)?.publicHost : undefined
  return host ? `https://${host}${clean}` : clean
}

/** Absolute URL for a market's public pickup-location map. */
export function publicMapUrl(slug: string): string {
  return publicUrl(`/distribution/${slug}/map`, slug)
}

/** Absolute URL for a market's public pickup-request form. */
export function publicRequestUrl(slug: string): string {
  return publicUrl(`/distribution/${slug}/request`, slug)
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
