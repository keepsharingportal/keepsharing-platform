// /admin/circulation/changes — Change Requests.
//
// Port of admin/changes.php from the v3_FINAL portal source. Card-list
// of driver-submitted change requests with Approve & apply / Reject
// actions inline. Filter chips toggle pending vs all in the page header.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { ChangesClient, type ChangeRequestRow, type StopDetail } from './ChangesClient'

export const metadata = { title: 'Change Requests — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ filter?: string }> }

export default async function ChangesPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const filter: 'pending' | 'all' | 'history' =
    sp.filter === 'all' ? 'all' :
    sp.filter === 'history' ? 'history' :
    'pending'

  const sb = createAdminClient()
  let rows: ChangeRequestRow[] = []
  let loadErr: string | null = null

  // Two-step query so we never lose the request rows because a foreign
  // key join errors out. First pull change_requests by themselves, then
  // fetch stop/route/driver names in batched IN queries.
  try {
    let q = sb.from('circulation_change_requests')
      .select('id, type, status, stop_id, route_id, driver_id, field_name, old_value, new_value, notes, admin_note, proposed_changes, created_at, reviewed_at')
      .eq('market', dbKey)
      .limit(200)
    if (filter === 'pending') {
      q = q.eq('status', 'pending').order('created_at', { ascending: false })
    } else if (filter === 'history') {
      q = q.in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false, nullsFirst: false })
    } else {
      q = q.order('created_at', { ascending: false })
    }
    const { data, error } = await q
    if (error) throw error

    const baseRows = (data ?? []) as Array<Omit<ChangeRequestRow, 'stop_name' | 'route_name' | 'driver_name'>>

    // Batch-fetch names — only run each roundtrip if the ids exist.
    const stopIds   = Array.from(new Set(baseRows.map(r => r.stop_id).filter(Boolean) as string[]))
    const routeIds  = Array.from(new Set(baseRows.map(r => r.route_id).filter(Boolean) as string[]))
    const driverIds = Array.from(new Set(baseRows.map(r => r.driver_id).filter(Boolean) as string[]))

    // Fetch full stop details (not just name) so the reviewer can see the
    // current address + quantities and edit them inline without leaving
    // the page.
    const [stopDetails, routeNames, driverNames] = await Promise.all([
      stopIds.length   > 0 ? sb.from('circulation_stops').select('id, name, address, city, zip, notes, quantities, contact_name, contact_phone, contact_email, active, not_delivering, not_delivering_note').in('id', stopIds)
        : Promise.resolve({ data: [] as Array<StopDetail> }),
      routeIds.length  > 0 ? sb.from('circulation_routes').select('id, name').in('id', routeIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      driverIds.length > 0 ? sb.from('circulation_drivers').select('user_id, full_name').in('user_id', driverIds)
        : Promise.resolve({ data: [] as Array<{ user_id: string; full_name: string }> }),
    ])
    const stopMap   = new Map(((stopDetails.data ?? []) as StopDetail[]).map(x => [x.id, x]))
    const routeMap  = new Map(((routeNames.data  ?? []) as Array<{ id: string; name: string }>).map(x => [x.id, x.name]))
    const driverMap = new Map(((driverNames.data ?? []) as Array<{ user_id: string; full_name: string }>).map(x => [x.user_id, x.full_name]))

    rows = baseRows.map(r => {
      const stop = r.stop_id ? stopMap.get(r.stop_id) ?? null : null
      return {
        ...r,
        stop_name:    stop?.name ?? null,
        stop_details: stop,
        route_name:   r.route_id  ? routeMap.get(r.route_id)   ?? '(route)' : '(route)',
        driver_name:  r.driver_id ? driverMap.get(r.driver_id) ?? '(driver)': '(driver)',
      }
    })
  } catch (e) {
    // Surface the error to the UI instead of silently returning zero rows —
    // that hid a badge/list mismatch for a full afternoon. PostgrestError
    // objects aren't Error instances so guard for the {message, code, hint,
    // details} shape too.
    if (e instanceof Error) {
      loadErr = e.message
    } else if (e && typeof e === 'object') {
      const err = e as { message?: string; code?: string; details?: string; hint?: string }
      loadErr = [err.message, err.code && `(${err.code})`, err.details, err.hint].filter(Boolean).join(' — ') || JSON.stringify(e)
    } else {
      loadErr = String(e)
    }
  }

  return <ChangesClient filter={filter} rows={rows} loadErr={loadErr} />
}
