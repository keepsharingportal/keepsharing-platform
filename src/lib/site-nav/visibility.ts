// Reads the nav_visibility table and caches the result for 30 seconds.
// Now returns the FULL override map (hidden flags + label/href overrides
// + new-tab toggles + admin-added custom items), not just a Set of
// hidden keys. Used by both the server-rendered PublicFooter and by the
// client-side Navigation (via /api/site/nav-visibility).

import { createClient } from '@supabase/supabase-js'
import type { NavItem, NavItemOverride, OverrideMap } from './items'

export interface NavRenderData {
  /** Overrides keyed by nav item key (catalog or custom). */
  overrides: OverrideMap
  /** Custom items added by admins. Each carries its parentKey + label
   *  + href and gets rendered alongside the code-catalog. */
  customs:   NavItem[]
}

interface CacheShape {
  data:    NavRenderData
  expires: number
}

let cache: CacheShape | null = null

interface NavVisibilityRow {
  key:              string
  hidden:           boolean
  label_override:   string | null
  href_override:    string | null
  open_in_new_tab:  boolean
  is_custom:        boolean
  parent_key:       string | null
  sort_order:       number | null
}

export async function getNavRenderData(): Promise<NavRenderData> {
  const now = Date.now()
  if (cache && now < cache.expires) return cache.data

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { auth: { persistSession: false } },
    )
    const { data, error } = await sb
      .from('nav_visibility')
      .select('key, hidden, label_override, href_override, open_in_new_tab, is_custom, parent_key, sort_order')
    if (error) throw error

    const overrides: OverrideMap = new Map()
    const customs:   NavItem[]   = []
    for (const r of (data ?? []) as NavVisibilityRow[]) {
      const ov: NavItemOverride = {
        hidden:        r.hidden,
        labelOverride: r.label_override,
        hrefOverride:  r.href_override,
        openInNewTab:  r.open_in_new_tab,
        isCustom:      r.is_custom,
        parentKey:     r.parent_key,
        sortOrder:     r.sort_order,
      }
      overrides.set(r.key, ov)

      // Custom items contribute to the customs[] list — they don't have
      // a catalog counterpart, so renderers iterate over them after the
      // catalog. Only items with both a label and an href are usable.
      if (r.is_custom && r.label_override && r.href_override) {
        customs.push({
          key:       r.key,
          label:     r.label_override,
          href:      r.href_override,
          parentKey: r.parent_key ?? undefined,
          // Detect external URLs so target="_blank" / external icon
          // logic can fire automatically without a separate flag.
          external:  /^https?:\/\//i.test(r.href_override),
        })
      }
    }

    const result: NavRenderData = { overrides, customs }
    cache = { data: result, expires: now + 30_000 }
    return result
  } catch {
    // Table missing or DB unreachable — fail open (show everything).
    const empty: NavRenderData = { overrides: new Map(), customs: [] }
    cache = { data: empty, expires: now + 30_000 }
    return empty
  }
}

/** Back-compat: many callers still want just the hidden-keys Set.
 *  Wraps getNavRenderData. */
export async function getHiddenNavKeys(): Promise<Set<string>> {
  const { overrides } = await getNavRenderData()
  const set = new Set<string>()
  for (const [key, ov] of overrides) {
    if (ov.hidden) set.add(key)
  }
  return set
}

/** Force the next read to bypass the cache. Called by the admin POST
 *  route so toggle / rename / add changes show up immediately. */
export function invalidateHiddenNavCache(): void {
  cache = null
}
