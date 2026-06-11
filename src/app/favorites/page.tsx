// /favorites — public "things I saved" dashboard.
//
// Anonymous-first: reads the device token from localStorage and fetches
// favorites from /api/reader/favorites. No auth, no account. When the
// user later subscribes to the newsletter, the favorites get linked to
// their email and become reachable from other devices they sign in on.

import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { FavoritesClient } from './FavoritesClient'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await loadBrandContext()
  return {
    title:       `Your Saved — ${ctx.market.displayName}`,
    description: `Articles + local businesses you've saved from ${ctx.market.displayName}.`,
    robots: { index: false, follow: false },
  }
}

export default async function FavoritesPage() {
  const ctx    = await loadBrandContext()
  const chrome = chromeForBrand(ctx.brand)
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation brandSlug={ctx.slug} chrome={chrome} />
      <main className="container py-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
          {ctx.market.regionLabel} · Your Saved
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
          Things you saved
        </h1>
        <p className="text-muted-foreground mb-6">
          Articles and local businesses you bookmarked. Subscribe to the newsletter and we&apos;ll keep your saves linked across devices.
        </p>
        <FavoritesClient brandSlug={ctx.slug} brandName={ctx.market.displayName} />
      </main>
      <PublicFooter brandSlug={ctx.slug} chrome={chrome} />
    </div>
  )
}
