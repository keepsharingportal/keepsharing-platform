// Google Business Profile API client.
//
// Phase 1: RRP-managed location. Same OAuth model as Search Console
// (GOOGLE_OAUTH_CLIENT_ID/SECRET in env + refresh token pasted via OAuth
// Playground). The required scope is:
//   https://www.googleapis.com/auth/business.manage
//
// GBP's API is split across several base URLs:
//   accounts.list / locations.list  → mybusinessaccountmanagement.googleapis.com
//                                     + mybusinessbusinessinformation.googleapis.com
//   performance daily metrics       → businessprofileperformance.googleapis.com
//   local posts                     → mybusiness.googleapis.com (legacy v4)
//
// References:
//   developers.google.com/my-business/reference/businessprofileperformance/rest

import { mintAccessToken, SearchConsoleApiError } from '../search-console/client'

// Re-export so callers don't import from search-console for OAuth.
export { mintAccessToken } from '../search-console/client'

export class GBPApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'GBPApiError'
  }
}

function ensureCredsConfigured(): void {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET must be set in env.')
  }
}

/** List GBP accounts the auth'd user can access. Typically returns one
 *  row for a single-location business. */
export async function listAccounts(accessToken: string): Promise<Array<{ name: string; accountName: string }>> {
  ensureCredsConfigured()
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { 'authorization': `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new GBPApiError(res.status, `accounts.list ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { accounts?: Array<{ name: string; accountName: string }> }
  return json.accounts ?? []
}

/** List locations under an account. The `accountName` is the `name` field
 *  from listAccounts ("accounts/12345"). */
export async function listLocations(accessToken: string, accountName: string): Promise<Array<{ name: string; title: string; storefrontAddress?: { locality?: string; administrativeArea?: string } }>> {
  // The Business Information API uses a different base host.
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`
  const res = await fetch(url, {
    headers: { 'authorization': `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new GBPApiError(res.status, `locations.list ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { locations?: Array<{ name: string; title: string; storefrontAddress?: { locality?: string; administrativeArea?: string } }> }
  return json.locations ?? []
}

// Performance API metric keys. Documented at:
// developers.google.com/my-business/reference/businessprofileperformance/rest/v1/locations/getDailyMetricsTimeSeries
export const PERFORMANCE_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_CONVERSATIONS',
] as const

export type PerformanceMetric = typeof PERFORMANCE_METRICS[number]

interface DailyMetricPoint {
  date:  string                          // YYYY-MM-DD
  value: number
}

/** Pull one metric's daily time-series for a location. The locationId
 *  argument here is the bare numeric id, NOT "locations/XYZ". */
export async function fetchDailyMetric(
  accessToken: string,
  locationId:  string,
  metric:      PerformanceMetric,
  startDate:   string,
  endDate:     string,
): Promise<DailyMetricPoint[]> {
  const start = startDate.split('-').map(Number)
  const end   = endDate.split('-').map(Number)
  const params = new URLSearchParams({
    dailyMetric:                          metric,
    'dailyRange.startDate.year':         String(start[0]),
    'dailyRange.startDate.month':        String(start[1]),
    'dailyRange.startDate.day':          String(start[2]),
    'dailyRange.endDate.year':           String(end[0]),
    'dailyRange.endDate.month':          String(end[1]),
    'dailyRange.endDate.day':            String(end[2]),
  })
  const url = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:getDailyMetricsTimeSeries?${params}`
  const res = await fetch(url, {
    headers: { 'authorization': `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new GBPApiError(res.status, `dailyMetric ${metric} ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as {
    timeSeries?: {
      datedValues?: Array<{ date: { year: number; month: number; day: number }; value?: string }>
    }
  }
  const points: DailyMetricPoint[] = []
  for (const r of json.timeSeries?.datedValues ?? []) {
    const date = `${r.date.year}-${String(r.date.month).padStart(2, '0')}-${String(r.date.day).padStart(2, '0')}`
    points.push({ date, value: Number(r.value ?? 0) })
  }
  return points
}

interface CreatePostInput {
  accountId:   string                          // bare id ("12345")
  locationId:  string                          // bare id ("67890")
  summary:     string
  ctaActionType?: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
  ctaUrl?:     string
  mediaUrl?:   string                          // public image URL
}

/** Create a local post on GBP. Returns the resource name on success. */
export async function createLocalPost(accessToken: string, input: CreatePostInput): Promise<{ name: string }> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${input.accountId}/locations/${input.locationId}/localPosts`
  const body: Record<string, unknown> = {
    summary:    input.summary,
    languageCode: 'en-US',
    topicType:  'STANDARD',
  }
  if (input.ctaActionType) {
    body.callToAction = {
      actionType: input.ctaActionType,
      ...(input.ctaUrl ? { url: input.ctaUrl } : {}),
    }
  }
  if (input.mediaUrl) {
    body.media = [{ mediaFormat: 'PHOTO', sourceUrl: input.mediaUrl }]
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'content-type':  'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new GBPApiError(res.status, `posts.create ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { name: string }
  return { name: json.name }
}

/** Pretty-print errors for the admin UI. Used by the action layer. */
export function gbpErrorMessage(e: unknown): string {
  if (e instanceof GBPApiError || e instanceof SearchConsoleApiError) return `${e.status}: ${e.message}`
  return e instanceof Error ? e.message : String(e)
}
