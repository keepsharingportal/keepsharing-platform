// /admin/circulation/deliveries — monthly invoice review.
//
// Shows every delivery for the active month. Drafts are work-in-progress
// (drivers still checking off stops); submitted/reviewed are ready for
// pay; paid is closed. Adjustment + reopen actions are inline.

import Link from 'next/link'
import { ArrowLeft, Receipt } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { DeliveriesEditor, type DeliveryRow } from './DeliveriesEditor'

export const metadata = { title: 'Deliveries — Distribution' }
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
    const { data: rows } = await sb
      .from('circulation_deliveries')
      .select(`
        id, route_id, driver_id, month, status,
        stops_completed, pay_calculated, pay_final, adjustment_note,
        driver_notes, submitted_at, reviewed_at, paid_at,
        circulation_routes(name),
        circulation_drivers(full_name, email, rate_per_stop)
      `)
      .eq('market', dbKey)
      .eq('month', month)
      .order('status',       { ascending: true })
      .order('submitted_at', { ascending: false, nullsFirst: false })
    deliveries = (rows ?? []) as unknown as DeliveryRow[]

    const { data: monthRows } = await sb
      .from('circulation_deliveries')
      .select('month').eq('market', dbKey).order('month', { ascending: false })
    months = Array.from(new Set((monthRows ?? []).map(r => r.month as string)))

    // Stragglers: assigned drivers who haven't submitted yet.
    const { data: assigned } = await sb
      .from('circulation_driver_routes')
      .select('driver_id, circulation_drivers!inner(user_id, full_name, market, active)')
    type ARow = { driver_id: string; circulation_drivers?: { user_id: string; full_name: string; market: string; active: boolean } | null }
    const all = (assigned as ARow[] | null ?? [])
      .filter(a => a.circulation_drivers?.market === dbKey && a.circulation_drivers?.active)
    const submittedIds = new Set(deliveries.filter(d => d.status !== 'draft').map(d => d.driver_id))
    const unique = new Map<string, string>()
    for (const a of all) {
      if (!submittedIds.has(a.driver_id)) unique.set(a.driver_id, a.circulation_drivers?.full_name ?? '')
    }
    stragglers = Array.from(unique.entries()).map(([user_id, full_name]) => ({ user_id, full_name }))
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Deliveries / Invoices</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Region: <span className="font-semibold text-portal-text">{region.name}</span>
            <span className="text-portal-muted"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <DeliveriesEditor
          initialDeliveries={deliveries}
          stragglers={stragglers}
          months={months}
          activeMonth={month}
        />
      </div>
    </div>
  )
}
