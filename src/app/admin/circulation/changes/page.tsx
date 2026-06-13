// /admin/circulation/changes — Change Requests.
//
// Port of admin/changes.php from the v3_FINAL portal source. Card-list
// of driver-submitted change requests with Approve & apply / Reject
// actions inline. Filter chips toggle pending vs all in the page header.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { ChangesClient, type ChangeRequestRow } from './ChangesClient'

export const metadata = { title: 'Change Requests — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ filter?: string }> }

export default async function ChangesPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const filter = sp.filter === 'all' ? 'all' : 'pending'

  const sb = createAdminClient()
  let rows: ChangeRequestRow[] = []
  try {
    let q = sb.from('circulation_change_requests')
      .select(`
        id, type, status, stop_id, route_id, driver_id, field_name,
        old_value, new_value, notes, admin_note, created_at, reviewed_at,
        circulation_stops(name),
        circulation_routes(name),
        circulation_drivers(full_name)
      `)
      .eq('market', dbKey)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'pending') q = q.eq('status', 'pending')
    const { data } = await q

    type Joined = ChangeRequestRow & {
      circulation_stops?:   { name?: string } | { name?: string }[] | null
      circulation_routes?:  { name?: string } | { name?: string }[] | null
      circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null
    }
    rows = ((data ?? []) as unknown as Joined[]).map(r => {
      const s  = Array.isArray(r.circulation_stops)   ? r.circulation_stops[0]   : r.circulation_stops
      const ro = Array.isArray(r.circulation_routes)  ? r.circulation_routes[0]  : r.circulation_routes
      const d  = Array.isArray(r.circulation_drivers) ? r.circulation_drivers[0] : r.circulation_drivers
      return {
        ...r,
        stop_name:   s?.name ?? null,
        route_name:  ro?.name ?? '(route)',
        driver_name: d?.full_name ?? '(driver)',
      }
    })
  } catch { /* table missing */ }

  return <ChangesClient filter={filter} rows={rows} />
}
