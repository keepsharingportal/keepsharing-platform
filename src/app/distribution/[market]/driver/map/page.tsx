// /distribution/[market]/driver/map — Verbatim port of v3 driver/map.php.
//
// Requires ?route=<id>. Renders that route's stops on a full-screen
// Google Map with the v3 marker vocabulary (pickup / delivery-numbered /
// paused) and a legend in the bottom-left corner. No route filter —
// map.php shows one route at a time, matching v3.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { DriverMapClient, type DriverMapStop } from './DriverMapClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

export default async function DriverMapPage({ params, searchParams }: PageProps) {
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
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: 20, textAlign: 'center' }}>
        <p>You don&apos;t have driver access for {marketDisplayName(market)}.</p>
      </div>
    )
  }

  const routeId = sp.route?.trim()
  if (!routeId) redirect(`/distribution/${market}/driver/dashboard`)

  // Verify the driver is assigned to this route (skip for admins/editors,
  // matching v3 map.php lines 12-17).
  const { data: assignRow } = await admin
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', user.id)
    .eq('route_id', routeId)
    .maybeSingle()
  if (!assignRow) redirect(`/distribution/${market}/driver/dashboard`)

  const { data: route } = await admin
    .from('circulation_routes')
    .select('id, name')
    .eq('market', market)
    .eq('id', routeId)
    .eq('active', true)
    .maybeSingle()
  if (!route) redirect(`/distribution/${market}/driver/dashboard`)

  const { data: stopsData } = await admin
    .from('circulation_stops')
    .select('id, route_id, name, address, city, zip, lat, lng, sort_order, is_pickup, not_delivering, notes')
    .eq('market', market)
    .eq('route_id', routeId)
    .eq('active', true)
    .order('is_pickup', { ascending: false })
    .order('sort_order')

  const stops = ((stopsData ?? []) as Array<{
    id: string; route_id: string; name: string; address: string | null; city: string | null;
    zip: string | null; lat: number | null; lng: number | null; sort_order: number;
    is_pickup: boolean; not_delivering: boolean; notes: string | null;
  }>).map(s => ({ ...s, zip: s.zip }) as DriverMapStop)

  return (
    <DriverMapClient
      stops={stops}
      routeName={(route as { name: string }).name}
      market={market}
    />
  )
}
