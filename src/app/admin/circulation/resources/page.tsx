// /admin/circulation/resources — community resources directory (libraries,
// parks, family services) shown as a secondary layer on the public map.

import Link from 'next/link'
import { ArrowLeft, Library } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { ResourcesEditor, type Resource } from './ResourcesEditor'

export const metadata = { title: 'Resources — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function ResourcesPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let resources: Resource[] = []
  try {
    const { data } = await sb.from('circulation_resources').select('*').eq('market', dbKey).order('sort_order').order('name')
    resources = (data ?? []) as Resource[]
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Routes
          </Link>
          <div className="flex items-center gap-2">
            <Library size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Community Resources</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Region: <span className="font-semibold text-gray-700">{region.name}</span>
            <span className="text-gray-400"> · </span>{publicationLabelsForRegion(region)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Surfaced on the public map as a secondary layer (libraries, parks, family services).
          </p>
        </div>

        <ResourcesEditor market={dbKey} initial={resources} />
      </div>
    </div>
  )
}
