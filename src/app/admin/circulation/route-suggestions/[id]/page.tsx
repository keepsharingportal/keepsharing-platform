// /admin/circulation/route-suggestions/[id] — review a driver's suggested
// route order. Port of admin/route_suggestion.php from v3_FINAL source.
//
// Side-by-side current vs suggested order, with moved positions
// highlighted in amber. Approve = apply + email driver. Decline =
// optional note + email driver.

import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { RouteSuggestionClient } from './RouteSuggestionClient'

export const metadata = { title: 'Route Order Suggestion — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function RouteSuggestionPage({ params }: PageProps) {
  const { id } = await params
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  const { data: sugRow } = await sb
    .from('circulation_route_suggestions')
    .select(`
      id, route_id, driver_id, stop_order, note, status, admin_note,
      created_at, reviewed_at,
      circulation_routes(name),
      circulation_drivers(full_name)
    `)
    .eq('id', id)
    .maybeSingle()
  if (!sugRow) notFound()

  type Joined = typeof sugRow & {
    circulation_routes?:  { name?: string } | { name?: string }[] | null
    circulation_drivers?: { full_name?: string } | { full_name?: string }[] | null
  }
  const j = sugRow as Joined
  const route  = Array.isArray(j.circulation_routes)  ? j.circulation_routes[0]  : j.circulation_routes
  const driver = Array.isArray(j.circulation_drivers) ? j.circulation_drivers[0] : j.circulation_drivers

  const { data: stopsData } = await sb
    .from('circulation_stops')
    .select('id, name, address, city, sort_order')
    .eq('market', dbKey)
    .eq('route_id', j.route_id)
    .eq('active', true)
    .eq('is_pickup', false)
    .eq('not_delivering', false)
    .order('sort_order')
  type StopLite = { id: string; name: string; address: string | null; city: string | null; sort_order: number }
  const currentStops = (stopsData ?? []) as StopLite[]

  // Suggested order is a JSON array of stop_ids.
  let suggestedIds: string[] = []
  try {
    const raw = j.stop_order
    if (typeof raw === 'string') suggestedIds = JSON.parse(raw) ?? []
    else if (Array.isArray(raw)) suggestedIds = raw as string[]
  } catch { suggestedIds = [] }
  const map = new Map(currentStops.map(s => [s.id, s]))
  const suggestedStops = suggestedIds.map(id => map.get(id)).filter((s): s is StopLite => !!s)

  return (
    <RouteSuggestionClient
      suggestionId={j.id}
      driverName={driver?.full_name ?? '(driver)'}
      routeName={route?.name ?? '(route)'}
      status={j.status as 'pending' | 'approved' | 'declined' | 'rejected'}
      note={j.note ?? null}
      adminNote={j.admin_note ?? null}
      createdAt={j.created_at}
      reviewedAt={j.reviewed_at}
      currentStops={currentStops}
      suggestedStops={suggestedStops}
    />
  )
}
