// /admin/circulation/import — Import & Export Stops.
//
// Verbatim port of admin/import.php from the v3_FINAL portal source.
// Two-column grid (Export | Import) on top, per-route summary table
// below. Per the source semantics, Import is an UPSERT not a wipe — the
// existing Next.js endpoint matches by (market, route_id, sort_order,
// name) so re-uploading updates without duplicating.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { ImportExportClient } from './ImportExportClient'

export const metadata = { title: 'Import & Export Stops — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PubRow   { id: string; short_name: string; abbrev: string; color_hex: string; sort_order: number }
interface RouteRow { id: string; name: string; active: boolean; sort_order: number }
interface StopAgg  { route_id: string; lat: number | null; quantities: Record<string, number> | null; is_pickup: boolean; active: boolean }

export default async function ImportExportPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let pubs:   PubRow[]   = []
  let routes: RouteRow[] = []
  let stops:  StopAgg[]  = []

  try {
    const [pubsRes, routesRes, stopsRes] = await Promise.all([
      sb.from('circulation_publications').select('id, short_name, abbrev, color_hex, sort_order').order('sort_order'),
      sb.from('circulation_routes')
        .select('id, name, active, sort_order')
        .eq('market', dbKey)
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      sb.from('circulation_stops')
        .select('route_id, lat, quantities, is_pickup, active')
        .eq('market', dbKey)
        .eq('active', true)
        .eq('is_pickup', false),
    ])
    pubs   = (pubsRes.data ?? [])   as PubRow[]
    routes = (routesRes.data ?? []) as RouteRow[]
    stops  = (stopsRes.data ?? [])  as StopAgg[]
  } catch { /* tables missing */ }

  // Per-route aggregates for the summary table.
  const countByRoute    = new Map<string, number>()
  const geoByRoute      = new Map<string, number>()
  const pubTotalsByRoute = new Map<string, Map<string, number>>()
  for (const s of stops) {
    countByRoute.set(s.route_id, (countByRoute.get(s.route_id) ?? 0) + 1)
    if (s.lat != null) geoByRoute.set(s.route_id, (geoByRoute.get(s.route_id) ?? 0) + 1)
    const m = pubTotalsByRoute.get(s.route_id) ?? new Map<string, number>()
    for (const [pub, qty] of Object.entries(s.quantities ?? {})) {
      m.set(pub, (m.get(pub) ?? 0) + (typeof qty === 'number' ? qty : 0))
    }
    pubTotalsByRoute.set(s.route_id, m)
  }

  const totalStops = stops.length
  const totalGeocoded = stops.filter(s => s.lat != null).length

  const routesSummary = routes.map(r => ({
    id:        r.id,
    name:      r.name,
    stopCount: countByRoute.get(r.id) ?? 0,
    geocoded:  geoByRoute.get(r.id) ?? 0,
    perPub:    Object.fromEntries(pubTotalsByRoute.get(r.id) ?? new Map<string, number>()),
  }))

  return (
    <ImportExportClient
      market={dbKey}
      pubs={pubs}
      routes={routes.map(r => ({ id: r.id, name: r.name }))}
      routesSummary={routesSummary}
      totalStops={totalStops}
      totalGeocoded={totalGeocoded}
    />
  )
}
