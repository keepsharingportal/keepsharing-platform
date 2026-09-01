// /admin/circulation/leftovers — where copies are going to waste.
//
// Answers the question you actually ask when planning a month: "which spots
// left copies last month, so I can adjust the drop quantities and routes?"
//
// It was answerable before, but only one route at a time. /circulation/progress
// shows a chosen month's stops in delivery order per route with leftovers noted
// on each, and /circulation/stops/[id] shows one stop's history. Neither ranks
// every stop against every other, so rebalancing meant opening each route in
// turn and holding the comparison in your head.
//
// Ranked by PERCENTAGE, not raw count, because that is what tells you to cut a
// drop: 4 left on a drop of 8 is a stop to halve, 4 left on a drop of 50 is
// noise. Raw counts are shown too, since those are what you subtract.
//
// Planned quantity comes from circulation_stops.quantities ({"rrp":25,
// "boom":25}) — the current standing order, not a snapshot of what the driver
// actually carried. So a stop reading over 100% means the standing order has
// drifted from reality. Surfaced rather than clamped, because that is a data
// fix worth making before the percentage means anything.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'

export const metadata = { title: 'Leftovers — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ month?: string }> }

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Previous YYYY-MM, for the "did this happen last month too" column. */
function prevMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const sumQty = (o: Record<string, number> | null | undefined): number =>
  o ? Object.values(o).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) : 0

const pubBreakdown = (o: Record<string, number> | null | undefined): string =>
  o ? Object.entries(o).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') : ''

interface Visit {
  stop_id: string
  delivery_id: string
  leftovers: number | null
  leftovers_json: Record<string, number> | null
  driver_note: string | null
}

