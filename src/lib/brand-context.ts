// Server-side brand context for the public site.
//
// The proxy stamps `x-brand-slug` on every public request. This module
// reads it back, joins with MARKETS + brand_voice, and returns a tidy
// object every page can use to:
//   - Filter article queries by brand (origin OR syndicated_to)
//   - Render brand-specific chrome (display name, public host)
//   - Emit rel=canonical pointing to the origin brand for syndicated rows
//
// The function is cached() so multiple components in the same render
// share one DB hit for the brand_voice row.

import { cache } from 'react'
import { headers } from 'next/headers'
import { MARKETS, type MarketDef, publicOriginForBrand } from './markets'
import { loadBrand, type Brand } from './brands'

export interface BrandContext {
  /** The active brand slug. Default 'rrp' if the proxy didn't stamp a
   *  header (e.g., direct localhost hits without the dev cookie). */
  slug:         string
  market:       MarketDef
  /** Brand voice + voice rules — same shape used by AI integrations. */
  brand:        Brand
  /** Origin URL for this brand, e.g. https://riverregionparents.com. Used
   *  in rel=canonical + cross-publish links. */
  publicOrigin: string
}

export const loadBrandContext = cache(async (): Promise<BrandContext> => {
  const h = await headers()
  const stamped = h.get('x-brand-slug')
  const slug = stamped && MARKETS.some(m => m.slug === stamped) ? stamped : 'rrp'
  const market = MARKETS.find(m => m.slug === slug)!
  const brand = await loadBrand(slug)
  return {
    slug,
    market,
    brand: brand ?? { slug, displayName: market.displayName, market, voice: null },
    publicOrigin: publicOriginForBrand(slug),
  }
})

/** Build a Supabase filter expression for "articles visible on this
 *  brand's site": rows where the brand is the origin OR the brand is
 *  listed in syndicated_to_brands. Use with a Supabase query:
 *
 *    const filter = articleBrandFilter(ctx.slug)
 *    await sb.from('guide_articles').select('*').or(filter)
 */
export function articleBrandFilter(brandSlug: string): string {
  // PostgREST OR expression. `cs` = array contains.
  return `brand_slug.eq.${brandSlug},syndicated_to_brands.cs.{${brandSlug}}`
}

/** Compute the canonical URL for an article from a given brand's
 *  perspective. If the brand is the origin, canonical = current page.
 *  If it's a syndicated brand, canonical = origin brand's URL. The
 *  article slug + URL shape is the same across brands; only the host
 *  changes. */
export function articleCanonicalUrl(article: { brand_slug: string; slug: string }, currentBrandSlug: string, currentPath: string): string {
  if (article.brand_slug === currentBrandSlug) {
    return `${publicOriginForBrand(currentBrandSlug)}${currentPath}`
  }
  return `${publicOriginForBrand(article.brand_slug)}${currentPath}`
}
