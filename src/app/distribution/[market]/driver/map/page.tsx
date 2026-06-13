// /distribution/[market]/driver/map — Full-screen route map (Google).
//
// Port of driver/map.php from the v3_FINAL portal source. Uses the
// shared CirculationMap component (Google Maps, route-colored markers
// + popup info windows). Shows only the driver's assigned routes; if
// ?route=X is set, filters to that one.

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import dynamicImport from 'next/dynamic'

const CirculationMap = dynamicImport(
  () => import('@/components/circulation/CirculationMap').then(m => m.CirculationMap),
  { ssr: false, loading: () => <div style={{ height: 'calc(100vh - 56px)', background: '#F1F5F9' }} /> },
)

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

export default async function DriverMapPage({ params, searchParams }: PageProps) {
  const { market } = await params
  const sp = await searchParams
  const routeFilter = sp.route?.trim() || null
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
  if (!driverRow || !driverRow.active) {
    return (
      <div style={{ maxWidth: 480, margin: '40px auto', padding: 20, textAlign: 'center' }}>
        <p>You don&apos;t have driver access for {marketDisplayName(market)}.</p>
      </div>
    )
  }

  // Assigned route ids
  const { data: assigns } = await admin
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', user.id)
  const routeIds = ((assigns ?? []) as Array<{ route_id: string }>).map(a => a.route_id)
  const filteredIds = routeFilter && routeIds.includes(routeFilter) ? [routeFilter] : routeIds

  const [routesRes, stopsRes] = filteredIds.length === 0
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([
        admin.from('circulation_routes')
          .select('id, name')
          .eq('market', market)
          .in('id', filteredIds)
          .order('sort_order')
          .order('name'),
        admin.from('circulation_stops')
          .select('id, route_id, name, address, city, zip, lat, lng, ad_level, is_advertiser, is_featured, website, instagram, facebook, tiktok, logo_path')
          .eq('market', market)
          .eq('active', true)
          .in('route_id', filteredIds),
      ])

  type RouteLite = { id: string; name: string }
  type StopRow   = { id: string; route_id: string; name: string; address: string | null; city: string | null; zip: string | null; lat: number | null; lng: number | null; ad_level: string | null; is_advertiser: boolean; is_featured: boolean; website: string | null; instagram: string | null; facebook: string | null; tiktok: string | null; logo_path: string | null }
  const routes = (routesRes.data ?? []) as RouteLite[]
  const stops  = (stopsRes.data  ?? []) as StopRow[]

  return (
    <div className="portal-app" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="page-header">
        <div>
          <h1 className="ph-title">Route map</h1>
          <div className="text-muted text-sm">{routes.length} route{routes.length === 1 ? '' : 's'} · {stops.length} stop{stops.length === 1 ? '' : 's'}</div>
        </div>
        <div className="ph-actions">
          <Link href={`/distribution/${market}/driver/dashboard`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> My routes
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <CirculationMap
          stops={stops.map(s => ({ ...s, ad_level: s.ad_level ?? undefined }))}
          routes={routes}
          showSearch={false}
          showFilter={routes.length > 1}
          height="100%"
        />
      </div>
    </div>
  )
}
