// /admin/circulation/settings — Settings.
//
// Port of admin/settings.php from the v3_FINAL portal source. Typed form
// grouped into General / Delivery & Archive / Public map taglines /
// Pickup request form text. Quick links card below.

import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { publicMapUrl, publicRequestUrl } from '@/lib/markets'
import { SettingsClient } from './SettingsClient'

export const metadata = { title: 'Settings — Distribution Portal' }
export const dynamic  = 'force-dynamic'

export default async function SettingsPage() {
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const sb     = createAdminClient()

  let settings: Record<string, string> = {}
  try {
    const { data } = await sb.from('circulation_settings').select('key, value').eq('market', dbKey)
    for (const r of (data ?? []) as Array<{ key: string; value: string }>) {
      settings[r.key] = r.value
    }
  } catch { /* table missing */ }

  // Build public-map links from the brands/publications visible in this
  // market. Use absolute URLs pointing at the brand's public host so the
  // link opens on the reader-facing domain (riverregionparents.com etc)
  // instead of the admin host (which the proxy rewrites to /admin/...).
  const publicMapLinks = region.publications.map(p => ({
    label: `${p.toUpperCase()} public map`,
    href:  publicMapUrl(p),
  }))

  return (
    <SettingsClient
      market={dbKey}
      initial={settings}
      publicMapLinks={publicMapLinks}
      requestFormUrl={publicRequestUrl(region.publications[0] ?? dbKey)}
    />
  )
}
