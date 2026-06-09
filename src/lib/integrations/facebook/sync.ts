// Facebook ad data sync.
//
// Called by the daily cron route + the "Sync now" admin button — same
// code path. Idempotent on (fb_campaign_id, day), so re-running for a
// given day is safe and picks up any restated numbers from Meta.
//
// What it does, per run:
//   1. Load the integration row (token + ad account id) for the market
//   2. Pull every campaign in the ad account (paged)
//   3. Upsert each into facebook_campaigns; parse [slug] → advertiser_id
//      unless the campaign already has a manual override
//   4. For each active or recently active campaign, pull daily insights
//      for the lookback window and upsert into the metrics table
//   5. Stamp the integration row with sync results + write a log entry

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  verifyAdAccount, listCampaigns, fetchCampaignInsights,
  pickResultValue, pickCostPerResult, toNum, MetaApiError,
  type FBCampaign,
} from './client'
import { parseAdvertiserSlug } from './naming'

const MARKET = 'rrp'
// Re-pull this many days of insights every run. Meta restates recent
// numbers (delayed conversions, attribution windows) so we want to catch
// the adjustments — not just yesterday.
const INSIGHTS_LOOKBACK_DAYS = 7
// Hard ceiling on insights calls per sync to bound runtime in case of
// runaway campaign counts. RRP-sized: nowhere near this.
const MAX_INSIGHTS_CALLS = 200

export function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface SyncResult {
  status:          'ok' | 'error' | 'partial'
  campaign_count:  number
  metric_count:    number
  error?:          string
  failed_campaigns?: Array<{ campaign_id: string; reason: string }>
}

