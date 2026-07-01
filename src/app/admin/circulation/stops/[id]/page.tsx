// /admin/circulation/stops/[id] — one-stop history & edit page.
//
// Header: stop identity + editable form (name, address, quantities, notes)
// Stats:  total delivered · avg leftover % · waste trend
// History: one row per delivery, month-by-month, showing:
//          driver, month, delivered? (Y/N), leftover per pub,
//          driver's note, photos
//
// Reachable from:
//   - Low Performers widget on /admin/circulation
//   - Stop name link on /admin/circulation/progress detail
//   - Routes & Stops table

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, MessageSquare, ExternalLink } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { StopEditForm } from './StopEditForm'

export const metadata = { title: 'Stop history — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

interface StopRow {
  id:                  string
  market:              string
  route_id:            string
  name:                string
  address:             string | null
  city:                string | null
  zip:                 string | null
  notes:               string | null
  quantities:          Record<string, number> | null
  active:              boolean
  not_delivering:      boolean
  not_delivering_note: string | null
  is_pickup:           boolean
  is_advertiser:       boolean
  advertiser_account_id: string | null
  created_at:          string
}

interface HistoryRow {
  delivery_stop_id: string
  delivery_id:      string
  month:            string
  status:           string
  driver_name:      string
  checked:          boolean
  checked_at:       string | null
  driver_note:      string | null
  leftovers:        number
  leftovers_json:   Record<string, number> | null
  photo_urls:       string[]
}

function fmtMonthLong(m: string): string {
  return new Date(m + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function StopHistoryPage({ params }: PageProps) {
  const { id } = await params
  await requireAdmin()
  const sb = createAdminClient()

  const { data: stopRow } = await sb
    .from('circulation_stops')
    .select('id, market, route_id, name, address, city, zip, notes, quantities, active, not_delivering, not_delivering_note, is_pickup, is_advertiser, advertiser_account_id, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!stopRow) notFound()
  const stop = stopRow as StopRow
  const region = regionForMarket(stop.market)

  const { data: routeRow } = await sb
    .from('circulation_routes')
    .select('id, name')
    .eq('id', stop.route_id)
    .maybeSingle()
  const route = routeRow as { id: string; name: string } | null

  // Pull every delivery_stop row for this stop, joined to the delivery
  // to get the month + driver. Newest first.
  const { data: dsRows } = await sb
    .from('circulation_delivery_stops')
    .select('id, delivery_id, checked, checked_at, driver_note, leftovers, leftovers_json, photo_urls, circulation_deliveries(id, month, status, driver_id, circulation_drivers(full_name))')
    .eq('stop_id', id)
    .order('id', { ascending: false })
    .limit(60)

  type DsJoined = {
    id: string; delivery_id: string; checked: boolean; checked_at: string | null;
    driver_note: string | null; leftovers: number; leftovers_json: Record<string, number> | null;
    photo_urls: string[] | null;
    circulation_deliveries?: {
      id: string; month: string; status: string; driver_id: string;
      circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null;
    } | { id: string; month: string; status: string; driver_id: string; circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null }[] | null;
  }
  const rows: HistoryRow[] = ((dsRows ?? []) as DsJoined[]).map(r => {
    const del = Array.isArray(r.circulation_deliveries) ? r.circulation_deliveries[0] : r.circulation_deliveries
    const drv = Array.isArray(del?.circulation_drivers) ? del?.circulation_drivers[0] : del?.circulation_drivers
    return {
      delivery_stop_id: r.id,
      delivery_id:      r.delivery_id,
      month:            del?.month ?? '',
      status:           del?.status ?? 'draft',
      driver_name:      drv?.full_name ?? '(driver)',
      checked:          r.checked,
      checked_at:       r.checked_at,
      driver_note:      r.driver_note,
      leftovers:        r.leftovers ?? 0,
      leftovers_json:   r.leftovers_json,
      photo_urls:       r.photo_urls ?? [],
    }
  })
  // Sort by month desc, then by driver.
  rows.sort((a, b) => b.month.localeCompare(a.month) || a.driver_name.localeCompare(b.driver_name))

  // ── Aggregate stats ─────────────────────────────────────────────────
  const deliveredCount = rows.filter(r => r.checked).length
  const totalRuns      = rows.length
  const totalLeftover  = rows.reduce((s, r) => s + (r.leftovers ?? 0), 0)
  const dropPerRun     = Object.values(stop.quantities ?? {}).reduce((s: number, v) => s + (typeof v === 'number' ? v : 0), 0)
  const totalDropped   = dropPerRun * deliveredCount
  const wastePct       = totalDropped > 0 ? Math.round((totalLeftover / totalDropped) * 100) : 0

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-5">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <h1 className="text-xl font-bold text-portal-text tracking-tight">{stop.name}</h1>
          <p className="text-sm text-portal-sub mt-1">
            {route && (
              <>
                Route: <Link href={`/admin/circulation/routes?id=${route.id}`} className="text-portal-blue hover:underline">{route.name}</Link>
                <span className="text-portal-muted"> · </span>
              </>
            )}
            {region.name}
            {stop.address && (
              <>
                <span className="text-portal-muted"> · </span>
                {stop.address}{stop.city ? `, ${stop.city}` : ''}{stop.zip ? ` ${stop.zip}` : ''}
              </>
            )}
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Deliveries recorded" value={String(deliveredCount)} sub={totalRuns > 0 ? `${totalRuns} runs total` : undefined} />
          <StatCard label="Total leftover" value={String(totalLeftover)} sub={totalDropped > 0 ? `of ${totalDropped.toLocaleString()} dropped` : undefined} />
          <StatCard
            label="Waste rate"
            value={`${wastePct}%`}
            valueColor={wastePct >= 50 ? '#DC2626' : wastePct >= 25 ? '#B45309' : wastePct > 0 ? '#1E293B' : '#94A3B8'}
            sub={totalDropped === 0 ? 'No delivery data yet' : wastePct >= 25 ? 'Consider cutting qty' : 'Healthy'}
          />
          {stop.is_advertiser && (
            <StatCard label="Advertiser" value="★" sub={stop.advertiser_account_id ? 'Linked' : 'Flagged'} valueColor="#B45309" />
          )}
        </div>

        {/* Edit form */}
        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Edit stop</div>
          <StopEditForm
            stopId={stop.id}
            initial={{
              name:                stop.name,
              address:             stop.address,
              city:                stop.city,
              zip:                 stop.zip,
              notes:               stop.notes,
              quantities:          stop.quantities,
              not_delivering:      stop.not_delivering,
              not_delivering_note: stop.not_delivering_note,
              active:              stop.active,
            }}
          />
        </div>

        {/* History timeline */}
        <div className="rounded-lg border border-portal-border bg-white overflow-hidden">
          <div className="px-4 py-3 text-sm font-bold text-portal-text border-b border-portal-border">
            Month-by-month history
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-portal-sub p-6 text-center">No delivery records for this stop yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Driver</th>
                  <th>Delivered</th>
                  <th>Leftover</th>
                  <th>Driver note</th>
                  <th>Photos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const leftoverStr = r.leftovers_json && Object.keys(r.leftovers_json).length > 0
                    ? Object.entries(r.leftovers_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')
                    : (r.leftovers > 0 ? `${r.leftovers} copies` : '—')
                  return (
                    <tr key={r.delivery_stop_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.month ? fmtMonthLong(r.month) : '—'}</div>
                        <div className="text-sub text-xs">{r.status}</div>
                      </td>
                      <td>{r.driver_name}</td>
                      <td>
                        {r.checked
                          ? <span className="badge badge-green">✓ Yes</span>
                          : <span className="badge badge-gray">Skipped</span>}
                        {r.checked_at && (
                          <div className="text-xs text-sub" style={{ marginTop: 2 }}>
                            {new Date(r.checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td style={{ color: r.leftovers > 0 ? '#B45309' : 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {r.leftovers > 0 && <Package size={11} />}
                          {leftoverStr}
                        </div>
                      </td>
                      <td className="text-sub text-sm" style={{ maxWidth: 260 }}>
                        {r.driver_note ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <MessageSquare size={11} style={{ marginTop: 3, flexShrink: 0 }} />
                            <span>{r.driver_note}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {r.photo_urls.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {r.photo_urls.map(url => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="POD" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #E2E8F0' }} />
                              </a>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {stop.advertiser_account_id && (
          <div className="rounded-lg border border-portal-border bg-portal-blue-lt p-3 text-sm">
            This stop is linked to an advertiser account.{' '}
            <Link href={`/admin/advertisers/${stop.advertiser_account_id}`} className="text-portal-blue font-semibold inline-flex items-center gap-1">
              Open advertiser <ExternalLink size={11} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 160, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#94A3B8', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valueColor ?? '#1E293B', fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}
