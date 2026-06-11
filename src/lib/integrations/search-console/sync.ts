// GSC nightly sync. Pulls yesterday's metrics + restates the trailing
// 3 days (Google sometimes delays data, especially for very new pages).
//
// Idempotent on the unique keys (integration_id, query, page, day) and
// (integration_id, page, day). Re-running for the same day either no-ops
// or picks up any restated numbers.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  mintAccessToken, queryAnalytics, SearchConsoleApiError,
  type SearchAnalyticsRow,
} from './client'

const LOOKBACK_DAYS = 3
const QUERY_PAGE_ROWS_PER_DAY = 1000

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface IntegrationRow {
  id:                       string
  property_url:             string
  refresh_token:            string
  access_token:             string | null
  access_token_expires_at:  string | null
}

export interface GSCSyncResult {
  status:        'success' | 'error'
  queryCount:    number
  pageCount:     number
  error:         string | null
  durationMs:    number
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Resolve a fresh access token. Caches in the integration row until the
 *  expiry timestamp passes. */
async function freshAccessToken(db: SupabaseClient, row: IntegrationRow): Promise<string> {
  const now = Date.now()
  if (row.access_token && row.access_token_expires_at && new Date(row.access_token_expires_at).getTime() > now + 30_000) {
    return row.access_token
  }
  const { accessToken, expiresAt } = await mintAccessToken(row.refresh_token)
  await db.from('search_console_integrations').update({
    access_token:            accessToken,
    access_token_expires_at: expiresAt.toISOString(),
  }).eq('id', row.id)
  return accessToken
}

/** Find a guide_article id from a page URL. Best-effort — returns null when
 *  the URL doesn't match a known article slug. Article URLs on RRP look
 *  like /<guide>/articles/<slug> or /<guide>/<advertiser>/<slug>; we match
 *  the trailing slug component. */
async function articleIdForPage(db: SupabaseClient, page: string, slugCache: Map<string, string | null>): Promise<string | null> {
  // Cheap heuristic: last non-empty path segment.
  let path: string
  try { path = new URL(page).pathname } catch { return null }
  const segs = path.split('/').filter(Boolean)
  const slug = segs.pop()
  if (!slug) return null
  if (slugCache.has(slug)) return slugCache.get(slug) ?? null
  const { data } = await db
    .from('guide_articles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  const id = (data as { id: string } | null)?.id ?? null
  slugCache.set(slug, id)
  return id
}

export async function syncSearchConsole(trigger: string = 'cron'): Promise<GSCSyncResult> {
  const db = adminDb()
  const start = Date.now()

  // Open a sync log row up-front; close it on completion.
  const { data: logRow } = await db
    .from('search_console_sync_log')
    .insert({ started_at: new Date().toISOString(), triggered_by: trigger })
    .select('id')
    .single()
  const logId = (logRow as { id: string } | null)?.id ?? null

  try {
    const { data: rows } = await db
      .from('search_console_integrations')
      .select('id, property_url, refresh_token, access_token, access_token_expires_at')
      .eq('is_active', true)
    const integrations = (rows ?? []) as IntegrationRow[]
    if (integrations.length === 0) {
      const result: GSCSyncResult = { status: 'success', queryCount: 0, pageCount: 0, error: null, durationMs: Date.now() - start }
      if (logId) await db.from('search_console_sync_log').update({
        finished_at: new Date().toISOString(), status: 'success', query_count: 0, page_count: 0,
      }).eq('id', logId)
      return result
    }

    let totalQueries = 0
    let totalPages   = 0

    for (const integration of integrations) {
      const accessToken = await freshAccessToken(db, integration)
      const slugCache = new Map<string, string | null>()

      // Lookback window: today - 3..today (Google takes ~2 days to populate; we cover the wobble).
      const end   = new Date(); end.setUTCDate(end.getUTCDate() - 2)
      const start = new Date(end); start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS + 1)

      // Pull query × page × date rows — the most granular bucket. Caps at
      // 1000 rows per day's worth — enough headroom for RRP-sized site.
      const queryRows = await queryAnalytics(accessToken, integration.property_url, {
        startDate:  ymd(start),
        endDate:    ymd(end),
        dimensions: ['query', 'page', 'date'],
        rowLimit:   QUERY_PAGE_ROWS_PER_DAY * LOOKBACK_DAYS,
      })

      const queryUpserts: Array<{
        integration_id: string
        query:          string
        page:           string
        day:            string
        clicks:         number
        impressions:    number
        position:       number
        article_id:     string | null
      }> = []
      for (const r of queryRows) {
        if (!r.query || !r.page || !r.date) continue
        const articleId = await articleIdForPage(db, r.page, slugCache)
        queryUpserts.push({
          integration_id: integration.id,
          query:          r.query,
          page:           r.page,
          day:            r.date,
          clicks:         r.clicks,
          impressions:    r.impressions,
          position:       r.position,
          article_id:     articleId,
        })
      }

      if (queryUpserts.length > 0) {
        await db.from('search_console_queries').upsert(queryUpserts, {
          onConflict: 'integration_id,query,page,day',
        })
      }
      totalQueries += queryUpserts.length

      // Per-page daily rollup — same window, page+date dimensions only.
      // Smaller dataset (no query cardinality) so 1k rows × 3 days is fine.
      const pageRows = await queryAnalytics(accessToken, integration.property_url, {
        startDate:  ymd(start),
        endDate:    ymd(end),
        dimensions: ['page', 'date'],
        rowLimit:   1000 * LOOKBACK_DAYS,
      })

      const pageUpserts: Array<{
        integration_id: string
        page:           string
        day:            string
        clicks:         number
        impressions:    number
        position:       number
        ctr:            number
        article_id:     string | null
      }> = []
      for (const r of pageRows) {
        if (!r.page || !r.date) continue
        const articleId = await articleIdForPage(db, r.page, slugCache)
        pageUpserts.push({
          integration_id: integration.id,
          page:           r.page,
          day:            r.date,
          clicks:         r.clicks,
          impressions:    r.impressions,
          position:       r.position,
          ctr:            r.ctr,
          article_id:     articleId,
        })
      }
      if (pageUpserts.length > 0) {
        await db.from('search_console_pages_daily').upsert(pageUpserts, {
          onConflict: 'integration_id,page,day',
        })
      }
      totalPages += pageUpserts.length

      // Stamp the integration row.
      await db.from('search_console_integrations').update({
        last_sync_at:          new Date().toISOString(),
        last_sync_status:      'success',
        last_sync_error:       null,
        last_sync_query_count: queryUpserts.length,
        last_sync_page_count:  pageUpserts.length,
      }).eq('id', integration.id)
    }

    // Retention sweep: drop rows older than 90 days. Runs once per sync
    // (not per integration), and AFTER successful upserts so a transient
    // sync failure can't leave the dataset empty.
    const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - 90)
    const cutoffDay = ymd(cutoff)
    const { error: qSweepErr } = await db.from('search_console_queries').delete().lt('day', cutoffDay)
    if (qSweepErr) console.warn('[gsc/sync] query retention sweep failed:', qSweepErr.message)
    const { error: pSweepErr } = await db.from('search_console_pages_daily').delete().lt('day', cutoffDay)
    if (pSweepErr) console.warn('[gsc/sync] pages_daily retention sweep failed:', pSweepErr.message)

    const durationMs = Date.now() - start
    if (logId) await db.from('search_console_sync_log').update({
      finished_at: new Date().toISOString(), status: 'success',
      query_count: totalQueries, page_count: totalPages,
    }).eq('id', logId)
    return { status: 'success', queryCount: totalQueries, pageCount: totalPages, error: null, durationMs }
  } catch (e) {
    const durationMs = Date.now() - start
    const msg = e instanceof SearchConsoleApiError ? `${e.status}: ${e.message}` :
                e instanceof Error                 ? e.message :
                                                     String(e)
    if (logId) await db.from('search_console_sync_log').update({
      finished_at: new Date().toISOString(), status: 'error', error: msg.slice(0, 1000),
    }).eq('id', logId)
    return { status: 'error', queryCount: 0, pageCount: 0, error: msg, durationMs }
  }
}
