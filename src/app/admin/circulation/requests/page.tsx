// /admin/circulation/requests — Location Requests.
//
// Port of admin/requests.php from the v3_FINAL portal source. Card-list
// of public location-request submissions with Approve / Added to route /
// Reject actions. Filter chips toggle pending vs all in the page header.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { RequestsClient, type LocationRequestRow } from './RequestsClient'

export const metadata = { title: 'Location Requests — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ filter?: string }> }

export default async function RequestsPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const filter = sp.filter === 'all' ? 'all' : 'pending'

  const sb = createAdminClient()
  let rows: LocationRequestRow[] = []
  try {
    let q = sb.from('circulation_location_requests')
      .select('id, business_name, address, contact_name, contact_phone, contact_email, publications, notes, status, created_at, reviewed_at')
      .eq('market', dbKey)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter === 'pending') q = q.eq('status', 'pending')
    const { data } = await q
    rows = (data ?? []) as LocationRequestRow[]
  } catch { /* table missing */ }

  return <RequestsClient filter={filter} rows={rows} />
}
