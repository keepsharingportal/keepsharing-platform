// /distribution/[market]/driver/reorder — driver suggests a new route order.
//
// Port of driver/reorder.php from the v3_FINAL portal source. Drag-list
// of stops + optional note + submit. POSTs to the existing
// /api/circulation/driver { action: 'suggest-route-order', route_id,
// stop_order: [...] }. Admin reviews at /admin/circulation/route-suggestions/[id].

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS } from '@/lib/markets'
import { DriverReorderClient } from './DriverReorderClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

export default async function DriverReorderPage({ params, searchParams }: PageProps) {
  const { market } = await params
  const sp = await searchParams
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/distribution/${market}/driver`)

  const admin = createAdminClient()
  const { data: driver } = await admin
    .from('circulation_drivers')
    .select('user_id, full_name, active')
    .eq('user_id', user.id)
    .eq('market', market)
    .maybeSingle()
  if (!driver || !(driver as { active: boolean }).active) {
    redirect(`/distribution/${market}/driver/dashboard`)
  }

  const routeId = sp.route?.trim()
  if (!routeId) redirect(`/distribution/${market}/driver/dashboard`)

  // Verify driver is assigned
  const { data: assign } = await admin
    .from('circulation_driver_routes')
    .select('route_id')
    .eq('driver_id', user.id)
    .eq('route_id', routeId!)
    .maybeSingle()
  if (!assign) redirect(`/distribution/${market}/driver/dashboard`)

  const { data: route } = await admin
    .from('circulation_routes')
    .select('id, name')
    .eq('market', market)
    .eq('id', routeId!)
    .maybeSingle()
  if (!route) notFound()

  const { data: stopsData } = await admin
    .from('circulation_stops')
    .select('id, sort_order, name, address, city, is_pickup, not_delivering')
    .eq('market', market)
    .eq('route_id', routeId!)
    .eq('active', true)
    .order('is_pickup', { ascending: false })
    .order('sort_order')
    .order('name')
  type StopLite = { id: string; sort_order: number; name: string; address: string | null; city: string | null; is_pickup: boolean; not_delivering: boolean }
  const stops = (stopsData ?? []) as StopLite[]
  const pickup    = stops.find(s => s.is_pickup) ?? null
  const draggable = stops.filter(s => !s.is_pickup && !s.not_delivering)

  // Existing pending suggestion?
  const { data: pendingRow } = await admin
    .from('circulation_route_suggestions')
    .select('id, note, created_at')
    .eq('route_id', routeId!)
    .eq('driver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Suggest route order</h1>
          <div className="text-muted text-sm">{(route as { name: string }).name}</div>
        </div>
        <div className="ph-actions">
          <Link href={`/distribution/${market}/driver/dashboard`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        {pendingRow && (
          <div className="alert alert-warning mb-4">
            <strong>⏳ Suggestion pending approval</strong> — submitted{' '}
            {new Date((pendingRow as { created_at: string }).created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
            You can submit a new suggestion below to replace it.
            {(pendingRow as { note: string | null }).note && (
              <><br /><em>&ldquo;{(pendingRow as { note: string }).note}&rdquo;</em></>
            )}
          </div>
        )}

        <DriverReorderClient
          routeId={routeId!}
          market={market}
          pickup={pickup}
          draggable={draggable}
        />
      </div>
    </div>
  )
}
