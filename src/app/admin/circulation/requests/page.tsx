// /admin/circulation/requests — public location requests inbox.

import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { LocationRequestsEditor, type LocationRequest } from './LocationRequestsEditor'

export const metadata = { title: 'Location Requests — Distribution' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ status?: string }> }

export default async function LocationRequestsPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const status = sp.status?.trim() || 'pending'
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug

  const sb = createAdminClient()
  let requests: LocationRequest[] = []
  try {
    const { data } = await sb
      .from('circulation_location_requests')
      .select('*')
      .eq('market', dbKey)
      .eq('status', status)
      .order('created_at', { ascending: false })
    requests = (data ?? []) as LocationRequest[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Location Requests</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Submitted via <code className="bg-gray-100 px-1 rounded">/distribution/{dbKey}/request</code>
          </p>
        </div>

        <LocationRequestsEditor initial={requests} activeStatus={status} />
      </div>
    </div>
  )
}
