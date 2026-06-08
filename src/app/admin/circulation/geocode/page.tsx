// /admin/circulation/geocode — OpenStreetMap (Nominatim) geocoder UI.

import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { GeocodeRunner } from './GeocodeRunner'

export const metadata = { title: 'Geocoding — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function GeocodePage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  type Stop = { id: string; name: string; address: string | null; city: string | null; zip: string | null }
  let missing: Stop[] = []
  let history: Array<{ id: string; started_at: string; finished_at: string | null; stops_total: number; stops_success: number; stops_failed: number }> = []
  let totalActive = 0
  try {
    const [missRes, totalRes, histRes] = await Promise.all([
      sb.from('circulation_stops')
        .select('id, name, address, city, zip')
        .eq('market', dbKey)
        .eq('active', true)
        .or('lat.is.null,lng.is.null')
        .order('sort_order'),
      sb.from('circulation_stops').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('active', true),
      sb.from('circulation_geocode_runs')
        .select('id, started_at, finished_at, stops_total, stops_success, stops_failed')
        .eq('market', dbKey)
        .order('started_at', { ascending: false })
        .limit(5),
    ])
    missing = (missRes.data ?? []) as Stop[]
    totalActive = totalRes.count ?? 0
    history = (histRes.data ?? []) as typeof history
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Geocoding</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Region: <span className="font-semibold text-portal-text">{region.name}</span>
            <span className="text-portal-muted"> · </span>{publicationLabelsForRegion(region)}
          </p>
          <p className="text-xs text-portal-muted mt-1">
            Uses OpenStreetMap&apos;s free Nominatim service. Rate-limited to ~1 request/second; 25 stops per batch.
          </p>
        </div>

        <GeocodeRunner
          market={dbKey}
          missing={missing}
          totalActive={totalActive}
          history={history}
        />
      </div>
    </div>
  )
}
