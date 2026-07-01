// /distribution/[market]/driver/dashboard — Driver "My Routes" landing.
//
// Port of driver/dashboard.php from the v3_FINAL portal source. Stats
// strip (stops + earnings + routes) + multi-route "Full Run" CTA when
// applicable + per-route cards with progress bar + action buttons,
// invoice history table on the right.

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { KeepSharingBrand } from '@/components/KeepSharingBrand'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ market: string }> }

interface RouteLite { id: string; name: string }
interface DelLite   { id: string; route_id: string; status: string; stops_completed: number | null; pay_calculated: number | null; pay_final: number | null; submitted_at: string | null }

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function DriverDashboardPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/distribution/${market}/driver`)

  const admin = createAdminClient()
  const { data: driverRow } = await admin
    .from('circulation_drivers')
    .select('user_id, full_name, rate_per_stop, active')
    .eq('user_id', user.id)
    .eq('market', market)
    .maybeSingle()

  if (!driverRow || !driverRow.active) {
    return (
      <div className="portal-app" style={{ maxWidth: 480, margin: '40px auto', padding: 20 }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p>You don&apos;t have driver access for {marketDisplayName(market)}.</p>
        </div>
      </div>
    )
  }

  const driver = driverRow as { user_id: string; full_name: string; rate_per_stop: number; active: boolean }
  const month = currentMonth()
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const firstName = (driver.full_name ?? '').split(' ')[0] || 'Driver'

  // Assigned routes
  const { data: assignsData } = await admin
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', driver.user_id)
  const routeIds = ((assignsData ?? []) as Array<{ route_id: string }>).map(a => a.route_id)

  let myRoutes: RouteLite[] = []
  if (routeIds.length > 0) {
    const { data: rData } = await admin
      .from('circulation_routes')
      .select('id, name, sort_order')
      .eq('market', market)
      .eq('active', true)
      .in('id', routeIds)
      .order('sort_order')
    myRoutes = ((rData ?? []) as Array<RouteLite & { sort_order: number }>).map(({ id, name }) => ({ id, name }))
  }

  // Deliveries for the month
  let dels: DelLite[] = []
  if (myRoutes.length > 0) {
    const { data: dData } = await admin
      .from('circulation_deliveries')
      .select('id, route_id, status, stops_completed, pay_calculated, pay_final, submitted_at')
      .eq('market', market)
      .eq('driver_id', driver.user_id)
      .eq('month', month)
    dels = (dData ?? []) as DelLite[]
  }

  // Total counts per route + stats
  type RouteStat = { delivery: DelLite | null; total: number; done: number; pct: number }
  const stats = new Map<string, RouteStat>()
  let totalDone = 0
  let totalPay  = 0

  if (myRoutes.length > 0) {
    const { data: stopsCount } = await admin
      .from('circulation_stops')
      .select('route_id')
      .eq('market', market)
      .eq('active', true)
      .eq('is_pickup', false)
      .eq('not_delivering', false)
      .in('route_id', myRoutes.map(r => r.id))
    const totalByRoute = new Map<string, number>()
    for (const s of (stopsCount ?? []) as Array<{ route_id: string }>) {
      totalByRoute.set(s.route_id, (totalByRoute.get(s.route_id) ?? 0) + 1)
    }

    // For DRAFT deliveries, stops_completed is 0 — the real count lives on
    // circulation_delivery_stops.checked. Pull the per-stop check-off
    // state for every delivery and count eligible+checked here so the
    // dashboard reflects mid-run progress.
    const delIds = dels.map(d => d.id)
    const liveDoneByDelivery = new Map<string, number>()
    if (delIds.length > 0) {
      const { data: dsRows } = await admin
        .from('circulation_delivery_stops')
        .select('delivery_id, checked, circulation_stops!inner(is_pickup, not_delivering)')
        .in('delivery_id', delIds)
      type DSRow = { delivery_id: string; checked: boolean; circulation_stops?: { is_pickup: boolean; not_delivering: boolean } | { is_pickup: boolean; not_delivering: boolean }[] | null }
      for (const row of ((dsRows ?? []) as DSRow[])) {
        const sc = Array.isArray(row.circulation_stops) ? row.circulation_stops[0] : row.circulation_stops
        if (!sc || sc.is_pickup || sc.not_delivering) continue
        if (!row.checked) continue
        liveDoneByDelivery.set(row.delivery_id, (liveDoneByDelivery.get(row.delivery_id) ?? 0) + 1)
      }
    }

    for (const r of myRoutes) {
      const del = dels.find(d => d.route_id === r.id) ?? null
      const total = totalByRoute.get(r.id) ?? 0
      // Submitted: trust stops_completed (locked). Draft: count live from
      // delivery_stops so mid-run progress is visible.
      const submitted = !!del && ['submitted', 'paid'].includes(del.status)
      const done  = submitted
        ? (del?.stops_completed ?? 0)
        : (del ? (liveDoneByDelivery.get(del.id) ?? 0) : 0)
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0
      stats.set(r.id, { delivery: del, total, done, pct })
      totalDone += done
      totalPay  += done * driver.rate_per_stop  // rate stored as dollars (NUMERIC)
    }
  }

  const anyActive = Array.from(stats.values()).some(s => !s.delivery || !['submitted', 'paid'].includes(s.delivery.status))

  // Pending route-order suggestions count. Legacy dashboard surfaced
  // this so drivers knew their reorder request was still in admin's
  // queue. Without it, drivers re-submit thinking the first never
  // landed.
  const { count: pendingSugCount } = await admin
    .from('circulation_route_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driver.user_id)
    .eq('status', 'pending')
  const pendingSuggestions = pendingSugCount ?? 0

  // Invoice history
  const { data: invData } = await admin
    .from('circulation_deliveries')
    .select(`id, month, status, stops_completed, pay_calculated, pay_final, adjustment_note, circulation_routes(name)`)
    .eq('market', market)
    .eq('driver_id', driver.user_id)
    .in('status', ['submitted', 'paid'])
    .order('month', { ascending: false })
    .limit(18)
  type InvJoined = { id: string; month: string; status: string; stops_completed: number | null; pay_calculated: number | null; pay_final: number | null; adjustment_note: string | null; circulation_routes?: { name?: string } | { name?: string }[] | null }
  const invoices = ((invData ?? []) as unknown as InvJoined[]).map(i => ({
    ...i,
    route_name: Array.isArray(i.circulation_routes) ? i.circulation_routes[0]?.name ?? '' : i.circulation_routes?.name ?? '',
  }))

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <KeepSharingBrand size="md" showLLC />
          <div style={{ fontSize: 12, color: 'var(--color-portal-sub)', fontStyle: 'italic', marginTop: 6 }}>
            The leading voice in <span style={{ color: '#1A5FA8', fontWeight: 600 }}>&ldquo;your community&rdquo;</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-portal-text)' }}>{driver.full_name}</div>
          <div className="text-muted text-sm">{monthLabel}</div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Stats row */}
        <div className="stats-row" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Stops this month" value={String(totalDone)} color="#1E293B" />
          <StatCard label="Earnings"          value={`$${totalPay.toFixed(2)}`} color="#16A34A" />
          <StatCard label="Routes"            value={String(myRoutes.length)} color="#1E293B" />
        </div>

        {pendingSuggestions > 0 && (
          /* Pending reorder-suggestion banner — legacy parity. */
          <div className="card mb-3" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              {pendingSuggestions} reorder suggestion{pendingSuggestions === 1 ? '' : 's'} awaiting review
            </div>
            <div style={{ fontSize: 11, color: '#92400E', opacity: 0.7, marginTop: 2 }}>
              Your distribution manager will respond soon.
            </div>
          </div>
        )}

        {/* Full Run banner */}
        {myRoutes.length > 1 && anyActive && (
          <div className="card mb-4" style={{ background: '#0F2640', border: 'none', color: 'white' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', marginBottom: 4 }}>
              You have {myRoutes.length} routes this month
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 14 }}>
              All routes combined into one run for easier delivery
            </div>
            <Link
              href={`/distribution/${market}/driver/run`}
              className="btn btn-primary"
              style={{ background: 'white', color: '#0F2640', fontSize: 15, padding: 14, textAlign: 'center', display: 'block', borderRadius: 10, fontWeight: 700 }}
            >
              ▶ Start Full Run →
            </Link>
          </div>
        )}

        {myRoutes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No route assigned yet</div>
            <div className="text-sub" style={{ fontSize: 14 }}>Your distribution manager will assign your route soon. Check back shortly.</div>
          </div>
        ) : (
          <div className="grid-2">
            {/* Route cards column */}
            <div>
              {myRoutes.map(r => {
                const st = stats.get(r.id) ?? { delivery: null, total: 0, done: 0, pct: 0 }
                const del = st.delivery
                const submitted   = del && ['submitted', 'paid'].includes(del.status)
                const inProgress  = st.done > 0 && !submitted
                const paid        = del?.pay_final ?? del?.pay_calculated ?? 0
                return (
                  <div key={r.id} className="card mb-3">
                    <div className="card-header">
                      <span className="card-title">{r.name}</span>
                      {submitted
                        ? <span className="badge badge-green">✓ Submitted</span>
                        : inProgress
                          ? <span className="badge badge-amber">In Progress</span>
                          : <span className="badge badge-gray">Not started</span>}
                    </div>
                    <div className="text-sub" style={{ fontSize: 13, marginBottom: 12 }}>
                      {st.total} stops · {monthLabel}
                    </div>
                    <div style={{ background: 'var(--color-portal-bg)', borderRadius: 4, height: 6, marginBottom: 6 }}>
                      <div style={{ height: 6, borderRadius: 4, background: '#16A34A', width: `${st.pct}%`, transition: 'width .3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-portal-sub)', marginBottom: 16 }}>
                      <span>{st.done} of {st.total} delivered</span>
                      <span>{st.pct}%</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {submitted ? (
                        <div className="btn btn-primary" style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.7, cursor: 'default' }}>
                          ✓ Invoice submitted — ${paid.toFixed(2)}
                        </div>
                      ) : (
                        <Link href={`/distribution/${market}/driver?route=${r.id}`} className="btn btn-primary" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                          {inProgress ? 'Continue route →' : 'Start route →'}
                        </Link>
                      )}
                      <Link href={`/distribution/${market}/driver?route=${r.id}`} className="btn btn-ghost" style={{ textAlign: 'center', fontSize: 13 }}>
                        ☰ View as list
                      </Link>
                      <Link href={`/distribution/${market}/driver/map?route=${r.id}`} className="btn btn-ghost" style={{ textAlign: 'center', fontSize: 13 }}>
                        📍 View as map
                      </Link>
                      {!submitted && (
                        <Link href={`/distribution/${market}/driver/reorder?route=${r.id}`} className="btn btn-ghost" style={{ textAlign: 'center', fontSize: 13 }}>
                          ✎ Edit route
                        </Link>
                      )}
                      <Link href={`/distribution/${market}/driver/print?route=${r.id}`} target="_blank" className="btn btn-ghost" style={{ textAlign: 'center', fontSize: 13 }}>
                        🖨 Print sheet
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Invoice history */}
            <div>
              <div className="card">
                <div className="card-title mb-3">Invoice history</div>
                {invoices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-portal-sub)', fontSize: 13, lineHeight: 1.6 }}>
                    No invoices yet.<br />Complete your first route and tap <strong>Submit invoice</strong>.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Route</th>
                        <th style={{ textAlign: 'center' }}>Stops</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => {
                        const label = new Date(inv.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        const pay   = inv.pay_final ?? inv.pay_calculated ?? 0
                        const paid  = inv.status === 'paid'
                        return (
                          <>
                            <tr key={inv.id}>
                              <td>{label}</td>
                              <td className="text-sub text-sm">{inv.route_name}</td>
                              <td className="mono" style={{ textAlign: 'center' }}>{inv.stops_completed ?? 0}</td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>${pay.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${paid ? 'badge-green' : 'badge-amber'}`}>{paid ? '✓ Paid' : 'Pending'}</span>
                              </td>
                            </tr>
                            {inv.adjustment_note && (
                              <tr key={inv.id + '-note'} style={{ background: '#FFFBEB' }}>
                                <td colSpan={5} style={{ fontSize: 11, color: '#92400E', padding: '4px 12px', fontStyle: 'italic' }}>
                                  Note: {inv.adjustment_note}
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-card" style={{ background: 'white', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </div>
    </div>
  )
}
