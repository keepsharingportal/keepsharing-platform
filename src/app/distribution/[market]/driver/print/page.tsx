// /distribution/[market]/driver/print — Verbatim port of v3 driver/print.php.
//
// Two modes:
//   1. No ?route param → route selector (assigned routes as tiles)
//   2. ?route=<id>     → the printable sheet itself
//
// The sheet includes: summary bar with per-pub totals + bundle counts,
// pickup + paused rows in colored bands, colored qty numbers per pub,
// totals row, driver notes lines (unless ?route2=1 for stop-list-only),
// and a KeepSharing header + footer.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string; route2?: string }>
}

interface StopRow {
  id: string; sort_order: number; name: string;
  address: string | null; city: string | null; zip: string | null;
  is_pickup: boolean; not_delivering: boolean;
  not_delivering_note: string | null;
  quantities: Record<string, number> | null;
  notes: string | null;
}
interface PubRow { id: string; short_name: string; abbrev: string; color_hex: string }

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabelOf(m: string): string {
  return new Date(m + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function PrintRoutePage({ params, searchParams }: PageProps) {
  const { market } = await params
  const sp = await searchParams
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/distribution/${market}/driver`)

  const admin = createAdminClient()
  const { data: driver } = await admin
    .from('circulation_drivers')
    .select('user_id, full_name, active')
    .eq('user_id', user.id)
    .eq('market', market)
    .maybeSingle()
  if (!driver || !(driver as { active: boolean }).active) {
    return <ErrorScreen>No driver access for {marketDisplayName(market)}.</ErrorScreen>
  }
  const driverRow = driver as { user_id: string; full_name: string; active: boolean }
  const routeId = sp.route?.trim()

  // ── Route selector when no ?route param ──────────────────────────────
  if (!routeId) {
    const { data: assigns } = await admin
      .from('circulation_driver_routes')
      .select('route_id')
      .eq('driver_id', driverRow.user_id)
    const routeIds = ((assigns ?? []) as Array<{ route_id: string }>).map(a => a.route_id)
    let routes: Array<{ id: string; name: string }> = []
    if (routeIds.length > 0) {
      const { data: rd } = await admin
        .from('circulation_routes')
        .select('id, name, sort_order')
        .eq('market', market)
        .eq('active', true)
        .in('id', routeIds)
        .order('sort_order')
      routes = ((rd ?? []) as Array<{ id: string; name: string; sort_order: number }>).map(({ id, name }) => ({ id, name }))
    }
    return <RouteSelector market={market} routes={routes} />
  }

  // ── Full print sheet ────────────────────────────────────────────────
  const { data: route } = await admin
    .from('circulation_routes')
    .select('id, name, city')
    .eq('market', market)
    .eq('id', routeId)
    .maybeSingle()
  if (!route) notFound()

  const { data: pubData } = await admin
    .from('circulation_publications')
    .select('id, short_name, abbrev, color_hex')
    .eq('active', true)
    .order('sort_order')
  const pubs = (pubData ?? []) as PubRow[]

  const { data: stopsData } = await admin
    .from('circulation_stops')
    .select('id, sort_order, name, address, city, zip, is_pickup, not_delivering, not_delivering_note, quantities, notes')
    .eq('market', market)
    .eq('route_id', routeId)
    .eq('active', true)
    .order('is_pickup', { ascending: false })
    .order('sort_order')
    .order('name')
  const stops = (stopsData ?? []) as StopRow[]

  // Bundle size — market setting, default 25
  const { data: bundleSetting } = await admin
    .from('circulation_settings')
    .select('value')
    .eq('market', market)
    .eq('key', 'bundle_size')
    .maybeSingle()
  const bundleSize = Math.max(1, parseInt((bundleSetting as { value?: string } | null)?.value ?? '25', 10))

  const month = currentMonth()
  const monthLabel = monthLabelOf(month)
  const stopListOnly = sp.route2 === '1'
  const totalStops = stops.filter(s => !s.is_pickup && !s.not_delivering).length

  // Per-pub totals across all deliverable stops
  const totals: Record<string, number> = {}
  for (const p of pubs) totals[p.short_name] = 0
  for (const s of stops) {
    if (s.is_pickup || s.not_delivering) continue
    for (const p of pubs) {
      totals[p.short_name] += Number(s.quantities?.[p.short_name] ?? 0)
    }
  }

  // Numbering — pickups + paused rows are NOT counted; drivers see a
  // running number for deliverable stops only.
  let stopCounter = 0
  const numberedRows = stops.map(s => {
    if (s.is_pickup || s.not_delivering) return { stop: s, num: s.is_pickup ? 'P' : '-' }
    stopCounter++
    return { stop: s, num: String(stopCounter) }
  })

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 20, color: '#000', fontFamily: 'Arial, sans-serif' }}>
      <PrintStyles />

      {/* Screen-only controls */}
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <PrintButton />
        <Link
          href={`/distribution/${market}/driver/print?route=${routeId}${stopListOnly ? '' : '&route2=1'}`}
          style={{ padding: '10px 20px', background: 'white', color: '#1E3A5F', border: '1.5px solid #1E3A5F', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
        >
          {stopListOnly ? '📝 Full sheet with notes' : '📋 Just stop list (no notes)'}
        </Link>
        <Link
          href={`/distribution/${market}/driver/dashboard`}
          style={{ padding: '10px 20px', background: 'white', color: '#64748B', border: '1.5px solid #CBD5E1', borderRadius: 8, fontSize: 14, textDecoration: 'none' }}
        >
          ← Back to portal
        </Link>
      </div>

      <div className="sheet" style={{ background: 'white', padding: '15mm 10mm', boxShadow: '0 2px 12px rgba(0,0,0,.15)', maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, borderBottom: '2px solid #1E3A5F', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: '15pt', fontWeight: 700, color: '#1E3A5F', lineHeight: 1.2, margin: 0 }}>
              {(route as { name: string }).name}
            </h1>
            <div style={{ fontSize: '9pt', color: '#64748B', marginTop: 2 }}>
              {monthLabel} · Driver: {driverRow.full_name}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#64748B' }}>
            <div style={{ fontSize: '13pt', fontWeight: 700, color: '#1E3A5F', fontFamily: 'Georgia, serif' }}>
              Keep<span style={{ color: '#1A5FA8' }}>Sharing</span>
            </div>
            <div style={{ marginTop: 3 }}>Date: ___________________</div>
            <div style={{ marginTop: 2 }}>Signed: ___________________</div>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 16, padding: '6px 10px', background: '#F1F5F9', borderRadius: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '9.5pt' }}><strong style={{ color: '#1E3A5F' }}>{totalStops}</strong> stops</div>
          {pubs.map(p => {
            const qty = totals[p.short_name] ?? 0
            const bundles = Math.ceil(qty / bundleSize)
            return (
              <div key={p.id} style={{ fontSize: '9.5pt', color: p.color_hex }}>
                <strong>{p.abbrev}:</strong> {qty.toLocaleString()} copies ({bundles} bundle{bundles === 1 ? '' : 's'})
              </div>
            )
          })}
        </div>

        {/* Stop table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, textAlign: 'center' }}>✓</th>
              <th style={{ ...thStyle, width: 24, textAlign: 'center' }}>#</th>
              <th style={thStyle}>Location</th>
              {pubs.map(p => (
                <th key={p.id} style={{ ...thStyle, textAlign: 'center', width: 42 }}>{p.abbrev}</th>
              ))}
              <th style={{ ...thStyle, width: 80 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {numberedRows.map(({ stop: s, num }, i) => {
              const isPickup = s.is_pickup
              const isPaused = !isPickup && s.not_delivering
              const bg = isPickup ? '#DBEAFE' : isPaused ? '#FEF9C3' : (i % 2 === 1 ? '#F8FAFC' : 'transparent')
              return (
                <tr key={s.id} style={{ background: bg, fontWeight: isPickup ? 700 : 400, color: isPaused ? '#92400E' : '#000' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {isPickup ? '📦' : isPaused ? '⏸' : (
                      <span style={{ display: 'inline-block', width: 18, height: 18, border: '1.5px solid #CBD5E1', borderRadius: 3 }} />
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#94A3B8', fontSize: '8pt' }}>{num}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: isPickup ? 700 : 500 }}>{s.name}</div>
                    {s.address && (
                      <div style={{ fontSize: '8.5pt', color: '#64748B', marginTop: 1 }}>
                        {s.address}{s.city ? `, ${s.city}` : ''}{s.zip ? ` ${s.zip}` : ''}
                      </div>
                    )}
                    {isPickup && (
                      <div style={{ fontSize: '8.5pt', color: '#1A5FA8', fontWeight: 600, marginTop: 1 }}>
                        ← Load magazines here first
                      </div>
                    )}
                    {isPaused && s.not_delivering_note && (
                      <div style={{ fontSize: '8pt', color: '#92400E', fontStyle: 'italic', marginTop: 1 }}>
                        {s.not_delivering_note}
                      </div>
                    )}
                    {s.notes && !isPickup && (
                      <div style={{ fontSize: '8.5pt', color: '#1A5FA8', marginTop: 1 }}>
                        📌 {s.notes}
                      </div>
                    )}
                  </td>
                  {pubs.map(p => {
                    const qty = Number(s.quantities?.[p.short_name] ?? 0)
                    const dashOut = isPickup || isPaused
                    const color = dashOut ? '#CBD5E1' : qty > 0 ? p.color_hex : '#CBD5E1'
                    return (
                      <td key={p.id} style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color }}>
                        {dashOut ? '-' : qty > 0 ? qty : '-'}
                      </td>
                    )
                  })}
                  <td style={tdStyle}></td>
                </tr>
              )
            })}

            {/* Totals row */}
            <tr>
              <td colSpan={3} style={{ ...tdStyle, background: '#F1F5F9', fontWeight: 700, borderTop: '2px solid #1E3A5F', borderBottom: 'none', paddingTop: 7, textAlign: 'right', fontSize: '9pt' }}>
                TOTALS:
              </td>
              {pubs.map(p => (
                <td key={p.id} style={{ ...tdStyle, background: '#F1F5F9', fontWeight: 700, borderTop: '2px solid #1E3A5F', borderBottom: 'none', paddingTop: 7, textAlign: 'center', fontFamily: 'monospace', color: p.color_hex }}>
                  {(totals[p.short_name] ?? 0).toLocaleString()}
                </td>
              ))}
              <td style={{ ...tdStyle, background: '#F1F5F9', borderTop: '2px solid #1E3A5F', borderBottom: 'none', paddingTop: 7 }}></td>
            </tr>
          </tbody>
        </table>

        {/* Driver notes section — hidden in stop-list-only mode */}
        {!stopListOnly && (
          <div style={{ marginTop: 16, padding: 10, border: '1px solid #E2E8F0', borderRadius: 4, minHeight: 60 }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Driver notes / issues
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ borderBottom: '0.5px solid #CBD5E1', height: 18 }} />
              <div style={{ borderBottom: '0.5px solid #CBD5E1', height: 18 }} />
              <div style={{ borderBottom: '0.5px solid #CBD5E1', height: 18 }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#94A3B8' }}>
          <span>{marketDisplayName(market)} Distribution · KeepSharing, LLC</span>
          <span>{(route as { name: string }).name} · {monthLabel}</span>
        </div>
      </div>
    </div>
  )
}

// ── Route selector ────────────────────────────────────────────────────
function RouteSelector({ market, routes }: { market: string; routes: Array<{ id: string; name: string }> }) {
  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto', fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 16, fontSize: 18, color: '#1E293B' }}>Select route to print</h2>
      {routes.length === 0 && (
        <p style={{ fontSize: 14, color: '#64748B' }}>No routes assigned yet.</p>
      )}
      {routes.map(r => (
        <Link
          key={r.id}
          href={`/distribution/${market}/driver/print?route=${r.id}`}
          style={{ display: 'block', marginBottom: 8, textAlign: 'center', padding: '12px 20px', background: '#0F2640', color: 'white', borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
        >
          {r.name}
        </Link>
      ))}
      <Link
        href={`/distribution/${market}/driver/dashboard`}
        style={{ display: 'block', marginTop: 12, textAlign: 'center', padding: '10px 20px', background: 'white', color: '#64748B', borderRadius: 10, fontSize: 13, textDecoration: 'none', border: '1.5px solid #CBD5E1' }}
      >
        ← Back to portal
      </Link>
    </div>
  )
}

function ErrorScreen({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 40, textAlign: 'center', fontSize: 14, color: '#64748B' }}>{children}</div>
}

function PrintStyles() {
  return (
    <style>{`
      @page { size: portrait; margin: 12mm 10mm 10mm 10mm; }
      @media print {
        .no-print { display: none !important; }
        body { background: white !important; padding: 0 !important; }
        .sheet { box-shadow: none !important; padding: 0 !important; max-width: none !important; }
      }
    `}</style>
  )
}

const thStyle: React.CSSProperties = {
  background: '#1E3A5F', color: 'white', padding: '5px 6px',
  textAlign: 'left', fontSize: '8.5pt', fontWeight: 600, whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '5px 6px', borderBottom: '0.5px solid #E2E8F0',
  verticalAlign: 'middle', lineHeight: 1.3,
}
