// /distribution/[market]/driver/print — Printable route sheet.
//
// Port of driver/print.php from the v3_FINAL portal source. Renders a
// print-friendly route sheet with one row per stop, checkboxes, and a
// clean numbered list driver can use offline.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
    return <div style={{ padding: 40 }}>No driver access for {marketDisplayName(market)}.</div>
  }
  const driverRow = driver as { user_id: string; full_name: string; active: boolean }

  const routeId = sp.route?.trim()
  if (!routeId) return <div style={{ padding: 40 }}>Pick a route from <Link href={`/distribution/${market}/driver/dashboard`}>My routes</Link>.</div>

  const { data: route } = await admin
    .from('circulation_routes')
    .select('id, name, city')
    .eq('market', market)
    .eq('id', routeId)
    .maybeSingle()
  if (!route) notFound()

  const { data: pubs }  = await admin.from('circulation_publications').select('id, short_name, abbrev').order('sort_order')
  const publications    = (pubs ?? []) as Array<{ id: string; short_name: string; abbrev: string }>

  const { data: stopsData } = await admin
    .from('circulation_stops')
    .select('id, sort_order, name, address, city, zip, is_pickup, not_delivering, quantities, notes')
    .eq('market', market)
    .eq('route_id', routeId)
    .eq('active', true)
    .order('sort_order')
    .order('name')
  type StopRow = { id: string; sort_order: number; name: string; address: string | null; city: string | null; zip: string | null; is_pickup: boolean; not_delivering: boolean; quantities: Record<string, number> | null; notes: string | null }
  const stops = (stopsData ?? []) as StopRow[]

  const month = currentMonth()
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ background: 'white', minHeight: '100vh', padding: 24, color: '#111' }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link href={`/distribution/${market}/driver/dashboard`} style={{ fontSize: 13 }}>
          ← Back to my routes
        </Link>
        <PrintButton />
      </div>

      <div style={{ borderBottom: '2px solid #1E3A5F', paddingBottom: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{(route as { name: string; city: string | null }).name}</h1>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          {driverRow.full_name} · {monthLabel} · {stops.filter(s => !s.is_pickup && !s.not_delivering).length} stops
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #1E3A5F' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', width: 24 }}>✓</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', width: 30 }}>#</th>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Stop</th>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Address</th>
            {publications.map(p => <th key={p.id} style={{ padding: '6px 8px', textAlign: 'center', width: 40 }}>{p.abbrev}</th>)}
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {stops.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #E2E8F0', background: s.is_pickup ? '#E8EFF8' : s.not_delivering ? '#FFFBEB' : 'transparent' }}>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                {s.is_pickup ? 'P' : s.not_delivering ? '—' : '☐'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace' }}>
                {s.is_pickup ? '' : s.sort_order}
              </td>
              <td style={{ padding: '8px' }}>
                <strong>{s.name}</strong>
                {s.not_delivering && <span style={{ marginLeft: 6, fontSize: 10, color: '#92400E' }}>(paused)</span>}
              </td>
              <td style={{ padding: '8px', color: '#475569' }}>
                {s.address ?? ''}{s.city ? `, ${s.city}` : ''}{s.zip ? ` ${s.zip}` : ''}
              </td>
              {publications.map(p => (
                <td key={p.id} style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                  {s.quantities?.[p.short_name] ?? '-'}
                </td>
              ))}
              <td style={{ padding: '8px', fontSize: 11, fontStyle: 'italic', color: '#64748B' }}>
                {s.notes ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 24, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
        Sheet generated {new Date().toLocaleString('en-US')}
      </div>
    </div>
  )
}
