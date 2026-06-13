// /admin/circulation/publications — Publications.
//
// Port of admin/publications.php from the v3_FINAL portal source. Card
// grid of all publications with brand color left-border + Edit /
// Activate-Deactivate inline actions. New/Edit modal opened from the
// page-header '+ Add publication' button.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PublicationsClient, type PubRow } from './PublicationsClient'

export const metadata = { title: 'Publications — Distribution Portal' }
export const dynamic  = 'force-dynamic'

export default async function PublicationsPage() {
  await requireAdmin()
  const sb = createAdminClient()
  let pubs: PubRow[] = []
  try {
    const { data } = await sb.from('circulation_publications')
      .select('id, short_name, name, abbrev, color_hex, print_total, holdback, sort_order, active, website, issuu_url, logo_path')
      .order('sort_order')
    pubs = (data ?? []) as PubRow[]
  } catch { /* table missing */ }

  return <PublicationsClient pubs={pubs} />
}
