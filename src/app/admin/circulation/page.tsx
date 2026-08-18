// /admin/circulation — Distribution Portal dashboard.
//
// Verbatim port of the legacy PHP dashboard (admin/index.php from
// _incoming/RRP_Portal_v3_FINAL/rrp_portal_v2). Uses the .portal-app
// scoped class set in globals.css so .data-table / .budget-grid /
// .budget-card / .stat-card / .card / .btn / .badge etc. all render
// identically to the source.
//
// Layout (top to bottom):
//   1. Page header — title + month label + "Preview driver view" button
//   2. Optional pending-action alert strip
//   3. 5-stat strip — Routes / Stops / Drivers / Changes / Invoices
//   4. Per-publication budget bars (color-coded ok/warn/over)
//   5. Two-column grid — Routes table + Recent invoices table

import Link from 'next/link'
import { Eye } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { CirculationImporter } from './CirculationImporter'

export const metadata = { title: 'Dashboard — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PubRow      { id: string; short_name: string; name: string; abbrev: string; color_hex: string; print_total: number; holdback: number; sort_order: number }
interface RouteRow    { id: string; name: string; active: boolean }
interface StopRow     { id: string; route_id: string; quantities: Record<string, number> | null; active: boolean; is_pickup?: boolean | null; not_delivering?: boolean | null }
interface DriverRow   { user_id: string; active: boolean }
interface DeliveryRow { id: string; month: string; driver_id: string; route_id: string; stops_completed: number | null; pay_calculated: number | null; status: string; submitted_at: string | null; driver_name?: string; route_name?: string }

// pay values are stored as DOLLARS (NUMERIC), not cents.
function fmtMoney(dollars: number | null): string {
  return (dollars ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function bundles(used: number): string {
  // Source convention: "X bundles out" — 50 magazines per bundle.
  const b = Math.round(used / 50)
  return `${b} bundle${b === 1 ? '' : 's'}`
}

export default async function CirculationDashboard() {
  const ctx     = await requireAdmin()
  const market  = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region  = regionForMarket(market)
  const dbKey   = region.slug
  const sb      = createAdminClient()

  let pubs:     PubRow[]     = []
  let routes:   RouteRow[]   = []
  let stops:    StopRow[]    = []
  let drivers:  DriverRow[]  = []
  let recentDel: DeliveryRow[] = []
  let tableMissing = false

  let pendingChanges  = 0
  let pendingRequests = 0
  let pendingInvoices = 0

  // Low performers: stops with the highest cumulative leftover copies
  // across the last 90 days of submitted/paid deliveries. Waste % =
  // leftovers / total copies dropped. Anything > 20% is worth reviewing.
  let lowPerformers: Array<{
    stop_id:   string
    stop_name: string
    address:   string | null
    route_name: string
    dropped:   number       // total copies expected to be delivered
    leftover:  number       // total returned unused
    wastePct:  number       // 0-100
  }> = []

  try {
    const [pubsRes, routesRes, stopsRes, driversRes, cReqRes, lReqRes, invRes, delRes] = await Promise.all([
      sb.from('circulation_publications').select('id, short_name, name, abbrev, color_hex, print_total, holdback, sort_order').order('sort_order'),
      sb.from('circulation_routes').select('id, name, active').eq('market', dbKey).order('name'),
      sb.from('circulation_stops').select('id, route_id, quantities, active, is_pickup, not_delivering').eq('market', dbKey),
      sb.from('circulation_drivers').select('user_id, active').eq('market', dbKey),
      sb.from('circulation_change_requests').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'pending'),
      sb.from('circulation_location_requests').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'pending'),
      sb.from('circulation_deliveries').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('status', 'submitted'),
      sb.from('circulation_deliveries')
        .select('id, month, driver_id, route_id, stops_completed, pay_calculated, status, submitted_at, circulation_routes(name)')
        .eq('market', dbKey)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .limit(5),
    ])
    if (pubsRes.error && /relation .* does not exist/i.test(pubsRes.error.message)) tableMissing = true
    pubs    = (pubsRes.data ?? [])    as PubRow[]
    routes  = ((routesRes.data ?? []) as RouteRow[]).filter(r => r.active)
    stops   = (stopsRes.data ?? [])   as StopRow[]
    drivers = (driversRes.data ?? []) as DriverRow[]
    pendingChanges  = cReqRes.count ?? 0
    pendingRequests = lReqRes.count ?? 0
    pendingInvoices = invRes.count  ?? 0

    type DelJoin = DeliveryRow & { circulation_routes?: { name?: string } | null }
    const rows = (delRes.data ?? []) as unknown as DelJoin[]
    // Pull driver names in a second cheap roundtrip (the join makes the
    // initial select brittle if circulation_drivers schema shifts).
    const driverIds = Array.from(new Set(rows.map(r => r.driver_id))).filter(Boolean)
    let driverNameMap = new Map<string, string>()
    if (driverIds.length > 0) {
      const { data: dnRows } = await sb.from('circulation_drivers')
        .select('user_id, full_name')
        .in('user_id', driverIds)
      for (const d of (dnRows ?? []) as Array<{ user_id: string; full_name: string | null }>) {
        if (d.full_name) driverNameMap.set(d.user_id, d.full_name)
      }
    }
    recentDel = rows.map(r => ({
      ...r,
      driver_name: driverNameMap.get(r.driver_id) ?? '(driver)',
      route_name:  r.circulation_routes?.name ?? '(route)',
    }))

    // Low performers — leftovers rolled up per stop over the past
    // ~90 days. We use a rough date filter (last 3 month strings) then
    // aggregate client-side in JS so we don't need a Postgres function.
    const monthCodes: string[] = []
    const now = new Date()
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthCodes.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    const { data: recentDelsForLP } = await sb
      .from('circulation_deliveries')
      .select('id')
      .eq('market', dbKey)
      .in('month', monthCodes)
      .in('status', ['submitted', 'paid'])
    const delIds = ((recentDelsForLP ?? []) as Array<{ id: string }>).map(r => r.id)
    if (delIds.length > 0) {
      const { data: lpStops } = await sb
        .from('circulation_delivery_stops')
        .select('stop_id, leftovers, circulation_stops(id, name, address, route_id)')
        .in('delivery_id', delIds)
        .gt('leftovers', 0)
      type LPRow = { stop_id: string; leftovers: number; circulation_stops?: { id: string; name: string; address: string | null; route_id: string } | { id: string; name: string; address: string | null; route_id: string }[] | null }
      const agg = new Map<string, { name: string; address: string | null; route_id: string; leftover: number; dropped: number }>()
      for (const row of ((lpStops ?? []) as unknown as LPRow[])) {
        const s = Array.isArray(row.circulation_stops) ? row.circulation_stops[0] : row.circulation_stops
        if (!s) continue
        const cur = agg.get(s.id) ?? { name: s.name, address: s.address, route_id: s.route_id, leftover: 0, dropped: 0 }
        cur.leftover += row.leftovers ?? 0
        agg.set(s.id, cur)
      }
      // Compute total dropped per stop across all its quantities × number of runs.
      const dropByStop = new Map<string, number>()
      for (const s of stops) {
        if (!s.active || s.is_pickup || s.not_delivering) continue
        const totalQty = Object.values(s.quantities ?? {}).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0)
        dropByStop.set(s.id, totalQty)
      }
      const routeNameById = new Map(routes.map(r => [r.id, r.name]))
      lowPerformers = Array.from(agg.entries()).map(([stopId, v]) => {
        const dropPerRun = dropByStop.get(stopId) ?? 0
        const dropped = dropPerRun * monthCodes.length
        const wastePct = dropped > 0 ? Math.round((v.leftover / dropped) * 100) : 100
        return {
          stop_id:    stopId,
          stop_name:  v.name,
          address:    v.address,
          route_name: routeNameById.get(v.route_id) ?? '(route)',
          dropped,
          leftover:   v.leftover,
          wastePct,
        }
      })
      .sort((a, b) => (b.wastePct - a.wastePct) || (b.leftover - a.leftover))
      .slice(0, 8)
    }
  } catch { tableMissing = true }

  // ── Aggregations matching admin/index.php ──────────────────────────────
  const activeStops = stops.filter(s => s.active && !s.is_pickup && !s.not_delivering)
  const totalStops  = stops.filter(s => s.active && !s.is_pickup).length
  const stopsByRoute = new Map<string, number>()
  for (const s of activeStops) stopsByRoute.set(s.route_id, (stopsByRoute.get(s.route_id) ?? 0) + 1)

  // qty_map[route_id][pub_short] = sum of qtys for that pub on that route
  const qtyMap = new Map<string, Map<string, number>>()
  for (const s of activeStops) {
    const m = qtyMap.get(s.route_id) ?? new Map<string, number>()
    for (const [pub, qty] of Object.entries(s.quantities ?? {})) {
      m.set(pub, (m.get(pub) ?? 0) + (typeof qty === 'number' ? qty : 0))
    }
    qtyMap.set(s.route_id, m)
  }

  // Per-publication totals matching the source's pub_totals struct.
  const pubTotals = new Map<string, { used: number; avail: number; remain: number; pct: number; status: 'ok' | 'warn' | 'over' }>()
  for (const p of pubs) {
    let used = 0
    for (const r of routes) used += qtyMap.get(r.id)?.get(p.short_name) ?? 0
    const avail  = p.print_total - p.holdback
    const remain = avail - used
    const pct    = avail > 0 ? Math.round((used / avail) * 1000) / 10 : 0
    const status: 'ok' | 'warn' | 'over' = remain < 0 ? 'over' : (pct >= 95 ? 'warn' : 'ok')
    pubTotals.set(p.id, { used, avail, remain, pct, status })
  }

  const driverCount = drivers.filter(d => d.active).length
  const today       = new Date()
  const monthLabel  = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      {/* ── Page header (matches layout.php page_header) ── */}
      <div className="page-header">
        <div>
          <h1 className="ph-title">Dashboard</h1>
        </div>
        <div className="ph-actions">
          <span className="text-muted mono">{monthLabel}</span>
          <Link
            href={`/admin/go/distribution/${dbKey}/driver`}
            target="_blank"
            className="btn btn-ghost btn-sm"
          >
            <Eye size={14} /> Preview driver view
          </Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {tableMissing && (
          <div className="alert alert-warning">
            <strong>Migration 116 not applied.</strong> Run <code>supabase/migrations/116_circulation_phase_c.sql</code> to set up the distribution tables.
          </div>
        )}

        {/* ── Pending-action alert ── */}
        {(pendingChanges > 0 || pendingRequests > 0) && (
          <div className="alert alert-warning flex items-center justify-between">
            <span>
              {pendingChanges > 0 && (
                <>⚠ <strong>{pendingChanges}</strong> pending change request{pendingChanges > 1 ? 's' : ''}</>
              )}
              {pendingChanges > 0 && pendingRequests > 0 && <> &nbsp;·&nbsp; </>}
              {pendingRequests > 0 && (
                <><strong>{pendingRequests}</strong> new location request{pendingRequests > 1 ? 's' : ''}</>
              )}
            </span>
            <Link href="/admin/circulation/changes" className="btn btn-amber btn-sm">Review →</Link>
          </div>
        )}

        {/* ── 5-stat strip ── */}
        <div className="stats-row">
          {[
            { label: 'Routes',   value: routes.length,   cls: '' },
            { label: 'Stops',    value: totalStops,      cls: '' },
            { label: 'Drivers',  value: driverCount,     cls: '' },
            { label: 'Changes',  value: pendingChanges,  cls: pendingChanges  > 0 ? 'has-red'   : '' },
            { label: 'Invoices', value: pendingInvoices, cls: pendingInvoices > 0 ? 'has-amber' : '' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className={`stat-num ${s.cls}`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Budget bars per publication ── */}
        {pubs.length > 0 && (
          <div className="budget-grid">
            {pubs.map(p => {
              const t = pubTotals.get(p.id)!
              const barCls = t.status === 'over' ? 'bar-over'
                : t.status === 'warn' ? 'bar-warn'
                : `bar-${p.short_name.toLowerCase()}`
              return (
                <div key={p.id} className={`budget-card ${t.status}`}>
                  <div className="budget-pub" style={{ color: p.color_hex }}>{p.name}</div>
                  <div className="bar-track" style={{ marginTop: 8 }}>
                    <div className={`bar-fill ${barCls}`} style={{ width: `${Math.min(t.pct, 100)}%` }} />
                  </div>
                  <div className="budget-nums">
                    <span><strong className="mono">{t.used.toLocaleString()}</strong> / {t.avail.toLocaleString()} available</span>
                    <span className={`budget-remain ${t.status}`}>
                      {t.remain >= 0 ? '+' : ''}{t.remain.toLocaleString()} remaining ({t.pct}%)
                    </span>
                  </div>
                  <div className="budget-note">{bundles(t.used)} out · {p.holdback.toLocaleString()} held back</div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Routes + Recent invoices two-column grid ── */}
        <div className="grid-2">

          {/* Routes table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Routes</span>
              <Link href="/admin/circulation/routes" className="btn btn-ghost btn-sm">Manage →</Link>
            </div>
            {routes.length === 0 ? (
              <p className="text-muted text-sm">No routes yet. Import or add manually.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Stops</th>
                    {pubs.map(p => <th key={p.id} style={{ textAlign: 'center' }}>{p.abbrev}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {routes.map(r => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/circulation/routes?id=${r.id}`}>{r.name}</Link>
                      </td>
                      <td className="mono">{stopsByRoute.get(r.id) ?? 0}</td>
                      {pubs.map(p => {
                        const q = qtyMap.get(r.id)?.get(p.short_name) ?? 0
                        const short = p.short_name.toLowerCase()
                        // 'rrp' badge for RRP, else the 'boom'-style amber badge.
                        const badgeCls = short === 'rrp' ? 'badge-rrp' : 'badge-boom'
                        return (
                          <td key={p.id} className={`qty-cell qty-${short}`}>
                            <span className={`badge ${badgeCls}`}>{q}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent invoices */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent invoices</span>
              <Link href="/admin/circulation/deliveries" className="btn btn-ghost btn-sm">All →</Link>
            </div>
            {recentDel.length === 0 ? (
              <p className="text-muted text-sm">No invoices yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Month</th>
                    <th>Stops</th>
                    <th>Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDel.map(d => {
                    const bc = d.status === 'submitted' ? 'badge-amber'
                      : d.status === 'paid' ? 'badge-green' : 'badge-gray'
                    return (
                      <tr key={d.id}>
                        <td>{d.driver_name}</td>
                        <td className="text-sub text-sm">{d.route_name}</td>
                        <td className="mono text-sm">{d.month}</td>
                        <td className="mono">{d.stops_completed ?? 0}</td>
                        <td className="mono fw-700">{fmtMoney(d.pay_calculated)}</td>
                        <td><span className={`badge ${bc}`}>{d.status[0].toUpperCase() + d.status.slice(1)}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Low performers — stops with the highest leftover % over
             the last 3 months. Directly maps to the v3 admin/index.php
             "Low Performers" widget. Actionable: if a stop keeps
             returning half its drop, cut the qty or pause it. ── */}
        {lowPerformers.length > 0 && (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-header">
              <span className="card-title">Low performers — high leftover stops</span>
              <span className="text-muted text-sm">Last 3 months</span>
            </div>
            <p className="text-sub text-sm" style={{ marginBottom: 12 }}>
              Stops that keep returning unused copies. Cut the qty or pause them so budget goes to routes that move.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stop</th>
                  <th>Route</th>
                  <th style={{ textAlign: 'right' }}>Dropped</th>
                  <th style={{ textAlign: 'right' }}>Leftover</th>
                  <th style={{ textAlign: 'right' }}>Waste %</th>
                </tr>
              </thead>
              <tbody>
                {lowPerformers.map(lp => {
                  const sev = lp.wastePct >= 50 ? 'badge-red' : lp.wastePct >= 25 ? 'badge-amber' : 'badge-gray'
                  return (
                    <tr key={lp.stop_id} style={{ cursor: 'pointer' }}>
                      <td>
                        <Link href={`/admin/circulation/stops/${lp.stop_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-portal-blue)' }}>{lp.stop_name}</div>
                          {lp.address && <div className="text-sub text-xs">{lp.address}</div>}
                        </Link>
                      </td>
                      <td className="text-sub text-sm">{lp.route_name}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{lp.dropped.toLocaleString()}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{lp.leftover.toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${sev}`}>{lp.wastePct}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Importer (kept from prior build — needed for migration from
             the legacy PHP portal). Hidden when there's existing data. ── */}
        {routes.length === 0 && stops.length === 0 && (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="card-header">
              <span className="card-title">Import from PHP portal</span>
            </div>
            <CirculationImporter market={dbKey} regionName={region.name} pubLabels={region.publications.join(' + ').toUpperCase()} />
          </div>
        )}

      </div>
    </div>
  )
}
