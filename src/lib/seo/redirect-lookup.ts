// ── Redirect lookup — middleware hot path ───────────────────────────────────
//
// Called from src/proxy.ts on every public-site request. Hits an
// in-memory cache first (5-minute TTL), falls through to Supabase only
// on miss. Increments hits + last_hit_at via fire-and-forget UPDATE so
// the editor can see which redirects are actually being followed.

import { createClient } from '@supabase/supabase-js'

interface RedirectMatch {
  from_path:   string
  to_path:     string
  status_code: number
  id:          string
}

const TTL_MS  = 5 * 60 * 1000   // 5 min — long enough to be useful, short enough that admin edits land within a few min
const cache   = new Map<string, { match: RedirectMatch | null; expires: number }>()

function getSb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/** Returns a redirect for the given path + brand, or null. Cache + hit
 *  count maintenance handled internally. */
export async function lookupRedirect(
  path: string,
  brandSlug: string | null,
): Promise<RedirectMatch | null> {
  const key = `${brandSlug ?? '*'}:${path.toLowerCase()}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.match

  const sb = getSb()
  // brand_slug = null means "applies to all brands". When a brand-
  // specific row exists AND a global row exists, the brand-specific
  // one wins.
  const { data } = await sb
    .from('redirects')
    .select('id, from_path, to_path, status_code, brand_slug, hits')
    .or(`brand_slug.eq.${brandSlug ?? ''},brand_slug.is.null`)
    .eq('is_active', true)
    .ilike('from_path', path)
    .order('brand_slug', { ascending: false, nullsFirst: false })
    .limit(1)

  const row = data && data[0] as Record<string, unknown> | undefined
  const match = row ? {
    id:          row.id          as string,
    from_path:   row.from_path   as string,
    to_path:     row.to_path     as string,
    status_code: row.status_code as number,
  } : null

  cache.set(key, { match, expires: Date.now() + TTL_MS })

  if (match && row) {
    // Fire-and-forget hit count bump. We don't await — this must not
    // delay the redirect response. Best-effort.
    void sb.from('redirects').update({
      hits:        ((row.hits as number | null) ?? 0) + 1,
      last_hit_at: new Date().toISOString(),
    }).eq('id', match.id).then(() => null, () => null)
  }

  return match
}

/** Burn the cache. Called by the redirect-CRUD API after a write so the
 *  next request reflects the edit without waiting for TTL. */
export function invalidateRedirectCache() {
  cache.clear()
}
