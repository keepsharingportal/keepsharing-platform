import 'server-only'
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { currentBrandSlug } from '@/lib/current-brand'
import { guideIsLive } from '@/lib/guides/live'

// Is this guide live for the brand being served?
//
// ── Why this exists ─────────────────────────────────────────────────────────
// guideIsLive() already answers the question, but only the generic guide
// route called it. The Birthday Party Guide has its own eleven-route tree
// (hub, category, sub-category, business, listings, finder, deals, gifts,
// gifts/[age], share-yours, sponsor) and none of those routes consulted it.
//
// The result: Greater Pensacola's /birthday-party-guide was publicly
// reachable while its guide_configs row said is_active = false, which is the
// switch a publisher uses to mean "not launched yet". A guide tree needs one
// gate shared by every route in it, not a check copy-pasted eleven times and
// forgotten on the twelfth.
//
// Put this in the tree's layout.tsx. A layout runs for every route beneath
// it, so a route added later is covered without anyone remembering.

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * True when `guideTypeSlug` should be publicly visible on the current brand.
 *
 * Reads the brand's own guide_configs row (migration 232 made that table
 * per-brand) plus the seasonal window on guide_types. Cached per request, so
 * a layout and the page under it cost one round trip between them.
 *
 * Fails OPEN only when the guide type itself is missing, which means the
 * route should not exist at all and the page's own lookup will 404 anyway.
 * A missing *config* row fails CLOSED: an unconfigured guide on a new brand
 * is an unlaunched guide.
 */
export const guideIsLiveForBrand = cache(async (guideTypeSlug: string): Promise<boolean> => {
  const supabase = sb()
  const market = (await currentBrandSlug()) ?? 'rrp'

  const [{ data: type }, { data: config, error: cfgErr }] = await Promise.all([
    // select('*'): live_from / live_until only exist once migration 230 is
    // applied, and PostgREST fails the whole query on an unknown column.
    supabase.from('guide_types').select('*').eq('slug', guideTypeSlug).maybeSingle(),
    // select('*') for the same reason as guide_types above:
    // live_from / live_until arrive with migration 234, and PostgREST fails
    // the WHOLE query on an unknown column name. Naming them would hide
    // every guide between deploy and migration.
    supabase.from('guide_configs').select('*')
      .eq('guide_type_slug', guideTypeSlug).eq('market', market).maybeSingle(),
  ])

  if (!type) return true

  // Pre-232 database: guide_configs has no market column, so the filter
  // above errors. Fall back to the unscoped row rather than hiding every
  // guide on the site between deploy and migration.
  if (cfgErr) {
    const { data: legacy } = await supabase.from('guide_configs')
      .select('is_active').eq('guide_type_slug', guideTypeSlug).maybeSingle()
    return guideIsLive(type as { live_from?: string | null; live_until?: string | null }, legacy ?? null)
  }

  // No row for this brand = not launched here.
  if (!config) return false

  return guideIsLive(type as { live_from?: string | null; live_until?: string | null }, config)
})
