// /distribution/[market]/driver/stops?route=<id>
//
// Stops browser — the "Stops" tile on the driver dashboard opens this
// page. Shows every stop on the driver's assigned route (independent of
// any active delivery run) so the driver can:
//   - See what stops are on their route
//   - Tap any stop for address + directions + performance history
//   - Report a change request (closed / wrong address / etc) without
//     needing to be in a live delivery
//
// Auth: driver must be assigned to the route.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS } from '@/lib/markets'
import { StopsBrowserClient } from './StopsBrowserClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

export default async function DriverStopsPage({ params, searchParams }: PageProps) {
  const { market } = await params
  const sp = await searchParams
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/distribution/${market}/driver`)

  const admin = createAdminClient()
  const { data: driverRow } = await admin
    .from('circulation_drivers')
    .select('user_id, full_name, active')
    .eq('user_id', user.id)
    .eq('market', market)
    .maybeSingle()
  if (!driverRow || !(driverRow as { active: boolean }).active) {
    redirect(`/distribution/${market}/driver/dashboard`)
  }
  const driver = driverRow as { user_id: string; full_name: string; active: boolean }

  const routeId = sp.route?.trim()
  if (!routeId) redirect(`/distribution/${market}/driver/dashboard`)

  // Verify assignment
  const { data: assign } = await admin
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', user.id)
    .eq('route_id', routeId)
    .maybeSingle()
  if (!assign) redirect(`/distribution/${market}/driver/dashboard`)

  const { data: route } = await admin
    .from('circulation_routes')
    .select('id, name')
    .eq('market', market)
    .eq('id', routeId)
    .maybeSingle()
  if (!route) notFound()

  // Every active stop on the route, sorted pickup-first then by sort_order.
  const { data: stopsData } = await admin
    .from('circulation_stops')
    .select('id, sort_order, name, address, city, zip, quantities, notes, is_pickup, not_delivering, not_delivering_note, is_advertiser')
    .eq('market', market)
    .eq('route_id', routeId)
    .eq('active', true)
    .order('is_pickup', { ascending: false })
    .order('sort_order')

  type StopRow = {
    id: string; sort_order: number; name: string;
    address: string | null; city: string | null; zip: string | null;
    quantities: Record<string, number> | null;
    notes: string | null;
    is_pickup: boolean; not_delivering: boolean;
    not_delivering_note: string | null;
    is_advertiser: boolean;
  }
  const stops = (stopsData ?? []) as StopRow[]

  return (
    <StopsBrowserClient
      market={market}
      driverName={driver.full_name}
      route={{ id: (route as { id: string; name: string }).id, name: (route as { id: string; name: string }).name }}
      stops={stops}
    />
  )
}
