// /admin/circulation/routes — Routes & Stops, single-page combined view.
//
// Verbatim port of the legacy admin/routes.php from
// _incoming/RRP_Portal_v3_FINAL/rrp_portal_v2. The page shows a 220px
// sidebar list of all routes on the left and the selected route's
// stops table on the right. Selection is via ?id=X URL param so deep
// links + back/forward navigation stay clean.
//
// Server fetches all data + passes to RoutesStopsClient (Client island)
// which owns interactivity: search filter, route switching (router.push),
// new-route modal, rename-route modal, add/edit-stop modal.
//
// Per-pub quantity columns are dynamic — read from circulation_publications.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { RoutesStopsClient } from './RoutesStopsClient'

export const metadata = { title: 'Routes & Stops — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ id?: string }> }

interface PubRow   { id: string; short_name: string; name: string; abbrev: string; sort_order: number }
interface RouteRow { id: string; name: string; city: string | null; active: boolean; sort_order: number }
interface StopRow  {
  id: string; route_id: string; sort_order: number; name: string;
  address: string | null; city: string | null; zip: string | null;
  notes: string | null; contact_name: string | null;
  contact_phone: string | null; contact_email: string | null;
  is_pickup: boolean; not_delivering: boolean; active: boolean;
  is_featured: boolean; is_advertiser: boolean;
  ad_level: string | null; logo_path: string | null;
  website: string | null; instagram: string | null;
  facebook: string | null; tiktok: string | null;
  lat: number | null; lng: number | null;
  quantities: Record<string, number> | null;
}

// Bundle math — mags per bundle comes from circulation_settings so the
// admin can change it without a code push. Round UP (Math.ceil) because
// you can't ship a half-bundle; a route needing 51 mags with a bundle
// size of 25 needs THREE bundles (75), not two.
function bundles(used: number, bundleSize: number): number {
  if (bundleSize <= 0) return 0
  return Math.ceil(used / bundleSize)
}

export default async function RoutesStopsPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  const [pubsRes, routesRes, bundleSizeRes] = await Promise.all([
    sb.from('circulation_publications').select('id, short_name, name, abbrev, sort_order').order('sort_order'),
    sb.from('circulation_routes')
      .select('id, name, city, active, sort_order')
      .eq('market', dbKey)
      .order('active', { ascending: false })
      .order('sort_order')
      .order('name'),
    sb.from('circulation_settings').select('value').eq('market', dbKey).eq('key', 'bundle_size').maybeSingle(),
  ])
  const bundleSize = Math.max(1, parseInt((bundleSizeRes.data as { value?: string } | null)?.value ?? '25', 10) || 25)
  const pubs   = (pubsRes.data ?? [])   as PubRow[]
  const routes = (routesRes.data ?? []) as RouteRow[]

  const requestedId = sp.id?.trim()
  const currentRoute: RouteRow | null = requestedId
    ? routes.find(r => r.id === requestedId) ?? null
    : routes[0] ?? null

  let stops: StopRow[] = []
  if (currentRoute) {
    const { data } = await sb
      .from('circulation_stops')
      .select(`
        id, route_id, sort_order, name, address, city, zip, notes,
        contact_name, contact_phone, contact_email,
        is_pickup, not_delivering, active, is_featured, is_advertiser,
        ad_level, logo_path, website, instagram, facebook, tiktok,
        lat, lng, quantities
      `)
      .eq('market', dbKey)
      .eq('route_id', currentRoute.id)
      .order('sort_order')
      .order('name')
    stops = (data ?? []) as StopRow[]
  }

  // Header badges — active-stop count + total qty per publication.
  const activeStops = stops.filter(s => s.active && !s.not_delivering && !s.is_pickup)
  const pubTotals: Record<string, number>  = {}
  const pubBundles: Record<string, number> = {}
  for (const p of pubs) {
    let t = 0
    for (const s of activeStops) t += s.quantities?.[p.short_name] ?? 0
    pubTotals[p.id]  = t
    pubBundles[p.id] = bundles(t, bundleSize)
  }

  return (
    <RoutesStopsClient
      market={dbKey}
      pubs={pubs}
      routes={routes}
      currentRoute={currentRoute}
      stops={stops}
      activeStopsCount={activeStops.length}
      pubTotals={pubTotals}
      pubBundles={pubBundles}
    />
  )
}
