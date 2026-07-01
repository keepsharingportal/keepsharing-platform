// /distribution/[market]/driver/invoices — Verbatim port of v3
// driver/invoices.php.
//
// Groups invoices by month with a per-month card, per-month subtotal,
// stats row on top (total earned / total stops / deliveries), inline
// adjustment-note rows in mustard when Jason edited the pay, and a
// "Continue route →" link for any draft delivery so the driver can
// resume from here.

import { Fragment } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ market: string }> }

interface InvRow {
  id: string; month: string; status: string;
  stops_completed: number | null;
  pay_calculated:  number | null;
  pay_final:       number | null;
  submitted_at:    string | null;
  paid_at:         string | null;
  adjustment_note: string | null;
  route_id:        string;
  route_name:      string;
}

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return { title: `Invoices — ${marketDisplayName(market)}` }
}

function fmtMonth(m: string): string {
  return new Date(m + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default async function DriverInvoicesPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/distribution/${market}/driver`)

  const admin = createAdminClient()
  const { data: drv } = await admin
    .from('circulation_drivers')
    .select('full_name, active, market')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!drv || !(drv as { active: boolean }).active || (drv as { market: string }).market !== market) {
    return <FullBleedMessage>Not a driver for {marketDisplayName(market)}.</FullBleedMessage>
  }
  const driverRow = drv as { full_name: string; active: boolean; market: string }

  const { data: rowData } = await admin
    .from('circulation_deliveries')
    .select('id, month, status, stops_completed, pay_calculated, pay_final, submitted_at, paid_at, adjustment_note, route_id, circulation_routes(name, sort_order)')
    .eq('driver_id', user.id)
    .eq('market',    market)
    .order('month', { ascending: false })

  type RawRow = InvRow & { circulation_routes?: { name: string; sort_order: number } | { name: string; sort_order: number }[] | null }
  const invoices: InvRow[] = ((rowData ?? []) as unknown as RawRow[]).map(r => {
    const rr = Array.isArray(r.circulation_routes) ? r.circulation_routes[0] : r.circulation_routes
    return { ...r, route_name: rr?.name ?? 'Route' }
  })

  // Group by month (already sorted desc by month).
  const byMonth = new Map<string, InvRow[]>()
  for (const inv of invoices) {
    if (!byMonth.has(inv.month)) byMonth.set(inv.month, [])
    byMonth.get(inv.month)!.push(inv)
  }

  // Totals — only finalized (submitted or paid) count.
  let totalEarned = 0
  let totalStops  = 0
  let countFinalized = 0
  for (const r of invoices) {
    if (r.status === 'submitted' || r.status === 'paid') {
      totalEarned    += (r.pay_final ?? r.pay_calculated ?? 0)
      totalStops     += r.stops_completed ?? 0
      countFinalized += 1
    }
  }

  return (
    <div style={{ background: '#F1F5F9', minHeight: '100vh', fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif' }}>
      {/* Top bar — same navy as portal for identity */}
      <div style={{ background: '#0F2640', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/distribution/${market}/driver/dashboard`} style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 20 }} title="Back to my routes">←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>My invoices</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{driverRow.full_name}</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>

        {/* Stats row */}
        {invoices.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total earned" value={fmtMoney(totalEarned)} color="#16A34A" />
            <StatCard label="Total stops"  value={totalStops.toLocaleString()} color="#1E293B" />
            <StatCard label="Deliveries"   value={String(countFinalized)} color="#1E293B" />
          </div>
        )}

        {invoices.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>No invoices yet</div>
            <div style={{ fontSize: 14, color: '#64748B' }}>Complete your first route and submit an invoice to get started.</div>
            <Link href={`/distribution/${market}/driver`} style={{ marginTop: 20, display: 'inline-block', padding: '10px 20px', background: '#0F2640', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Go to my route
            </Link>
          </div>
        ) : (
          Array.from(byMonth.entries()).map(([month, monthInvoices]) => {
            const monthTotal = monthInvoices.reduce((sum, i) => sum + (i.pay_final ?? i.pay_calculated ?? 0), 0)
            return (
              <div key={month} style={{ background: 'white', borderRadius: 12, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>{fmtMonth(month)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#16A34A', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                    {fmtMoney(monthTotal)}
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th style={thStyle}>Route</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Stops</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                      <th style={thStyle}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthInvoices.map(inv => {
                      const pay = inv.pay_final ?? inv.pay_calculated ?? 0
                      const isDraft = inv.status === 'draft'
                      return (
                        <Fragment key={inv.id}>
                          <tr style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={tdStyle}><strong>{inv.route_name}</strong></td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontFamily: '"DM Mono", ui-monospace, monospace' }}>{inv.stops_completed ?? '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: '"DM Mono", ui-monospace, monospace', fontWeight: 600 }}>
                              {pay > 0 ? fmtMoney(pay) : '-'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <StatusBadge status={inv.status} />
                            </td>
                            <td style={{ ...tdStyle, color: '#64748B', fontSize: 12 }}>
                              {inv.submitted_at ? fmtDate(inv.submitted_at) : '-'}
                            </td>
                          </tr>
                          {inv.adjustment_note && (
                            <tr>
                              <td colSpan={5} style={{ background: '#FFFBEB', fontSize: 12, color: '#92400E', padding: '4px 14px', fontStyle: 'italic' }}>
                                Adjustment note: {inv.adjustment_note}
                              </td>
                            </tr>
                          )}
                          {isDraft && (
                            <tr>
                              <td colSpan={5} style={{ background: '#F8FAFC', padding: '8px 14px' }}>
                                <Link href={`/distribution/${market}/driver?route=${inv.route_id}`} style={{ display: 'inline-block', padding: '6px 14px', background: '#0F2640', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                                  Continue route →
                                </Link>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style: React.CSSProperties = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
    fontSize: 11, fontWeight: 700,
  }
  if (status === 'paid')      return <span style={{ ...style, background: '#DCFCE7', color: '#166534' }}>✓ Paid</span>
  if (status === 'submitted') return <span style={{ ...style, background: '#FEF3C7', color: '#92400E' }}>Pending</span>
  return <span style={{ ...style, background: '#E2E8F0', color: '#64748B' }}>Draft</span>
}

function FullBleedMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F1F5F9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        {children}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B',
}
const tdStyle: React.CSSProperties = {
  padding: '10px 14px', color: '#1E293B', verticalAlign: 'middle',
}
