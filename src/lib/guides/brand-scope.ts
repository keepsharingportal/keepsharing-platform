// Brand scoping for the guide system.
//
// guide_configs and guide_listings get a `market` column in migration 232.
// Until that is applied they don't have one, and PostgREST fails a whole
// query on an unknown column — so a page that filtered unconditionally would
// blank every guide on the site between deploy and migration. That window is
// real: Vercel deploys on push, the SQL editor is a human running a script.
//
// So: probe once per request, then each call site applies the filter behind a
// boolean. One cheap extra query, cached across the render, in exchange for a
// deploy that is safe in either order.
//
// Delete the probe once 232 has been applied everywhere and make the filters
// unconditional — it is scaffolding, not architecture.

import 'server-only'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { currentBrandSlug } from '@/lib/current-brand'

/** Does this database have the per-brand guide columns yet? */
export const guidesAreScoped = cache(async (supabase: SupabaseClient): Promise<boolean> => {
  const probe = await supabase.from('guide_listings').select('market').limit(1)
  return !probe.error
})

export interface GuideScope {
  /** The brand to show guides for. 'rrp' when nothing is resolvable. */
  market: string
  /** False on a pre-232 database — call sites must skip the filter. */
  active: boolean
}

/**
 * Resolve the guide scope for this request: which brand, and whether the
 * database can express that yet.
 *
 * Every public guide query should run its market filter through
 * `scope.active && scope.market`, so the same code serves a migrated and an
 * unmigrated database.
 */
export const guideScope = cache(async (supabase: SupabaseClient): Promise<GuideScope> => {
  const [market, active] = await Promise.all([
    currentBrandSlug(),
    guidesAreScoped(supabase),
  ])
  return { market: market ?? 'rrp', active }
})

/**
 * Narrow a guide query to the current brand, in place.
 *
 * Returns the builder it was given, with its type untouched — which is the
 * reason this is a generic pass-through rather than a wrapper that re-exposes
 * `.select()`. supabase-js infers row shapes from the literal select string,
 * so anything that launders the builder through a `(cols: string)` signature
 * collapses every row to GenericStringError and takes the page's type safety
 * with it.
 *
 * Safe to chain inside a Promise.all array:
 *
 *   scoped(sb.from('guide_listings').select('id, category'), scope)
 */
export function scoped<T>(query: T, scope: GuideScope): T {
  if (scope.active) {
    // PostgrestFilterBuilder mutates and returns itself.
    (query as unknown as { eq: (c: string, v: string) => unknown }).eq('market', scope.market)
  }
  return query
}
