// /admin/circulation/import — dedicated landing for the JSON importer.
//
// Same importer that lives at the bottom of the Dashboard, but surfaced
// as its own sidebar item because it's a discrete operational task
// (matches the PHP portal's Import Stops menu entry).

import Link from 'next/link'
import { ArrowLeft, Upload } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket, publicationLabelsForRegion } from '@/lib/circulation/regions'
import { CirculationImporter } from '../CirculationImporter'

export const metadata = { title: 'Import Stops — Distribution' }
export const dynamic  = 'force-dynamic'

export default async function ImportPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  // Pull current counts so the admin can see what they're about to overwrite.
  let routeCount = 0
  let stopCount  = 0
  try {
    const [rRes, sRes] = await Promise.all([
      sb.from('circulation_routes').select('id', { count: 'exact', head: true }).eq('market', dbKey),
      sb.from('circulation_stops').select('id', { count: 'exact', head: true }).eq('market', dbKey).eq('active', true),
    ])
    routeCount = rRes.count ?? 0
    stopCount  = sRes.count ?? 0
  } catch { /* table missing */ }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[900px] mx-auto space-y-6">

        <div>
          <Link href="/admin/circulation" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
            <ArrowLeft size={11} /> Distribution Portal
          </Link>
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-portal-blue" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Import Stops</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Region: <span className="font-semibold text-portal-text">{region.name}</span>
            <span className="text-portal-muted"> · </span>{publicationLabelsForRegion(region)}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-portal-amber-lt p-3 text-sm text-amber-900">
          <p className="font-bold mb-1">Heads-up — this is a replace, not a merge</p>
          <p className="text-xs">
            Currently in the system: <span className="font-bold">{routeCount} routes</span> · <span className="font-bold">{stopCount} active stops</span>.
            Importing wipes every existing stop in this region and rebuilds from the file. Routes are matched by name (existing routes are kept).
          </p>
        </div>

        <CirculationImporter
          market={dbKey}
          regionName={region.name}
          pubLabels={publicationLabelsForRegion(region)}
        />
      </div>
    </div>
  )
}
