// /admin/circulation/progress — live delivery progress monitor.
//
// Shows every active delivery for the selected month. For each: driver,
// route, completion %, status. Click into one to see every stop with
// status, timestamps, driver notes, leftovers — exactly what the PHP
// progress.php page did, ported to our stack.

import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { ProgressMonitor, type DeliveryProgressRow } from './ProgressMonitor'

export const metadata = { title: 'Delivery Progress — Distribution' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ month?: string; delivery?: string }> }

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ProgressPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const month  = sp.month?.trim() || thisMonth()
  const focus  = sp.delivery?.trim() || null

  const sb = createAdminClient()

  let rows: DeliveryProgressRow[] = []
  let months: string[] = []
  let focusDetail: {
    delivery: DeliveryProgressRow
    stops: Array<{
      id: string; name: string; address: string | null; city: string | null;
      sort_order: number; is_pickup: boolean; not_delivering: boolean;
      checked: boolean; checked_at: string | null; driver_note: string | null;
      leftovers: number; leftovers_json: Record<string, number> | null;
    }>
  } | null = null

  try {
    // Headline deliveries — counted aggregates from delivery_stops.
    const { data: dels } = await sb
      .from('circulation_deliveries')
      .select(`
        id, route_id, driver_id, month, status, stops_completed,
        pay_calculated, pay_final, submitted_at, paid_at,
        circulation_routes(name),
        circulation_drivers(full_name)
      `)
      .eq('market', dbKey)
      .eq('month', month)
      .order('status', { ascending: true })

    type Joined = {
      id: string; route_id: string; driver_id: string; month: string; status: string;
      stops_completed: number; pay_calculated: number; pay_final: number | null;
      submitted_at: string | null; paid_at: string | null;
      circulation_routes?: { name: string } | null;
      circulation_drivers?: { full_name: string } | null;
    }
    const baseRows = (dels as Joined[] | null ?? [])

    // Counts of total + checked + leftovers per delivery, computed from
    // delivery_stops for accuracy (matches the PHP query).
    if (baseRows.length > 0) {
      const ids = baseRows.map(r => r.id)
      const { data: ds } = await sb
        .from('circulation_delivery_stops')
        .select('delivery_id, checked, leftovers, circulation_stops!inner(is_pickup, not_delivering)')
        .in('delivery_id', ids)
      type DSRow = {
        delivery_id: string; checked: boolean; leftovers: number;
        circulation_stops?: { is_pickup: boolean; not_delivering: boolean } | null;
      }
      const dsRows = (ds as DSRow[] | null ?? [])
      const counts = new Map<string, { total: number; done: number; leftovers: number }>()
      for (const d of dsRows) {
        const eligible = !d.circulation_stops?.is_pickup && !d.circulation_stops?.not_delivering
        if (!eligible) continue
        const cur = counts.get(d.delivery_id) ?? { total: 0, done: 0, leftovers: 0 }
        cur.total++
        if (d.checked) cur.done++
        cur.leftovers += d.leftovers ?? 0
        counts.set(d.delivery_id, cur)
      }
      rows = baseRows.map(r => {
        const c = counts.get(r.id) ?? { total: 0, done: 0, leftovers: 0 }
        return {
          id:             r.id,
          driver_name:    r.circulation_drivers?.full_name ?? '(unknown driver)',
          route_name:     r.circulation_routes?.name ?? '(route)',
          status:         r.status,
          total:          c.total,
          done:           c.done,
          leftovers:      c.leftovers,
          stops_completed: r.stops_completed,
          pay_calculated: r.pay_calculated,
          pay_final:      r.pay_final,
          submitted_at:   r.submitted_at,
          paid_at:        r.paid_at,
          month:          r.month,
        }
      })
    }

    // Month chips data.
    const { data: monthData } = await sb
      .from('circulation_deliveries')
      .select('month')
      .eq('market', dbKey)
      .order('month', { ascending: false })
    months = Array.from(new Set((monthData ?? []).map(r => r.month as string)))

    // Focus detail (one specific delivery).
    if (focus) {
      const focused = rows.find(r => r.id === focus)
      if (focused) {
        const { data: dsRows } = await sb
          .from('circulation_delivery_stops')
          .select('id, stop_id, checked, checked_at, driver_note, leftovers, leftovers_json, circulation_stops(name, address, city, sort_order, is_pickup, not_delivering)')
          .eq('delivery_id', focus)
        type Det = {
          id: string; stop_id: string; checked: boolean; checked_at: string | null;
          driver_note: string | null; leftovers: number; leftovers_json: Record<string, number> | null;
          circulation_stops?: { name: string; address: string | null; city: string | null; sort_order: number; is_pickup: boolean; not_delivering: boolean } | null;
        }
        const detailed = (dsRows as Det[] | null ?? [])
          .map(d => ({
            id:           d.id,
            name:         d.circulation_stops?.name ?? '(stop)',
            address:      d.circulation_stops?.address ?? null,
            city:         d.circulation_stops?.city ?? null,
            sort_order:   d.circulation_stops?.sort_order ?? 0,
            is_pickup:    d.circulation_stops?.is_pickup ?? false,
            not_delivering: d.circulation_stops?.not_delivering ?? false,
            checked:      d.checked,
            checked_at:   d.checked_at,
            driver_note:  d.driver_note,
            leftovers:    d.leftovers,
            leftovers_json: d.leftovers_json,
          }))
          .sort((a, b) => (b.is_pickup ? 1 : 0) - (a.is_pickup ? 1 : 0) || a.sort_order - b.sort_order)
        focusDetail = { delivery: focused, stops: detailed }
      }
    }
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Delivery Progress</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Region: <span className="font-semibold text-portal-text">{region.name}</span>
            <span className="text-portal-muted"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <ProgressMonitor
          rows={rows}
          months={months}
          activeMonth={month}
          focusDetail={focusDetail}
        />
      </div>
    </div>
  )
}
