// /distribution/[market]/request — public form for businesses to request
// being added as a pickup location. Anonymous, no auth.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navigation as NavIcon, MapPin } from 'lucide-react'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { LocationRequestForm } from './LocationRequestForm'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ market: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return {
    title: `Request a pickup location — ${marketDisplayName(market)}`,
    description: `Suggest a location to carry ${marketDisplayName(market)}.`,
  }
}

export default async function LocationRequestPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()
  const region = regionForMarket(market)

  return (
    <div className="min-h-screen bg-background public-page">
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between gap-3">
          <Link href={`/distribution/${market}/map`} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <NavIcon className="h-5 w-5 text-primary" />
            <span className="text-lg font-black tracking-tight">{marketDisplayName(market)}</span>
          </Link>
          <Link
            href={`/distribution/${market}/map`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <MapPin className="h-3 w-3" /> See current locations
          </Link>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Suggest a pickup location</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;re always looking for new spots to carry {publicationLabelsForRegion(region)}. Fill out the form below and we&apos;ll get in touch.
          </p>
        </div>

        <LocationRequestForm market={market} regionName={region.name} />
      </main>
    </div>
  )
}
