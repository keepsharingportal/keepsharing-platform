// /admin/circulation/map — internal admin view of every stop on a single
// Leaflet map, color-coded by route, with filter chips and search. Same
// component the public-facing map uses.

import Link from 'next/link'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CirculationMapClient } from './CirculationMapClient'
import type { CirculationStop } from '@/components/circulation/CirculationMap'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'

export const metadata = { title: 'Map — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function CirculationMapPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let stops: CirculationStop[] = []
  let routes: Array<{ id: string; name: string }> = []
  try {
    const [rRes, sRes] = await Promise.all([
      sb.from('circulation_routes').select('id, name').eq('market', dbKey).eq('active', true).order('sort_order').order('name'),
      sb.from('circulation_stops')
        .select('id, route_id, name, address, city, zip, lat, lng, is_advertiser, is_featured, ad_level, website, instagram, facebook, tiktok, logo_path, quantities')
        .eq('market', dbKey)
        .eq('active', true),
    ])
    routes = (rRes.data ?? []) as Array<{ id: string; name: string }>
    stops  = (sRes.data ?? []) as unknown as CirculationStop[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1400px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <MapIcon size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Map</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            All active stops in <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}. Click a marker for details.
          </p>
        </div>

        <CirculationMapClient stops={stops} routes={routes} />
      </div>
    </div>
  )
}
