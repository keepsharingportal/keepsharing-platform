// Meta Marketing API client.
//
// Scope: read-only campaign + insights data for our advertiser report.
// Token: system-user access token with `ads_read` permission only — no
// write/spend scope, principle of least privilege.
//
// We deliberately use the raw fetch surface (not the official SDK) — the
// SDK pulls in a lot of weight for the handful of endpoints we touch,
// and Meta's REST shape is stable enough that a small wrapper is the
// right size.

const META_GRAPH = 'https://graph.facebook.com/v21.0'

export interface FBAdAccount {
  id:             string                // 'act_1234567890'
  account_id:     string                // '1234567890'
  name:           string
  account_status: number                // 1=active, 2=disabled, etc.
  business?:      { id: string; name: string }
}

export interface FBCampaign {
  id:               string
  name:             string
  status:           string               // 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  effective_status: string
  objective:        string
}

export interface FBInsightsRow {
  date_start:         string             // 'YYYY-MM-DD'
  date_stop:          string
  spend?:             string             // returned as string — convert
  impressions?:       string
  reach?:             string
  clicks?:            string
  inline_link_clicks?: string             // outbound clicks specifically
  ctr?:               string             // percentage as string
  cpc?:               string
  cpm?:               string
  frequency?:         string
  actions?:           Array<{ action_type: string; value: string }>
  cost_per_action_type?: Array<{ action_type: string; value: string }>
}

interface MetaErrorBody {
  error?: {
    message?:        string
    type?:           string
    code?:           number
    error_subcode?:  number
    fbtrace_id?:     string
  }
}

export class MetaApiError extends Error {
  code?:        number
  type?:        string
  fbtrace_id?:  string
  constructor(msg: string, extras: { code?: number; type?: string; fbtrace_id?: string } = {}) {
    super(msg)
    this.code       = extras.code
    this.type       = extras.type
    this.fbtrace_id = extras.fbtrace_id
  }
}

// Meta rate-limit error codes. See:
// developers.facebook.com/docs/graph-api/overview/rate-limiting
// 4   = app-level rate limit
// 17  = user-level rate limit ('User request limit reached')
// 32  = page-level rate limit
// 613 = custom-level (ads, batch)
// 80004 = ads-management rate limit
const META_RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004])

function isRateLimit(e: unknown): boolean {
  return e instanceof MetaApiError && !!e.code && META_RATE_LIMIT_CODES.has(e.code)
}

