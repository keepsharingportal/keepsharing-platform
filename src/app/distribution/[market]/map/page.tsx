// /distribution/[market]/map — public pickup-location map.
//
// Anyone can hit this — no auth needed. The market slug in the URL is the
// PUBLICATION the reader is looking for (rrp, rr50plus, aop, etc.). We
// resolve that to the underlying region (a multi-publication area can
// share one set of stops with different quantities per pub), then filter
// the stops down to those that actually carry copies of this publication.
//
// Result: /distribution/rrp/map shows every stop carrying RRP, and
// /distribution/rr50plus/map shows every stop carrying Boom/50+ —
// possibly the same physical addresses, possibly different.

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { regionForMarket } from '@/lib/circulation/regions'
import { PublicReaderMap, type ReaderStop, type ReaderResource } from './PublicReaderMap'

export const dynamic    = 'force-dynamic'
export const revalidate = 120

interface PageProps { params: Promise<{ market: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market) && market !== 'boom') return {}
  return {
    title:       `Pick up ${marketDisplayName(market)} — locations map`,
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

// Build the list of publication keys to look for in quantities — accepts
// both the new slug and any legacy alias for the same publication.
function quantityKeysFor(publicationSlug: string): string[] {
  if (publicationSlug === 'rr50plus' || publicationSlug === 'boom') return ['rr50plus', 'boom']
  return [publicationSlug]
}

export default async function PublicMapPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market) && market !== 'boom') notFound()

  // market here is a PUBLICATION slug. Resolve to the region whose stops
  // table contains the data.
  const region        = regionForMarket(market)
  const dbKey         = region.slug
  const pubKeys       = quantityKeysFor(market)
  const brand         = marketDisplayName(market)

  const client = sb()
  const [stopsRes, resourcesRes] = await Promise.all([
    client.from('circulation_stops')
      .select(`
        id, name, address, city, zip, lat, lng,
        is_advertiser, ad_level, advertiser_account_id,
        website, instagram, facebook, tiktok, logo_path,
        quantities
      `)
      .eq('market', dbKey)
      .eq('active', true)
      .eq('not_delivering', false)
      .eq('is_pickup', false),
    client.from('circulation_resources')
      .select('id, name, category, description, address, city, phone, email, website, logo_path, photo_path')
      .eq('market', dbKey)
      .eq('active', true),
  ])

  type RawStop = {
    id: string; name: string; address: string | null; city: string | null; zip: string | null;
    lat: number | null; lng: number | null;
    is_advertiser: boolean; ad_level: string | null; advertiser_account_id: string | null;
    website: string | null; instagram: string | null; facebook: string | null; tiktok: string | null;
    logo_path: string | null;
    quantities: Record<string, number> | null;
  }
  const rawStops = (stopsRes.data ?? []) as RawStop[]

  // Filter to stops that actually carry THIS publication (quantity > 0
  // for at least one of the publication's slug aliases).
  const stops: ReaderStop[] = rawStops
    .filter(s => {
      if (!s.quantities) return false
      for (const k of pubKeys) {
        const q = s.quantities[k]
        if (typeof q === 'number' && q > 0) return true
      }
      return false
    })
    .map(s => ({
      id:        s.id,
      name:      s.name,
      address:   s.address,
      city:      s.city,
      zip:       s.zip,
      lat:       s.lat,
      lng:       s.lng,
      ad_level:  (s.ad_level as ReaderStop['ad_level']) ?? null,
      website:   s.website,
      instagram: s.instagram,
      facebook:  s.facebook,
      tiktok:    s.tiktok,
      logo_path: s.logo_path,
    }))

  const resources: ReaderResource[] = ((resourcesRes.data ?? []) as ReaderResource[])

  return (
    <PublicReaderMap
      brand={brand}
      market={market}
      stops={stops}
      resources={resources}
    />
  )
}
