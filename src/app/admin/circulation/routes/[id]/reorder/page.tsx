// /admin/circulation/routes/[id]/reorder — drag-drop reorder UI for a
// single route, plus driver suggestion approval + snapshot restore.

import Link from 'next/link'
import { ArrowLeft, GripVertical } from 'lucide-react'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReorderEditor, type StopMini, type Snapshot, type DriverSuggestion } from './ReorderEditor'

export const metadata = { title: 'Reorder route — Distribution' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function ReorderPage({ params }: PageProps) {
  const { id } = await params
  await requireAdmin()
  const sb = createAdminClient()

  const { data: route } = await sb.from('circulation_routes').select('id, name').eq('id', id).maybeSingle()
  if (!route) notFound()

  const [stopsRes, snapRes, sugRes] = await Promise.all([
    sb.from('circulation_stops')
      .select('id, name, address, city, sort_order, is_pickup')
      .eq('route_id', id)
      .order('sort_order'),
    sb.from('circulation_route_snapshots')
      .select('id, label, created_at')
      .eq('route_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('circulation_route_suggestions')
      .select('id, driver_id, suggestion, created_at, circulation_drivers(full_name)')
      .eq('route_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])
  const stops      = (stopsRes.data ?? []) as StopMini[]
  const snapshots  = (snapRes.data  ?? []) as Snapshot[]
  type SugApi = { id: string; driver_id: string; suggestion: string[]; created_at: string; circulation_drivers?: { full_name: string } | { full_name: string }[] | null }
  const suggestions = ((sugRes.data ?? []) as unknown as SugApi[]).map(s => {
    const drv = Array.isArray(s.circulation_drivers) ? s.circulation_drivers[0] : s.circulation_drivers
    return {
      id:           s.id,
      driver_id:    s.driver_id,
      suggestion:   s.suggestion,
      driver_name:  drv?.full_name ?? '(driver)',
      created_at:   s.created_at,
    }
  }) as DriverSuggestion[]

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href={`/admin/circulation/routes/${id}`} className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> {route.name}
          </Link>
          <div className="flex items-center gap-2">
            <GripVertical size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Reorder stops</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Drag stops to rearrange. Saving snapshots the previous order so you can restore.</p>
        </div>

        <ReorderEditor routeId={id} initialStops={stops} snapshots={snapshots} suggestions={suggestions} />
      </div>
    </div>
  )
}
