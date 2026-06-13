// /admin/circulation/drivers — Users (drivers).
//
// Port of admin/users.php from the v3_FINAL portal source, scoped to
// the driver role. (admin / editor / bookkeeper / superadmin roles live
// in /admin/users at the platform level and aren't surfaced here.) The
// page renders a single user table with name + email + role + routes +
// rate + active status, with Add/Edit user modal opened from the page
// header. Mirrors the source layout 1:1 inside the portal-app chrome.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { UsersClient, type DriverRow } from './UsersClient'

export const metadata = { title: 'Users — Distribution Portal' }
export const dynamic  = 'force-dynamic'

export default async function UsersPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let drivers: DriverRow[] = []
  let routes: Array<{ id: string; name: string }> = []
  try {
    const [dRes, rRes, arRes] = await Promise.all([
      sb.from('circulation_drivers').select('user_id, full_name, email, phone, rate_per_stop, can_view_all, notes, active').eq('market', dbKey).order('full_name'),
      sb.from('circulation_routes').select('id, name').eq('market', dbKey).eq('active', true).order('sort_order').order('name'),
      sb.from('circulation_driver_routes').select('driver_id, route_id'),
    ])
    type Base = { user_id: string; full_name: string; email: string; phone: string | null; rate_per_stop: number; can_view_all: boolean; notes: string | null; active: boolean }
    const baseDrivers = (dRes.data ?? []) as Base[]
    routes = (rRes.data ?? []) as Array<{ id: string; name: string }>
    const routeName = new Map(routes.map(r => [r.id, r.name]))
    const assigns = (arRes.data ?? []) as Array<{ driver_id: string; route_id: string }>
    const byDriver = new Map<string, string[]>()
    for (const a of assigns) {
      if (!byDriver.has(a.driver_id)) byDriver.set(a.driver_id, [])
      byDriver.get(a.driver_id)!.push(a.route_id)
    }
    drivers = baseDrivers.map(d => {
      const rids = byDriver.get(d.user_id) ?? []
      return {
        ...d,
        route_ids:   rids,
        route_names: rids.map(id => routeName.get(id) ?? '').filter(Boolean),
      }
    })
  } catch { /* table missing */ }

  return (
    <UsersClient market={dbKey} drivers={drivers} routes={routes} />
  )
}
