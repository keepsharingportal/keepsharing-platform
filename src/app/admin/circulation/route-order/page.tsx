// /admin/circulation/route-order — lists every route + jumps into its
// drag-drop reorder page. Mirrors the PHP portal's "Route Order" menu
// entry (which was a route picker leading to per-route ordering).

import Link from 'next/link'
import { ArrowLeft, GripVertical, ChevronRight, Clock } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'

export const metadata = { title: 'Route Order — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function RouteOrderPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  interface RouteRow { id: string; name: string; city: string | null }
  interface SuggCount { route_id: string }
  let routes: RouteRow[] = []
  let stopCounts: Map<string, number> = new Map()
  let pendingByRoute: Map<string, number> = new Map()

  try {
    const [rRes, sRes, suggRes] = await Promise.all([
      sb.from('circulation_routes')
        .select('id, name, city')
        .eq('market', dbKey)
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      sb.from('circulation_stops')
        .select('route_id')
        .eq('market', dbKey)
        .eq('active', true),
      sb.from('circulation_route_suggestions')
        .select('route_id')
        .eq('status', 'pending'),
    ])
    routes = (rRes.data ?? []) as RouteRow[]
    for (const s of (sRes.data ?? []) as SuggCount[]) {
      stopCounts.set(s.route_id, (stopCounts.get(s.route_id) ?? 0) + 1)
    }
    for (const s of (suggRes.data ?? []) as SuggCount[]) {
      pendingByRoute.set(s.route_id, (pendingByRoute.get(s.route_id) ?? 0) + 1)
    }
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Portal
          </Link>
          <div className="flex items-center gap-2">
            <GripVertical size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Route Order</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Pick a route to drag-drop reorder its stops. Saving creates a snapshot you can restore.</p>
        </div>

        {routes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
            <p className="text-sm text-gray-500">No active routes in this region yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {routes.map(r => {
              const pending = pendingByRoute.get(r.id) ?? 0
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/circulation/routes/${r.id}/reorder`}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-portal-border-2 transition-colors"
                  >
                    <GripVertical size={14} className="text-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {stopCounts.get(r.id) ?? 0} stops{r.city ? ` · ${r.city}` : ''}
                      </p>
                    </div>
                    {pending > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-portal-amber-lt text-portal-amber text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={10} /> {pending} driver suggestion{pending === 1 ? '' : 's'}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
