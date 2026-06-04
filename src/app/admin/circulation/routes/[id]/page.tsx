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

  const { data: stops } = await sb
    .from('circulation_stops')
    .select('*')
    .eq('route_id', id)
    .order('sort_order', { ascending: true })

  const initialStops = (stops ?? []) as Stop[]

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1100px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation/routes" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Routes
          </Link>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{route.name}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
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
