// Reads the nav_visibility table and caches the result for 30 seconds.
// Used by both the server-rendered PublicFooter (calls directly) and
// by the client-side Navigation (via /api/site/nav-visibility).

import { createClient } from '@supabase/supabase-js'

interface CacheShape {
  keys:    Set<string>
  expires: number
}

let cache: CacheShape | null = null

export async function getHiddenNavKeys(): Promise<Set<string>> {
  const now = Date.now()
  if (cache && now < cache.expires) return cache.keys

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { auth: { persistSession: false } },
    )
    const { data, error } = await sb
      .from('nav_visibility')
      .select('key')
      .eq('hidden', true)
    if (error) throw error
    const keys = new Set((data ?? []).map(r => r.key as string))
    cache = { keys, expires: now + 30_000 }
    return keys
  } catch {
    // Table missing or DB unreachable — fail open (show everything).
    cache = { keys: new Set(), expires: now + 30_000 }
    return cache.keys
  }
}

/** Force the next read to bypass the cache. Called by the admin POST
 *  route so toggle changes show up on the next render. */
export function invalidateHiddenNavCache(): void {
  cache = null
}
