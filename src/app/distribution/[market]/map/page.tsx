// /distribution/[market]/map — public pickup-location map.
//
// Anyone can hit this — no auth needed. Shows every active stop in the
// market on a Leaflet map with route filter chips, search, and featured
// advertiser badges on the popups. Ports the PHP `public/_map_template.php`
// layout into our Next.js + Supabase stack.
//
// URL pattern: /distribution/rrp/map, /distribution/boom/map, etc. The
// market slug is validated against ALL_MARKET_SLUGS — unknown markets
// 404. Each market gets the same template; the only difference is the
// stops data + brand name.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navigation as NavIcon, ExternalLink, Mail } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { PublicMapClient } from './PublicMapClient'

export const dynamic   = 'force-dynamic'
export const revalidate = 120

interface PageProps { params: Promise<{ market: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return {
    title: `Pick Up ${marketDisplayName(market)} — Locations Map`,
    description: `Find a free copy of ${marketDisplayName(market)} near you.`,
  }
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export default async function PublicMapPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const client = sb()
  const [routesRes, stopsRes] = await Promise.all([
    client.from('circulation_routes').select('id, name').eq('market', market).eq('active', true),
    client.from('circulation_stops')
      .select('id, route_id, name, address, city, zip, lat, lng, is_advertiser, is_featured, ad_level, website, instagram, facebook, tiktok, logo_path, quantities')
      .eq('market', market)
      .eq('active', true),
  ])
  const routes = (routesRes.data ?? []) as Array<{ id: string; name: string }>
  const stops  = (stopsRes.data ?? []) as Parameters<typeof PublicMapClient>[0]['stops']

  const brand = marketDisplayName(market)

  return (
    <div className="min-h-screen bg-background public-page">
      {/* Header strip — branded, simple. Links back to the main site. */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <NavIcon className="h-5 w-5 text-primary" />
            <span className="text-lg font-black tracking-tight">{brand}</span>
          </Link>
          <Link
            href={`/distribution/${market}/request`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" /> Request a Pickup Location
          </Link>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Pick Up Locations</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {stops.length} places across the {brand} area where you can grab a free copy. Filter by route or search by name.
          </p>
        </div>

        <PublicMapClient stops={stops} routes={routes} />

        <p className="text-xs text-muted-foreground">
          Don&apos;t see your favorite spot?{' '}
          <Link href={`/distribution/${market}/request`} className="text-primary hover:underline inline-flex items-center gap-1">
            Suggest a location <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </main>
    </div>
  )
}
