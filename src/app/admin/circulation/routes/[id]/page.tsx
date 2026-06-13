// /admin/circulation/routes/[id] — stop editor for a single route.
// Lists every stop with inline edit, drag-to-reorder, add-new, and delete.

import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { StopEditor, type Stop } from './StopEditor'

export const metadata = { title: 'Route stops — Distribution' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function RouteStopsPage({ params }: PageProps) {
  const { id } = await params
  await requireAdmin()
  const sb = createAdminClient()

  const { data: route } = await sb
    .from('circulation_routes')
    .select('id, name, city, active, market')
    .eq('id', id)
    .maybeSingle()
  if (!route) notFound()

  // Pull the linked business name alongside so the editor can show a
  // "Linked profile: X" badge per stop. The full edit experience for
  // re-linking lives on /admin/businesses/[id] — this is just the
  // breadcrumb so editors see at a glance which stops are wired up.
  const { data: stops } = await sb
    .from('circulation_stops')
    .select('*, business:businesses!circulation_stops_business_id_fkey(id, name)')
    .eq('route_id', id)
    .order('sort_order', { ascending: true })

  type StopWithBiz = Stop & {
    business_id?: string | null
    business?:    { id: string; name: string } | { id: string; name: string }[] | null
  }
  const initialStops: Stop[] = ((stops ?? []) as unknown as StopWithBiz[]).map(s => {
    const biz = Array.isArray(s.business) ? s.business[0] : s.business
    return {
      ...(s as Stop),
      business_id:   s.business_id ?? null,
      business_name: biz?.name      ?? null,
    } as Stop
  })

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation/routes" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Routes
          </Link>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">{route.name}</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            {route.city ? `${route.city} · ` : ''}{initialStops.length} stops
          </p>
        </div>

        <StopEditor
          routeId={route.id}
          market={route.market}
          initialStops={initialStops}
        />
      </div>
    </div>
  )
}