export default async function LeftoversPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const month  = sp.month?.trim() || thisMonth()
  const prior  = prevMonth(month)

  const sb = createAdminClient()

  const [monthsRes, delsRes, stopsRes, routesRes] = await Promise.all([
    sb.from('circulation_deliveries').select('month'),
    sb.from('circulation_deliveries').select('id, month').in('month', [month, prior]),
    sb.from('circulation_stops').select('id, name, address, city, route_id, quantities, not_delivering'),
    sb.from('circulation_routes').select('id, name'),
  ])

  const months = [...new Set(((monthsRes.data ?? []) as { month: string }[]).map(m => m.month))]
    .sort().reverse().slice(0, 12)

  const dels = (delsRes.data ?? []) as { id: string; month: string }[]
  const monthDelIds = dels.filter(d => d.month === month).map(d => d.id)
  const priorDelIds = dels.filter(d => d.month === prior).map(d => d.id)

  let visits: Visit[] = []
  if (monthDelIds.length + priorDelIds.length > 0) {
    const { data } = await sb
      .from('circulation_delivery_stops')
      .select('stop_id, delivery_id, leftovers, leftovers_json, driver_note')
      .in('delivery_id', [...monthDelIds, ...priorDelIds])
    visits = (data ?? []) as Visit[]
  }

  const stops = (stopsRes.data ?? []) as Array<{
    id: string; name: string; address: string | null; city: string | null
    route_id: string | null; quantities: Record<string, number> | null; not_delivering: boolean | null
  }>
  const routes = (routesRes.data ?? []) as Array<{ id: string; name: string }>
  const stopById  = new Map(stops.map(s => [s.id, s]))
  const routeById = new Map(routes.map(r => [r.id, r.name]))

  const monthSet = new Set(monthDelIds)

  // Last month's leftovers per stop, so a repeat offender is obvious.
  const priorByStop = new Map<string, number>()
  for (const v of visits) {
    if (monthSet.has(v.delivery_id)) continue
    priorByStop.set(v.stop_id, (priorByStop.get(v.stop_id) ?? 0) + (v.leftovers ?? 0))
  }

  const rows = visits
    .filter(v => monthSet.has(v.delivery_id) && (v.leftovers ?? 0) > 0)
    .map(v => {
      const s       = stopById.get(v.stop_id)
      const planned = sumQty(s?.quantities)
      const left    = v.leftovers ?? 0
      return {
        stopId:        v.stop_id,
        name:          s?.name ?? '(unknown stop)',
        where:         [s?.address, s?.city].filter(Boolean).join(', '),
        route:         s?.route_id ? (routeById.get(s.route_id) ?? '—') : '—',
        planned,
        left,
        pct:           planned > 0 ? Math.round((left / planned) * 100) : null,
        pubs:          pubBreakdown(v.leftovers_json),
        note:          v.driver_note,
        priorLeft:     priorByStop.get(v.stop_id) ?? 0,
        notDelivering: !!s?.not_delivering,
      }
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.left - a.left)

  const totalLeft    = rows.reduce((a, r) => a + r.left, 0)
  const totalPlanned = rows.reduce((a, r) => a + r.planned, 0)
  const overSupplied = rows.filter(r => (r.pct ?? 0) >= 50).length
  const staleQty     = rows.filter(r => (r.pct ?? 0) > 100).length

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Leftovers</h1>
          <p className="text-sub text-sm">{region.name} · copies left behind, worst first</p>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <div className="flex gap-2 mb-4 items-center" style={{ flexWrap: 'wrap' }}>
          <span className="text-sub text-sm">Month:</span>
          {months.map(m => (
            <Link
              key={m}
              href={`/admin/circulation/leftovers?month=${m}`}
              className={m === month ? 'btn btn-blue btn-sm' : 'btn btn-ghost btn-sm'}
            >
              {m}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="alert alert-info">
            No leftovers recorded for {month}. Either every copy went out, or the deliveries for
            that month have not been submitted yet.
          </div>
        ) : (
          <>
            <div className="budget-grid mb-4">
              <div className="budget-card">
                <div className="text-sub text-sm">Stops with leftovers</div>
                <div className="text-2xl font-bold">{rows.length}</div>
              </div>
              <div className="budget-card">
                <div className="text-sub text-sm">Copies left behind</div>
                <div className="text-2xl font-bold">{totalLeft.toLocaleString()}</div>
                {totalPlanned > 0 && (
                  <div className="text-sub text-sm">
                    of {totalPlanned.toLocaleString()} dropped at these stops ({Math.round((totalLeft / totalPlanned) * 100)}%)
                  </div>
                )}
              </div>
              <div className="budget-card">
                <div className="text-sub text-sm">Half or more unused</div>
                <div className="text-2xl font-bold">{overSupplied}</div>
                <div className="text-sub text-sm">clearest candidates to cut</div>
              </div>
              <div className="budget-card">
                <div className="text-sub text-sm">Standing order looks stale</div>
                <div className="text-2xl font-bold">{staleQty}</div>
                <div className="text-sub text-sm">more back than we record dropping</div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stop</th>
                    <th>Route</th>
                    <th style={{ textAlign: 'right' }}>Dropped</th>
                    <th style={{ textAlign: 'right' }}>Left</th>
                    <th style={{ textAlign: 'right' }}>Unused</th>
                    <th style={{ textAlign: 'right' }}>Suggest</th>
                    <th style={{ textAlign: 'right' }}>{prior}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    // Halve the surplus rather than cutting all of it. One month
                    // is a signal, not proof, and a stop that runs out is a
                    // worse outcome than one with a few spare.
                    const suggested = r.planned > 0 ? Math.max(1, r.planned - Math.floor(r.left / 2)) : null
                    return (
                      <tr key={r.stopId}>
                        <td>
                          <Link href={`/admin/circulation/stops/${r.stopId}`} className="font-semibold">
                            {r.name}
                          </Link>
                          {r.where && <div className="text-sub text-sm">{r.where}</div>}
                          {r.pubs  && <div className="text-sub text-sm mono">{r.pubs}</div>}
                          {r.note  && <div className="text-sub text-sm">{r.note}</div>}
                          {r.notDelivering && <span className="badge badge-warning">not delivering</span>}
                        </td>
                        <td className="text-sub text-sm">{r.route}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{r.planned || '—'}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{r.left}</td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {r.pct === null ? '—' : (
                            <span className={r.pct > 100 ? 'badge badge-danger' : r.pct >= 50 ? 'badge badge-warning' : ''}>
                              {r.pct}%
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono">
                          {suggested !== null && suggested < r.planned ? suggested : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} className="mono text-sub">
                          {r.priorLeft > 0 ? r.priorLeft : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sub text-sm mt-3">
              Unused % is leftovers against the standing order on the stop record. Over 100% means
              more came back than we record dropping, so that quantity needs correcting before the
              percentage means anything. The {prior} column is the same stop last month — two months
              running is a pattern, one is a bad week.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
