// /admin/circulation/deliveries — Deliveries (monthly invoice review).
//
// Port of admin/deliveries.php from the v3_FINAL portal source. Single
// table per month with month chip selector at top, stragglers warning
// banner ("Not yet submitted for…"), and Mark paid / Reopen actions.
// Pay sheet modal supports manual amount adjustment + note.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { DeliveriesClient, type DeliveryRow } from './DeliveriesClient'

export const metadata = { title: 'Deliveries — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ month?: string }> }

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function DeliveriesPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const month  = sp.month?.trim() || thisMonth()

  const sb = createAdminClient()

  let deliveries: DeliveryRow[] = []
  let stragglers: Array<{ user_id: string; full_name: string }> = []
  let months: string[] = []

  try {
    const [delsRes, monthsRes, driversRes, monthDelsRes] = await Promise.all([
      sb.from('circulation_deliveries')
        .select(`
          id, route_id, driver_id, month, status,
          stops_completed, pay_calculated, pay_final, adjustment_note,
          submitted_at, paid_at,
          gas_amount, gas_receipt_url, pickup_load_json,
          circulation_routes(name),
          circulation_drivers(full_name)
        `)
        .eq('market', dbKey)
        .eq('month', month)
        .order('status', { ascending: true })
        .order('submitted_at', { ascending: false, nullsFirst: false }),
      sb.from('circulation_deliveries')
        .select('month')
        .eq('market', dbKey)
        .order('month', { ascending: false })
        .limit(200),
      sb.from('circulation_drivers')
        .select('user_id, full_name, active')
        .eq('market', dbKey)
        .eq('active', true),
      sb.from('circulation_deliveries')
        .select('driver_id, status')
        .eq('market', dbKey)
        .eq('month', month),
    ])

    type Joined = DeliveryRow & {
      circulation_routes?:  { name?: string } | { name?: string }[] | null
      circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null
    }
    deliveries = ((delsRes.data ?? []) as unknown as Joined[]).map(d => {
      const r = Array.isArray(d.circulation_routes)  ? d.circulation_routes[0]  : d.circulation_routes
      const dr = Array.isArray(d.circulation_drivers) ? d.circulation_drivers[0] : d.circulation_drivers
      return { ...d, route_name: r?.name ?? '(route)', driver_name: dr?.full_name ?? '(driver)' }
    })

    months = Array.from(new Set(((monthsRes.data ?? []) as Array<{ month: string }>).map(r => r.month))).slice(0, 24)
    if (!months.includes(month)) months = [month, ...months]

    const allDrivers   = (driversRes.data   ?? []) as Array<{ user_id: string; full_name: string }>
    const monthlyDels  = (monthDelsRes.data ?? []) as Array<{ driver_id: string; status: string }>
    const submittedSet = new Set(monthlyDels.filter(d => d.status !== 'draft').map(d => d.driver_id))
    stragglers = allDrivers.filter(d => !submittedSet.has(d.user_id))
  } catch { /* table missing */ }

  return (
    <DeliveriesClient
      month={month}
      months={months}
      deliveries={deliveries}
      stragglers={stragglers}
    />
  )
}
