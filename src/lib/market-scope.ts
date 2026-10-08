// Market scoping for public reads, safe across the migration boundary.
//
// Migration 232 adds `market` to the tables that lacked it. Vercel deploys on
// push; the SQL editor is a human running a script. Between those two moments
// the code is live and the column is not, and PostgREST fails an entire query
// on an unknown column name — so an unconditional filter would blank the ad
// slots, the guide library and the event feed until someone ran the SQL.
//
// So: probe each table once per request, cache it, and let call sites apply
// the filter behind a boolean. One cheap query per table per render buys a
// deploy that is correct in either order.
//
// This is scaffolding. Once 232 is applied everywhere, delete the probe and
// make the filters unconditional.

import 'server-only'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { currentBrandSlug } from './current-brand'

/** Does `table` have a `market` column in this database yet? */
const tableIsScoped = cache(async (supabase: SupabaseClient, table: string): Promise<boolean> => {
  const probe = await supabase.from(table).select('market').limit(1)
  return !probe.error
})

export interface MarketScope {
  /** Brand to read as. 'rrp' when nothing is resolvable. */
  market: string
  /** False on a database that can't express the filter yet. */
  active: boolean
}

/** Scope for one table on this request. */
export const marketScope = cache(async (
  supabase: SupabaseClient,
  table:    string,
): Promise<MarketScope> => {
  const [market, active] = await Promise.all([
    currentBrandSlug(),
    tableIsScoped(supabase, table),
  ])
  return { market: market ?? 'rrp', active }
})

/**
 * Narrow a query to the current brand, in place, returning the same builder
 * with its type untouched.
 *
 * Generic pass-through rather than a wrapper on purpose: supabase-js infers
 * row shapes from the literal select string, and anything that launders the
 * builder through a `(cols: string)` signature collapses every row to
 * GenericStringError and takes the page's type safety with it.
 */
export function scopeToMarket<T>(query: T, scope: MarketScope): T {
  if (scope.active) {
    (query as unknown as { eq: (c: string, v: string) => unknown }).eq('market', scope.market)
  }
  return query
}

/**
 * Same, but for tables where NULL means "every brand" rather than "unscoped" —
 * ad placements (house ads) and trending items (generic links like the
 * community calendar) both work this way.
 */
export function scopeToMarketOrShared<T>(query: T, scope: MarketScope): T {
  if (scope.active) {
    (query as unknown as { or: (f: string) => unknown })
      .or(`market.eq.${scope.market},market.is.null`)
  }
  return query
}
