/**
 * GoHighLevel Social Planner — push posts into the publication's GHL
 * social-media-posting queue. Reuses the same sub-account PIT pattern
 * as src/lib/ghl.ts; one PIT per brand.
 *
 * Required PIT scope: `social-media-posting.write` (verify with
 * checkSocialPlannerScope before bulk operations — emits a clear error
 * instead of silently failing).
 *
 * GHL v2.1 (2021-07-28) endpoints:
 *   GET    /social-media-posting/{locationId}/accounts
 *   POST   /social-media-posting/{locationId}/posts
 *   PUT    /social-media-posting/{locationId}/posts/{id}
 *   DELETE /social-media-posting/{locationId}/posts/{id}
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

const SLUG_TO_LOC_ENV: Record<string, string> = {
  rrp:      'GHL_LOCATION_ID_RRP',
  rr50plus: 'GHL_LOCATION_ID_RR50PLUS',
  boom:     'GHL_LOCATION_ID_BOOM',
  rrb:      'GHL_LOCATION_ID_BOOM',
  aop:      'GHL_LOCATION_ID_AOP',
  mbp:      'GHL_LOCATION_ID_MBP',
  esp:      'GHL_LOCATION_ID_ESP',
  gpp:      'GHL_LOCATION_ID_GPP',
}
const SLUG_TO_PIT_ENV: Record<string, string> = {
  rrp:      'GHL_PIT_RRP',
  rr50plus: 'GHL_PIT_RR50PLUS',
  boom:     'GHL_PIT_BOOM',
  rrb:      'GHL_PIT_BOOM',
  aop:      'GHL_PIT_AOP',
  mbp:      'GHL_PIT_MBP',
  esp:      'GHL_PIT_ESP',
  gpp:      'GHL_PIT_GPP',
}

function locId(slug: string): string | null {
  const env = SLUG_TO_LOC_ENV[slug.toLowerCase()]
  return env ? (process.env[env] ?? null) : null
}
function pit(slug: string): string | null {
  const env = SLUG_TO_PIT_ENV[slug.toLowerCase()]
  return env ? (process.env[env] ?? null) : null
}

async function ghlReq(
  path:   string,
  slug:   string,
  init:   { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown },
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const token = pit(slug)
  if (!token) return { ok: false, status: 0, data: { error: `No PIT for ${slug}` } }
  const res = await fetch(`${GHL_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization:  `Bearer ${token}`,
      Version:        GHL_VERSION,
      Accept:         'application/json',
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

// ── Public API ────────────────────────────────────────────────────

export interface SocialAccount {
  id:           string
  name:         string
  platform:     'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' | 'gbp' | 'threads' | 'bluesky' | 'unknown'
  profileImage?: string
  active:       boolean
}

/**
 * List the social accounts connected to this brand's GHL sub-account.
 * Use this to map our 'facebook'/'instagram' platform strings to GHL's
 * accountIds before posting.
 */
export async function listSocialAccounts(brandSlug: string): Promise<{
  ok: boolean; accounts: SocialAccount[]; error?: string
}> {
  const loc = locId(brandSlug)
  if (!loc) return { ok: false, accounts: [], error: `No locationId for ${brandSlug}` }
  const r = await ghlReq(
    `/social-media-posting/${loc}/accounts`,
    brandSlug,
    { method: 'GET' },
  )
  if (!r.ok) {
    const errMsg = (r.data as { message?: string })?.message ?? `HTTP ${r.status}`
    return { ok: false, accounts: [], error: errMsg }
  }
  // GHL returns one of several shapes depending on version:
  //   { accounts: [...] }    | { results: [...] }
  //   { data: [...] }        | [...] directly
  // Be paranoid: walk known paths and only proceed if we land on an array.
  const payload   = r.data as Record<string, unknown> | unknown[] | null
  const candidate = Array.isArray(payload) ? payload
                  : (payload as { accounts?: unknown[] })?.accounts
                  ?? (payload as { results?:  unknown[] })?.results
                  ?? (payload as { data?:     unknown[] })?.data
                  ?? []
  const raw = Array.isArray(candidate) ? candidate : []
  const accounts: SocialAccount[] = (raw as Array<Record<string, unknown>>).map(a => ({
    id:           String(a.id ?? a._id ?? ''),
    name:         String(a.name ?? a.displayName ?? a.platformAccountName ?? ''),
    platform:     normalizePlatform(String(a.platform ?? a.type ?? '')),
    profileImage: a.profilePicture as string | undefined,
    active:       (a.active ?? a.isActive ?? true) as boolean,
  })).filter(a => a.id)
  return { ok: true, accounts }
}

