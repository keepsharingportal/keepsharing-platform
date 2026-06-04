// /admin/circulation/drivers — manage delivery drivers per market.

import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { DriversEditor, type Driver } from './DriversEditor'

export const metadata = { title: 'Drivers — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function DriversPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let drivers: Driver[] = []
  let routes: Array<{ id: string; name: string }> = []
  try {
    const [dRes, rRes, arRes] = await Promise.all([
      sb.from('circulation_drivers').select('*').eq('market', dbKey).order('full_name'),
      sb.from('circulation_routes').select('id, name').eq('market', dbKey).eq('active', true).order('sort_order').order('name'),
      sb.from('circulation_driver_routes').select('driver_id, route_id'),
    ])
    const baseDrivers = (dRes.data ?? []) as Omit<Driver, 'route_ids'>[]
    const assigns = (arRes.data ?? []) as Array<{ driver_id: string; route_id: string }>
    const byDriver = new Map<string, string[]>()
    for (const a of assigns) {
      if (!byDriver.has(a.driver_id)) byDriver.set(a.driver_id, [])
      byDriver.get(a.driver_id)!.push(a.route_id)
    }
    drivers = baseDrivers.map(d => ({ ...d, route_ids: byDriver.get(d.user_id) ?? [] }))
    routes = (rRes.data ?? []) as Array<{ id: string; name: string }>
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Drivers</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <section>
          <AdminSectionHeader
            title="All drivers"
            count={drivers.length}
            description="Adding a driver mints a Supabase auth user. They sign in via magic link."
          />
          <DriversEditor market={dbKey} initialDrivers={drivers} availableRoutes={routes} />
        </section>
      </div>
    </div>
  )
}
