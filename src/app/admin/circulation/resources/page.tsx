// /admin/circulation/resources — Resources directory.
//
// Port of admin/resources.php from the v3_FINAL portal source. Tables
// grouped by category, each row with Edit + Hide/Show actions. Add/Edit
// modal opens from the page header.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { ResourcesClient, type ResourceRow } from './ResourcesClient'

export const metadata = { title: 'Resources Directory — Distribution Portal' }
export const dynamic  = 'force-dynamic'

export default async function ResourcesPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let resources: ResourceRow[] = []
  try {
    const { data } = await sb.from('circulation_resources')
      .select('id, name, category, description, address, city, phone, email, website, active, sort_order, logo_path, photo_path')
      .eq('market', dbKey)
      .order('active', { ascending: false })
      .order('category')
      .order('sort_order')
      .order('name')
    resources = (data ?? []) as ResourceRow[]
  } catch { /* table missing */ }

  return <ResourcesClient resources={resources} />
}
