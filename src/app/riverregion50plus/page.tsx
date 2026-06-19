// /riverregion50plus — path-based preview of the River Region 50+ home
// on the app.keepsharing.com host. The real site is host-routed (proxy
// stamps x-brand-slug from the request host → loadBrandContext) so the
// fifty-plus template only renders at riverregion50plus.com. This route
// hand-builds the brand context so the page can be reviewed before the
// domain is pointed at Vercel.
//
// Once riverregion50plus.com is wired, this route can stay (handy for
// internal preview/QA) or be removed.

import type { Metadata } from 'next'
import { FiftyPlusHomePage } from '@/components/fifty-plus/HomePage'
import { MARKETS, publicOriginForBrand } from '@/lib/markets'
import { loadBrand } from '@/lib/brands'
import type { BrandContext } from '@/lib/brand-context'

export const metadata: Metadata = {
  title: 'River Region 50+ — Preview',
  // Don't index the preview path; the live domain is canonical.
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function FiftyPlusPreview() {
  const slug   = 'rr50plus'
  const market = MARKETS.find(m => m.slug === slug)!
  const brand  = await loadBrand(slug)
  const brandCtx: BrandContext = {
    slug,
    market,
    brand: brand ?? { slug, displayName: market.displayName, market, voice: null },
    publicOrigin: publicOriginForBrand(slug),
  }
  return <FiftyPlusHomePage brandCtx={brandCtx} />
}
