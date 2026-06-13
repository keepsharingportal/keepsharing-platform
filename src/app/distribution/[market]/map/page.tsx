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
import { loadBrand, chromeForBrand } from '@/lib/brands'
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
    // Pull stops + their canonical business profile (Phase 2 of the
    // businesses-master rollout). When a stop is linked to a business
    // we prefer that profile's name/address/socials/logo over the
    // stop's own duplicated columns; the stop columns remain as a
    // fallback for un-linked rows so the map still renders before the
    // backfill walks everything.
    client.from('circulation_stops')
      .select(`
        id, name, address, city, zip, lat, lng,
        is_advertiser, ad_level, advertiser_account_id, business_id,
        website, instagram, facebook, tiktok, logo_path,
        quantities,
        business:businesses!circulation_stops_business_id_fkey (
          id, name, address, city, zip,
          website, instagram, facebook, tiktok,
          logo_path, description
        )
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

  type BizJoin = {
    id: string; name: string;
    address: string | null; city: string | null; zip: string | null;
    website: string | null; instagram: string | null; facebook: string | null; tiktok: string | null;
    logo_path: string | null; description: string | null;
  }
  type RawStop = {
    id: string; name: string; address: string | null; city: string | null; zip: string | null;
    lat: number | null; lng: number | null;
    is_advertiser: boolean; ad_level: string | null; advertiser_account_id: string | null;
    business_id: string | null;
    website: string | null; instagram: string | null; facebook: string | null; tiktok: string | null;
    logo_path: string | null;
    quantities: Record<string, number> | null;
    // PostgREST returns embedded resources as an array even for single FK
    // joins. Type accordingly and unwrap [0] below.
    business: BizJoin[] | BizJoin | null;
  }
  const rawStops = (stopsRes.data ?? []) as unknown as RawStop[]

  // Filter to stops that actually carry THIS publication (quantity > 0
  // for at least one of the publication's slug aliases) AND have
  // plausible coordinates. We log + drop stops whose lat/lng are way
  // outside the regional bounding box — a single bad geocode (Coosa
  // County instead of Montgomery, etc.) was pulling fit-bounds far off
  // the actual cluster and making the map look empty.
  function isPlausibleCoord(lat: number | null, lng: number | null): boolean {
    if (lat == null || lng == null) return false
    // Generous Southeast US bounding box. Anything outside is almost
    // certainly a geocoder mistake. Tighten per-region later if needed.
    return lat >= 29 && lat <= 36 && lng >= -89 && lng <= -83
  }

  const stops: ReaderStop[] = rawStops
    .filter(s => {
      if (!s.quantities) return false
      for (const k of pubKeys) {
        const q = s.quantities[k]
        if (typeof q === 'number' && q > 0) return true
      }
      return false
    })
    .map(s => {
      // Resolve canonical fields: prefer the linked business profile,
      // fall back to the stop's own duplicated columns. Once the
      // backfill has linked every stop and the admin has had a chance
      // to review, we can drop the stop-level columns in migration 176.
      const biz = Array.isArray(s.business) ? s.business[0] : s.business
      const pick = <T,>(fromBiz: T | null | undefined, fromStop: T | null | undefined): T | null =>
        (fromBiz ?? fromStop ?? null)
      return {
        id:            s.id,
        name:          pick(biz?.name, s.name) ?? s.name,
        address:       pick(biz?.address, s.address),
        city:          pick(biz?.city, s.city),
        zip:           pick(biz?.zip, s.zip),
        // Drop wildly-wrong coordinates here so the map still renders the
        // stop in the list (so the editor can fix the geocode in admin),
        // but it doesn't anchor the map bounds. lat/lng stay on stops
        // because they're delivery-specific (a business with multiple
        // pickup spots needs distinct coords per stop).
        lat:           isPlausibleCoord(s.lat, s.lng) ? s.lat : null,
        lng:           isPlausibleCoord(s.lat, s.lng) ? s.lng : null,
        is_advertiser: !!s.is_advertiser,
        ad_level:      (s.ad_level as ReaderStop['ad_level']) ?? null,
        website:       pick(biz?.website,   s.website),
        instagram:     pick(biz?.instagram, s.instagram),
        facebook:      pick(biz?.facebook,  s.facebook),
        tiktok:        pick(biz?.tiktok,    s.tiktok),
        logo_path:     pick(biz?.logo_path, s.logo_path),
        description:   biz?.description ?? null,
      }
    })

  const resources: ReaderResource[] = ((resourcesRes.data ?? []) as ReaderResource[])

  // Pull this brand's chrome so the reader map renders in the brand's
  // own colors (coral on RRP, navy + amber on 50+, etc.) — matching the
  // brand pin + the "Request a pickup location" CTA in the header.
  const brandObj    = await loadBrand(market === 'boom' ? 'rr50plus' : market)
  const chrome      = brandObj ? chromeForBrand(brandObj) : null
  const brandColor  = chrome?.primaryColorHex ?? '#1A5FA8'
  const accentColor = chrome?.accentColorHex  ?? brandColor

  return (
    <PublicReaderMap
      brand={brand}
      market={market}
      stops={stops}
      resources={resources}
      brandColor={brandColor}
      accentColor={accentColor}
    />
  )
}
