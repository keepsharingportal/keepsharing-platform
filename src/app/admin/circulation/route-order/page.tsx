// /admin/circulation/route-order — drag-to-reorder a route's stops.
//
// Verbatim port of admin/order.php from the v3_FINAL portal source. The
// publisher's production version (per screenshot) extended the original
// snapshot/version-history right column into a live route map with
// numbered pins, with version history surfaced behind a top-right
// button. Match the screenshot.
//
// Layout:
//   - Page header: "Route Order" title + Version history button
//   - Route tab strip (?route=X)
//   - Two-column grid:
//       LEFT  card: "Drag to reorder · or type a position number" with
//                   draggable stop list + position inputs + Save button.
//                   Publications Plus is always first and cannot be moved.
//       RIGHT card: "Route map" with numbered red pins (Leaflet).
//   - Version history opens a modal listing prior snapshots with Restore.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { RouteOrderClient } from './RouteOrderClient'

export const metadata = { title: 'Route Order — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ route?: string }> }

interface RouteLite { id: string; name: string }
interface StopLite  {
  id: string; sort_order: number; name: string;
  address: string | null; city: string | null;
  is_pickup: boolean; not_delivering: boolean;
  lat: number | null; lng: number | null;
}
interface SnapshotLite { id: string; label: string | null; created_at: string }

export default async function RouteOrderPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  const { data: routesData } = await sb
    .from('circulation_routes')
    .select('id, name')
    .eq('market', dbKey)
    .eq('active', true)
    .order('sort_order')
    .order('name')
  const routes: RouteLite[] = (routesData ?? []) as RouteLite[]

  const requestedId = sp.route?.trim()
  const currentRoute = requestedId
    ? routes.find(r => r.id === requestedId) ?? routes[0] ?? null
    : routes[0] ?? null

  let stops: StopLite[]         = []
  let snapshots: SnapshotLite[] = []

  if (currentRoute) {
    const [stopsRes, snapsRes] = await Promise.all([
      sb.from('circulation_stops')
        .select('id, sort_order, name, address, city, is_pickup, not_delivering, lat, lng')
        .eq('market', dbKey)
        .eq('route_id', currentRoute.id)
        .eq('active', true)
        .order('sort_order'),
      sb.from('circulation_route_snapshots')
        .select('id, label, created_at')
        .eq('route_id', currentRoute.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    stops     = (stopsRes.data ?? []) as StopLite[]
    snapshots = (snapsRes.data ?? []) as SnapshotLite[]
  }

  return (
    <RouteOrderClient
      routes={routes}
      currentRoute={currentRoute}
      stops={stops}
      snapshots={snapshots}
    />
  )
}