async function metaFetchOnce<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const url = new URL(`${META_GRAPH}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    // Server-only — no caching, we want fresh data.
    cache: 'no-store',
  })

  // Meta returns JSON for both success and error. Status code is unreliable
  // on rate-limit responses (some come back 200 with an error body), so
  // always parse and check.
  const body = await res.json().catch(() => ({})) as MetaErrorBody & Record<string, unknown>
  if (!res.ok || body.error) {
    const e = body.error ?? { message: `HTTP ${res.status}` }
    throw new MetaApiError(e.message ?? 'Unknown Meta API error', {
      code:       e.code,
      type:       e.type,
      fbtrace_id: e.fbtrace_id,
    })
  }
  return body as unknown as T
}

/** Wrap metaFetchOnce with exponential backoff on Meta-side rate limits.
 *  Non-rate-limit errors throw immediately (no point waiting on a bad
 *  token or malformed query). Backoff schedule: 1s, 4s, 16s — three
 *  retries, total ~21s ceiling. Per-call timeout policy lives upstream;
 *  this just adds resilience to the transient throttle case. */
async function metaFetch<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const backoffSchedule = [1_000, 4_000, 16_000]
  let lastError: unknown
  for (let attempt = 0; attempt < backoffSchedule.length + 1; attempt++) {
    try {
      return await metaFetchOnce<T>(path, params, token)
    } catch (e) {
      lastError = e
      if (!isRateLimit(e) || attempt === backoffSchedule.length) throw e
      const wait = backoffSchedule[attempt]
      console.warn(`[meta-api] rate-limited (code=${(e as MetaApiError).code}), backing off ${wait}ms`)
      await new Promise(r => setTimeout(r, wait))
    }
  }
  throw lastError
}

// ── Verify a token + ad account ──────────────────────────────────────────
// Returns the ad account info if the token can read it. Used on Connect
// to validate before persisting.
export async function verifyAdAccount(token: string, adAccountId: string): Promise<FBAdAccount> {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  return metaFetch<FBAdAccount>(`/${id}`, {
    fields: 'id,account_id,name,account_status,business{id,name}',
  }, token)
}

// ── List campaigns in the ad account ─────────────────────────────────────
// Handles paging via Meta's cursor — we keep walking until `paging.next`
// disappears. For RRP-sized accounts this is one or two pages tops.
export async function listCampaigns(token: string, adAccountId: string): Promise<FBCampaign[]> {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const out: FBCampaign[] = []
  let after: string | undefined

  for (let i = 0; i < 50; i++) {  // hard ceiling — guards against runaway loops
    const params: Record<string, string> = {
      fields: 'id,name,status,effective_status,objective',
      limit:  '100',
    }
    if (after) params.after = after

    interface Page { data: FBCampaign[]; paging?: { cursors?: { after?: string }; next?: string } }
    const page = await metaFetch<Page>(`/${id}/campaigns`, params, token)
    out.push(...page.data)
    if (!page.paging?.next || !page.paging.cursors?.after) break
    after = page.paging.cursors.after
  }

  return out
}

// ── Pull insights for one campaign over a date range ─────────────────────
// time_increment=1 returns one row per day in the range — exactly what
// our daily metrics table wants. Restrict to outbound link clicks +
// leads-style actions; we can always expand fields later.
export async function fetchCampaignInsights(
  token:       string,
  campaignId:  string,
  sinceDate:   string,                    // 'YYYY-MM-DD'
  untilDate:   string,
): Promise<FBInsightsRow[]> {
  interface InsightsResponse { data: FBInsightsRow[] }
  const resp = await metaFetch<InsightsResponse>(`/${campaignId}/insights`, {
    fields:        'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions,cost_per_action_type,date_start,date_stop',
    time_range:    JSON.stringify({ since: sinceDate, until: untilDate }),
    time_increment: '1',
    level:         'campaign',
  }, token)
  return resp.data
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Pick the most-likely "result" value out of Meta's polymorphic actions
 * array. The action types we care about for advertiser reports — in order
 * of preference — are leads, on-site conversions, link clicks. Different
 * campaign objectives populate different action types; this picks the
 * one that matches the campaign's intent.
 */
const RESULT_PRIORITY = [
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.purchase',
  'omni_purchase',
  'link_click',
] as const

export function pickResultValue(row: FBInsightsRow): { value: number; type: string | null } {
  if (!row.actions || row.actions.length === 0) {
    // Fall back to outbound link clicks if no actions reported.
    const lc = Number(row.inline_link_clicks ?? 0)
    return { value: lc, type: lc > 0 ? 'inline_link_clicks' : null }
  }
  for (const wanted of RESULT_PRIORITY) {
    const hit = row.actions.find(a => a.action_type === wanted)
    if (hit) return { value: Number(hit.value), type: wanted }
  }
  // No prioritized action — sum all reported actions as a last resort.
  const total = row.actions.reduce((sum, a) => sum + Number(a.value), 0)
  return { value: total, type: 'sum:actions' }
}

export function pickCostPerResult(row: FBInsightsRow, resultType: string | null): number | null {
  if (!resultType || !row.cost_per_action_type) return null
  const hit = row.cost_per_action_type.find(a => a.action_type === resultType)
  return hit ? Number(hit.value) : null
}

/** Safe Number() that returns null for null/undefined/'' instead of NaN/0. */
export function toNum(v: string | undefined | null): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
