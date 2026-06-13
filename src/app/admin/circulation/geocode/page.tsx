// /admin/circulation/geocode — batch geocode every active stop.
//
// Verbatim port of admin/geocode.php from the v3_FINAL portal source.
// Progress bar at the top + live log + filterable stop table. Driver
// pin accuracy now backed by Google Geocoding (auto fallback to OSM
// Nominatim if GOOGLE_MAPS_API_KEY is missing).

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { GeocodeClient } from './GeocodeClient'

export const metadata = { title: 'Geocode Stops — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface StopRow {
  id:        string
  name:      string
  address:   string | null
  city:      string | null
  zip:       string | null
  lat:       number | null
  lng:       number | null
  route_id:  string
}

export default async function GeocodePage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  const [stopsRes, routesRes] = await Promise.all([
    sb.from('circulation_stops')
      .select('id, name, address, city, zip, lat, lng, route_id, route:circulation_routes(name, sort_order)')
      .eq('market', dbKey)
      .eq('active', true)
      .eq('is_pickup', false)
      .order('sort_order'),
    sb.from('circulation_routes')
      .select('id, name, sort_order')
      .eq('market', dbKey)
      .order('sort_order'),
  ])
  type StopWithRoute = StopRow & { route: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null }
  const stopsRaw = (stopsRes.data ?? []) as unknown as StopWithRoute[]
  const routeOrder = new Map<string, number>()
  for (const r of (routesRes.data ?? []) as Array<{ id: string; sort_order: number }>) {
    routeOrder.set(r.id, r.sort_order)
  }

  const stops = stopsRaw
    .map(s => ({
      id:         s.id,
      name:       s.name,
      address:    s.address,
      city:       s.city,
      zip:        s.zip,
      lat:        s.lat,
      lng:        s.lng,
      route_id:   s.route_id,
      route_name: Array.isArray(s.route) ? s.route[0]?.name ?? '' : s.route?.name ?? '',
    }))
    .sort((a, b) => {
      const ra = routeOrder.get(a.route_id) ?? 999
      const rb = routeOrder.get(b.route_id) ?? 999
      return ra - rb || a.name.localeCompare(b.name)
    })

  return (
    <GeocodeClient market={dbKey} stops={stops} />
  )
}
