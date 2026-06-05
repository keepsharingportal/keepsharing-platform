// /admin/circulation/changes — driver-flagged change request review.
//
// Drivers tap "Flag" on a stop during delivery (closed, wrong address, wrong
// qty, add a new stop, other) and write a note. Each flag becomes a row in
// circulation_change_requests with status='pending'. Admin reviews here,
// approves (auto-applying simple changes like "close this stop") or rejects.

import Link from 'next/link'
import { ArrowLeft, GitPullRequest } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { ChangeRequestsEditor, type ChangeRequest } from './ChangeRequestsEditor'

export const metadata = { title: 'Change Requests — Distribution' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ status?: string }> }

export default async function ChangeRequestsPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const status = sp.status?.trim() || 'pending'
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug

  const sb = createAdminClient()
  let requests: ChangeRequest[] = []
  try {
    const { data } = await sb
      .from('circulation_change_requests')
      .select(`
        id, market, type, field_name, old_value, new_value, notes, status,
        created_at, reviewed_at, stop_id, route_id, driver_id,
        circulation_stops(name, address, city),
        circulation_routes(name),
        circulation_drivers(full_name, email)
      `)
      .eq('market', dbKey)
      .eq('status', status)
      .order('created_at', { ascending: false })
    requests = (data ?? []) as unknown as ChangeRequest[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <GitPullRequest size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Change Requests</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <ChangeRequestsEditor initial={requests} activeStatus={status} />
      </div>
    </div>
  )
}