function normalizePlatform(raw: string): SocialAccount['platform'] {
  const s = raw.toLowerCase()
  if (s.includes('facebook'))  return 'facebook'
  if (s.includes('instagram')) return 'instagram'
  if (s.includes('twitter') || s === 'x') return 'twitter'
  if (s.includes('linkedin'))  return 'linkedin'
  if (s.includes('tiktok'))    return 'tiktok'
  if (s.includes('youtube'))   return 'youtube'
  if (s.includes('pinterest')) return 'pinterest'
  if (s.includes('google') || s.includes('gmb') || s.includes('gbp')) return 'gbp'
  if (s.includes('threads'))   return 'threads'
  if (s.includes('bluesky'))   return 'bluesky'
  return 'unknown'
}

export interface CreatePostInput {
  brandSlug:    string
  accountIds:   string[]                    // GHL account IDs (from listSocialAccounts)
  caption:      string
  imageUrl?:    string | null               // optional media
  link?:        string | null               // link to attach (FB / X / LinkedIn)
  scheduleDate?: string                     // ISO8601; omit for immediate
  type?:        'post' | 'reel' | 'story'   // default 'post'
}

export interface CreatePostResult {
  ok:        boolean
  postId?:   string
  error?:    string
  status?:   number
}

/**
 * Create a scheduled (or immediate) social post via GHL Social Planner.
 * Use scheduleDate = undefined for immediate send.
 */
export async function createSocialPost(input: CreatePostInput): Promise<CreatePostResult> {
  const loc = locId(input.brandSlug)
  if (!loc) return { ok: false, error: `No locationId for ${input.brandSlug}` }
  if (input.accountIds.length === 0) return { ok: false, error: 'accountIds required' }

  const body: Record<string, unknown> = {
    accountIds: input.accountIds,
    summary:    input.caption,
    type:       input.type ?? 'post',
  }
  if (input.imageUrl)     body.media = [{ url: input.imageUrl }]
  if (input.link)         body.link  = input.link
  if (input.scheduleDate) body.scheduleDate = input.scheduleDate

  const r = await ghlReq(
    `/social-media-posting/${loc}/posts`,
    input.brandSlug,
    { method: 'POST', body },
  )
  if (!r.ok) {
    const errMsg = (r.data as { message?: string })?.message ?? `HTTP ${r.status}`
    return { ok: false, error: errMsg, status: r.status }
  }
  const id = (r.data as { id?: string; _id?: string; postId?: string })?.id
         ?? (r.data as { _id?: string })?._id
         ?? (r.data as { postId?: string })?.postId
  return { ok: true, postId: id, status: r.status }
}

/**
 * Delete a scheduled GHL Social Planner post (e.g. when editor rejects
 * a slot post-approval).
 */
export async function deleteSocialPost(brandSlug: string, postId: string): Promise<{ ok: boolean; error?: string }> {
  const loc = locId(brandSlug)
  if (!loc) return { ok: false, error: `No locationId for ${brandSlug}` }
  const r = await ghlReq(
    `/social-media-posting/${loc}/posts/${postId}`,
    brandSlug,
    { method: 'DELETE' },
  )
  if (!r.ok) {
    const errMsg = (r.data as { message?: string })?.message ?? `HTTP ${r.status}`
    return { ok: false, error: errMsg }
  }
  return { ok: true }
}

/**
 * Pre-flight check before bulk operations: does the brand's PIT have the
 * social-media-posting scope, and are accounts connected? Returns a
 * concrete error message editors can act on.
 */
export async function checkSocialPlannerScope(brandSlug: string): Promise<{
  /** True when PIT authenticates AND at least one account is connected — i.e. fully ready to post. */
  ok:           boolean
  /** True when PIT env vars exist and the API call succeeded. Independent of whether accounts are connected. */
  scopeOk:      boolean
  accountCount: number
  platforms:    string[]
  error?:       string
}> {
  if (!pit(brandSlug))   return { ok: false, scopeOk: false, accountCount: 0, platforms: [], error: `Missing GHL_PIT_${brandSlug.toUpperCase()} env var` }
  if (!locId(brandSlug)) return { ok: false, scopeOk: false, accountCount: 0, platforms: [], error: `Missing GHL_LOCATION_ID_${brandSlug.toUpperCase()} env var` }

  const { ok, accounts, error } = await listSocialAccounts(brandSlug)
  if (!ok) {
    const isScope = (error ?? '').toLowerCase().includes('scope') || (error ?? '').toLowerCase().includes('unauthorized')
    return {
      ok:           false,
      scopeOk:      false,
      accountCount: 0,
      platforms:    [],
      error:        isScope
        ? `PIT for ${brandSlug} is missing the social-media-posting scope. Regenerate it in GHL with that scope checked.`
        : error,
    }
  }
  // PIT authenticated successfully. ok=ready-to-post requires at least one
  // connected account; scopeOk=PIT itself is fine. The page uses scopeOk to
  // categorize "no accounts" separately from "PIT broken."
  return {
    ok:           accounts.length > 0,
    scopeOk:      true,
    accountCount: accounts.length,
    platforms:    Array.from(new Set(accounts.map(a => a.platform))),
    error:        accounts.length === 0 ? 'PIT works but no social accounts connected in GHL for this brand.' : undefined,
  }
}
