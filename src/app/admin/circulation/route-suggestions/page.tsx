// /admin/circulation/route-suggestions — list of driver-submitted route
// order suggestions. Pending requests show at the top with a count
// badge; reviewed history below for accountability.
//
// Ports the index part of admin/route_suggestion.php in v3_FINAL: a
// pending queue is critical because drivers' second submission of the
// same idea (when they think the first one got lost) creates duplicate
// work in admin.

import Link from 'next/link'
import { ArrowLeft, GitPullRequest, ChevronRight } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'

export const metadata = { title: 'Route Suggestions — Distribution' }
export const dynamic  = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-portal-amber-lt text-portal-amber',
  approved: 'bg-portal-green-lt text-portal-green',
  rejected: 'bg-portal-row-hover text-portal-sub',
}

interface PageProps { searchParams: Promise<{ status?: string }> }

export default async function RouteSuggestionsListPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const filter = sp.status?.trim() ?? 'pending'
  const sb     = createAdminClient()

  // Pull routes for this market first so we can filter suggestions to
  // just this market (suggestions table has no market column).
  const { data: routes } = await sb
    .from('circulation_routes')
    .select('id')
    .eq('market', dbKey)
  const routeIds = ((routes ?? []) as Array<{ id: string }>).map(r => r.id)

  let rows: Array<{
    id: string; route_id: string; driver_id: string; status: string;
    note: string | null; created_at: string;
    route_name: string; driver_name: string;
  }> = []

  if (routeIds.length > 0) {
    let q = sb
      .from('circulation_route_suggestions')
      .select(`
        id, route_id, driver_id, status, note, created_at,
        circulation_routes(name),
        circulation_drivers(full_name)
      `)
      .in('route_id', routeIds)
      .order('created_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    type Joined = {
      id: string; route_id: string; driver_id: string; status: string;
      note: string | null; created_at: string;
      circulation_routes?: { name?: string } | { name?: string }[] | null
      circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null
    }
    rows = ((data ?? []) as unknown as Joined[]).map(s => {
      const r = Array.isArray(s.circulation_routes)  ? s.circulation_routes[0]  : s.circulation_routes
      const d = Array.isArray(s.circulation_drivers) ? s.circulation_drivers[0] : s.circulation_drivers
      return {
        id:           s.id,
        route_id:     s.route_id,
        driver_id:    s.driver_id,
        status:       s.status,
        note:         s.note,
        created_at:   s.created_at,
        route_name:   r?.name      ?? '—',
        driver_name:  d?.full_name ?? '—',
      }
    })
  }

  // Pending count — drives the sidebar badge so admins know when work piles up.
  const pendingCount = filter === 'pending'
    ? rows.length
    : routeIds.length === 0 ? 0 : (
        (await sb
          .from('circulation_route_suggestions')
          .select('id', { count: 'exact', head: true })
          .in('route_id', routeIds)
          .eq('status', 'pending')).count ?? 0
      )

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Portal
          </Link>
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Route Suggestions</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Drivers can suggest a new stop order from the driver portal. Pending
            requests show here so they don&apos;t pile up unanswered.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
            <Link
              key={s}
              href={`/admin/circulation/route-suggestions?status=${s}`}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${filter === s ? 'bg-portal-navy text-white border-portal-blue' : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 inline-block rounded-full bg-portal-amber text-white text-[10px] px-1.5">{pendingCount}</span>
              )}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
            <p className="text-sm text-portal-sub">No {filter} suggestions.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map(r => (
              <li key={r.id}>
                <Link
                  href={`/admin/circulation/route-suggestions/${r.id}`}
                  className="w-full block rounded-lg border border-portal-border bg-white p-3 hover:border-portal-border-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-portal-text truncate">
                        {r.driver_name} — {r.route_name}
                      </p>
                      {r.note && (
                        <p className="text-[11px] text-portal-sub mt-0.5 truncate italic">
                          “{r.note}”
                        </p>
                      )}
                      <p className="text-[10px] text-portal-muted mt-1">
                        Submitted {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-portal-row-hover text-portal-sub'}`}>
                        {r.status}
                      </span>
                      <ChevronRight size={14} className="text-portal-border-2" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
