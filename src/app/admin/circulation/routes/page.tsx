// /admin/circulation/routes — list every route with stop count, drag a
// new route into existence inline. Drill into a single route to manage
// its stops.

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Plus, Truck, Download, GripVertical } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { NewRouteForm } from './NewRouteForm'

export const metadata = { title: 'Routes — Distribution' }
export const dynamic  = 'force-dynamic'

interface RouteRow { id: string; name: string; city: string | null; active: boolean; sort_order: number }
interface StopCount { route_id: string }

export default async function RoutesPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let routes: RouteRow[] = []
  let counts: Map<string, number> = new Map()

  try {
    const [rRes, sRes] = await Promise.all([
      sb.from('circulation_routes')
        .select('id, name, city, active, sort_order')
        .eq('market', dbKey)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      sb.from('circulation_stops').select('route_id').eq('market', dbKey).eq('active', true),
    ])
    routes = (rRes.data ?? []) as RouteRow[]
    const stops = (sRes.data ?? []) as StopCount[]
    for (const s of stops) counts.set(s.route_id, (counts.get(s.route_id) ?? 0) + 1)
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Routes</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <a
              href={`/api/admin/circulation/export?market=${dbKey}&format=csv`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download size={11} /> Export CSV
            </a>
            <a
              href={`/api/admin/circulation/export?market=${dbKey}&format=json`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Download size={11} /> Export JSON
            </a>
          </div>
        </div>

        <NewRouteForm market={dbKey} />

        <section>
          <AdminSectionHeader title="All routes" count={routes.length} />
          {routes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
              <p className="text-sm text-gray-500">No routes yet. Add one above or import from the PHP portal.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {routes.map(r => (
                <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3 hover:border-portal-border-2 transition-colors">
                  <Link href={`/admin/circulation/routes/${r.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                      {r.name}
                      {!r.active && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">Inactive</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {counts.get(r.id) ?? 0} stops {r.city ? ` · ${r.city}` : ''}
                    </p>
                  </Link>
                  <Link
                    href={`/admin/circulation/routes/${r.id}/reorder`}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <GripVertical size={11} /> Reorder
                  </Link>
                  <Link href={`/admin/circulation/routes/${r.id}`} className="shrink-0 text-gray-300 hover:text-gray-500">
                    <ArrowRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
