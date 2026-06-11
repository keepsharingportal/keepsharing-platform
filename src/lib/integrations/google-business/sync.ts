// GBP nightly insights sync. Pulls daily values for every metric in
// PERFORMANCE_METRICS over the trailing 7-day window. Idempotent on
// (integration_id, day, metric).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  mintAccessToken, fetchDailyMetric, PERFORMANCE_METRICS,
  gbpErrorMessage,
} from './client'

const LOOKBACK_DAYS = 7

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function bareIdFromResource(name: string): string {
  // "locations/12345" → "12345"; "accounts/12345/locations/67890" → "67890"
  return name.split('/').pop() ?? name
}

interface IntegrationRow {
  id:                       string
  account_id:               string
  location_id:              string
  refresh_token:            string
  access_token:             string | null
  access_token_expires_at:  string | null
}

export interface GBPSyncResult {
  status:        'success' | 'error'
  insightCount:  number
  error:         string | null
  durationMs:    number
}

async function freshAccessToken(db: SupabaseClient, row: IntegrationRow): Promise<string> {
  const now = Date.now()
  if (row.access_token && row.access_token_expires_at && new Date(row.access_token_expires_at).getTime() > now + 30_000) {
    return row.access_token
  }
  const { accessToken, expiresAt } = await mintAccessToken(row.refresh_token)
  await db.from('google_business_integrations').update({
    access_token:            accessToken,
    access_token_expires_at: expiresAt.toISOString(),
  }).eq('id', row.id)
  return accessToken
}

export async function syncGoogleBusiness(trigger: string = 'cron'): Promise<GBPSyncResult> {
  const db = adminDb()
  const start = Date.now()

  const { data: logRow } = await db
    .from('google_business_sync_log')
    .insert({ started_at: new Date().toISOString(), triggered_by: trigger })
    .select('id')
    .single()
  const logId = (logRow as { id: string } | null)?.id ?? null

  try {
    const { data: rows } = await db
      .from('google_business_integrations')
      .select('id, account_id, location_id, refresh_token, access_token, access_token_expires_at')
      .eq('is_active', true)
    const integrations = (rows ?? []) as IntegrationRow[]
    if (integrations.length === 0) {
      const result: GBPSyncResult = { status: 'success', insightCount: 0, error: null, durationMs: Date.now() - start }
      if (logId) await db.from('google_business_sync_log').update({
        finished_at: new Date().toISOString(), status: 'success', insight_count: 0,
      }).eq('id', logId)
      return result
    }

    let totalInsights = 0

    for (const integration of integrations) {
      const accessToken = await freshAccessToken(db, integration)
      const end   = new Date(); end.setUTCDate(end.getUTCDate() - 2)
      const startD = new Date(end); startD.setUTCDate(startD.getUTCDate() - LOOKBACK_DAYS + 1)

      const locationBareId = bareIdFromResource(integration.location_id)

      const upserts: Array<{
        integration_id: string
        day:            string
        metric:         string
        value:          number
      }> = []

      // One API call per metric — GBP doesn't support a multi-metric batch on
      // the daily endpoint. PERFORMANCE_METRICS is ~8 metrics so it's fine.
      for (const metric of PERFORMANCE_METRICS) {
        try {
          const points = await fetchDailyMetric(accessToken, locationBareId, metric, ymd(startD), ymd(end))
          for (const p of points) {
            upserts.push({
              integration_id: integration.id,
              day:            p.date,
              metric,
              value:          p.value,
            })
          }
        } catch (e) {
          // Some metrics aren't available for all locations (e.g. CONVERSATIONS
          // needs Messages enabled). Don't fail the whole sync — log + continue.
          console.warn(`[gbp/sync] metric ${metric} failed:`, gbpErrorMessage(e))
        }
      }

      if (upserts.length > 0) {
        await db.from('google_business_insights_daily').upsert(upserts, {
          onConflict: 'integration_id,day,metric',
        })
      }
      totalInsights += upserts.length

      await db.from('google_business_integrations').update({
        last_sync_at:     new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error:  null,
      }).eq('id', integration.id)
    }

    const durationMs = Date.now() - start
    if (logId) await db.from('google_business_sync_log').update({
      finished_at: new Date().toISOString(), status: 'success', insight_count: totalInsights,
    }).eq('id', logId)
    return { status: 'success', insightCount: totalInsights, error: null, durationMs }
  } catch (e) {
    const durationMs = Date.now() - start
    const msg = gbpErrorMessage(e)
    if (logId) await db.from('google_business_sync_log').update({
      finished_at: new Date().toISOString(), status: 'error', error: msg.slice(0, 1000),
    }).eq('id', logId)
    return { status: 'error', insightCount: 0, error: msg, durationMs }
  }
}