export async function runFacebookSync(triggeredBy: 'cron' | 'manual'): Promise<SyncResult> {
  const supabase = adminClient()

  // Open a log entry up-front so a crash mid-run is still visible in the
  // diagnostics list.
  const logIns = await supabase
    .from('facebook_sync_log')
    .insert({ triggered_by: triggeredBy, status: 'running' })
    .select('id')
    .single()
  const logId = (logIns.data as { id: string } | null)?.id

  async function finishLog(result: SyncResult) {
    if (!logId) return
    await supabase.from('facebook_sync_log').update({
      finished_at:    new Date().toISOString(),
      status:         result.status,
      campaign_count: result.campaign_count,
      metric_count:   result.metric_count,
      error:          result.error ?? null,
    }).eq('id', logId)
  }

  // ── Load integration row ────────────────────────────────────────────────
  const { data: integration } = await supabase
    .from('facebook_integrations')
    .select('*')
    .eq('market', MARKET)
    .eq('is_active', true)
    .maybeSingle()
  const row = integration as {
    id: string; access_token: string; ad_account_id: string
  } | null
  if (!row) {
    const result: SyncResult = { status: 'error', campaign_count: 0, metric_count: 0, error: 'No active Facebook integration configured.' }
    await finishLog(result)
    return result
  }

  // ── 1. Mirror campaigns ─────────────────────────────────────────────────
  let campaigns: FBCampaign[]
  try {
    campaigns = await listCampaigns(row.access_token, row.ad_account_id)
  } catch (e) {
    const msg = e instanceof MetaApiError ? `${e.message} (code ${e.code ?? '?'})` : String(e)
    const result: SyncResult = { status: 'error', campaign_count: 0, metric_count: 0, error: `Listing campaigns failed: ${msg}` }
    await stampIntegration(supabase, row.id, result)
    await finishLog(result)
    return result
  }

  // Build the advertiser slug → id map ONCE so per-campaign mapping is O(1).
  const { data: advertisers } = await supabase
    .from('advertiser_accounts')
    .select('id, slug')
  const slugToAdvertiserId = new Map<string, string>()
  for (const a of (advertisers ?? []) as Array<{ id: string; slug: string | null }>) {
    if (a.slug) slugToAdvertiserId.set(a.slug.toLowerCase(), a.id)
  }

  // Upsert campaigns. Preserve manual overrides — when a row already has
  // advertiser_mapping_source='manual', sync touches everything EXCEPT
  // advertiser_id, so the operator's pick survives renames.
  const nowIso = new Date().toISOString()
  for (const c of campaigns) {
    const parsedSlug = parseAdvertiserSlug(c.name)
    const autoAdvertiserId = parsedSlug ? slugToAdvertiserId.get(parsedSlug) ?? null : null

    const { data: existing } = await supabase
      .from('facebook_campaigns')
      .select('id, advertiser_mapping_source')
      .eq('fb_campaign_id', c.id)
      .maybeSingle()
    const existingRow = existing as { id: string; advertiser_mapping_source: string } | null
    const isManual = existingRow?.advertiser_mapping_source === 'manual'

    const upsertRow: Record<string, unknown> = {
      fb_campaign_id:    c.id,
      name:              c.name,
      status:            c.status,
      effective_status:  c.effective_status,
      objective:         c.objective,
      parsed_slug:       parsedSlug,
      last_synced_at:    nowIso,
    }
    // Only set advertiser binding if NOT a manual override.
    if (!isManual) {
      upsertRow.advertiser_id             = autoAdvertiserId
      upsertRow.advertiser_mapping_source = autoAdvertiserId ? 'auto' : 'unmapped'
    }
    await supabase
      .from('facebook_campaigns')
      .upsert(upsertRow, { onConflict: 'fb_campaign_id' })
  }

  // ── 2. Pull insights for active + recently active campaigns ─────────────
  // Skip campaigns Meta has marked deleted/archived AND not active in the
  // lookback window — those won't have new metrics. We still mirror them
  // for historical reference (see above).
  const candidates = campaigns.filter(c =>
    c.effective_status === 'ACTIVE' ||
    c.effective_status === 'PAUSED' ||
    c.status === 'ACTIVE'
  ).slice(0, MAX_INSIGHTS_CALLS)

  const until = new Date()
  const since = new Date(); since.setUTCDate(since.getUTCDate() - INSIGHTS_LOOKBACK_DAYS)
  const sinceStr = since.toISOString().slice(0, 10)
  const untilStr = until.toISOString().slice(0, 10)

  const failures: Array<{ campaign_id: string; reason: string }> = []
  let metricCount = 0

  for (const c of candidates) {
    try {
      const rows = await fetchCampaignInsights(row.access_token, c.id, sinceStr, untilStr)
      if (rows.length === 0) continue
      const metricRows = rows.map(r => {
        const result = pickResultValue(r)
        return {
          fb_campaign_id:   c.id,
          day:              r.date_start,
          spend:            toNum(r.spend),
          impressions:      toNum(r.impressions),
          reach:            toNum(r.reach),
          clicks:           toNum(r.clicks),
          link_clicks:      toNum(r.inline_link_clicks),
          results:          result.value || null,
          cost_per_result:  pickCostPerResult(r, result.type),
          ctr:              toNum(r.ctr),
          cpc:              toNum(r.cpc),
          cpm:              toNum(r.cpm),
          frequency:        toNum(r.frequency),
          synced_at:        nowIso,
        }
      })
      await supabase
        .from('facebook_campaign_metrics_daily')
        .upsert(metricRows, { onConflict: 'fb_campaign_id,day' })
      metricCount += metricRows.length
    } catch (e) {
      const msg = e instanceof MetaApiError ? `${e.message} (code ${e.code ?? '?'})` : String(e)
      failures.push({ campaign_id: c.id, reason: msg })
      // Don't bail — keep syncing other campaigns. Partial results > none.
    }
  }

  const status: SyncResult['status'] = failures.length === 0 ? 'ok'
    : failures.length === candidates.length ? 'error'
    : 'partial'
  const result: SyncResult = {
    status,
    campaign_count:  campaigns.length,
    metric_count:    metricCount,
    failed_campaigns: failures.length > 0 ? failures : undefined,
    error: failures.length > 0
      ? `${failures.length}/${candidates.length} campaigns failed`
      : undefined,
  }
  await stampIntegration(supabase, row.id, result)
  await finishLog(result)
  return result
}

async function stampIntegration(supabase: SupabaseClient, id: string, result: SyncResult) {
  await supabase.from('facebook_integrations').update({
    last_sync_at:             new Date().toISOString(),
    last_sync_status:         result.status,
    last_sync_error:          result.error ?? null,
    last_sync_campaign_count: result.campaign_count,
    last_sync_metric_count:   result.metric_count,
  }).eq('id', id)
}
