// ── Search Console data sync ────────────────────────────────────────────────
//
// SCAFFOLD — the daily cron that imports GSC query/page data into
// search_console_data so the weekly Claude audit can use it.
//
// To activate:
//   1. Create a Google Cloud project, enable the Search Console API.
//   2. Create a service account, download the JSON key, share with
//      the GSC property as a "Restricted" user.
//   3. Drop the JSON contents in env as GSC_SERVICE_ACCOUNT_JSON.
//   4. Set GSC_SITE_URLS env to comma-separated property URLs we sync
//      (e.g. "https://riverregionparents.com,https://mobilebayparents.com").
//   5. The cron will then call this importer and populate the table.
//
// Until the env vars are set the importer is a no-op; the weekly audit
// gracefully handles the empty-data case ("GSC data not available —
// note this in the report").

import type { SupabaseClient } from '@supabase/supabase-js'
import { MARKETS } from '@/lib/markets'

export interface GscRow {
  date:        string
  page_url:    string
  query:       string
  clicks:      number
  impressions: number
  ctr:         number
  position:    number
  brand_slug:  string
}

/** Returns true when the service-account env vars are present. */
export function isGscConfigured(): boolean {
  return !!process.env.GSC_SERVICE_ACCOUNT_JSON && !!process.env.GSC_SITE_URLS
}

/** No-op when GSC isn't configured; otherwise fetches the last
 *  N days of query/page/clicks/impressions/CTR/position rows from
 *  Google Search Console for each configured site URL, maps to brand
 *  slug, and upserts into search_console_data. */
export async function importGscDaily(
  sb: SupabaseClient,
  daysBack: number = 3,
): Promise<{ rowsImported: number; sitesProcessed: number; warning?: string }> {
  if (!isGscConfigured()) {
    return { rowsImported: 0, sitesProcessed: 0, warning: 'GSC_SERVICE_ACCOUNT_JSON not set' }
  }

  // Implementation note for the activation step:
  //
  //   import { google } from 'googleapis'
  //   const sa  = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON!)
  //   const jwt = new google.auth.JWT(sa.client_email, undefined, sa.private_key,
  //     ['https://www.googleapis.com/auth/webmasters.readonly'])
  //   const webmasters = google.webmasters({ version: 'v3', auth: jwt })
  //   const sites = (process.env.GSC_SITE_URLS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  //   for (const siteUrl of sites) {
  //     const brandSlug = MARKETS.find(m => siteUrl.includes(m.publicHost))?.slug ?? null
  //     const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10)
  //     const endDate   = new Date().toISOString().slice(0, 10)
  //     let startRow = 0
  //     while (true) {
  //       const res = await webmasters.searchanalytics.query({
  //         siteUrl,
  //         requestBody: {
  //           startDate, endDate,
  //           dimensions: ['date', 'page', 'query'],
  //           rowLimit: 25000,
  //           startRow,
  //         },
  //       })
  //       const rows = res.data.rows ?? []
  //       if (rows.length === 0) break
  //       const upserts: GscRow[] = rows.map(r => ({
  //         date:        r.keys![0],
  //         page_url:    r.keys![1],
  //         query:       r.keys![2],
  //         clicks:      r.clicks ?? 0,
  //         impressions: r.impressions ?? 0,
  //         ctr:         r.ctr ?? 0,
  //         position:    r.position ?? 0,
  //         brand_slug:  brandSlug ?? 'unknown',
  //       }))
  //       await sb.from('search_console_data').upsert(upserts, { onConflict: 'date,page_url,query' })
  //       startRow += rows.length
  //       if (rows.length < 25000) break
  //     }
  //   }
  //   return { rowsImported, sitesProcessed: sites.length }

  // The actual googleapis call is gated behind the env vars above so
  // we don't add the dependency until the editor decides to wire it.
  void sb; void MARKETS; void daysBack
  return { rowsImported: 0, sitesProcessed: 0, warning: 'Importer scaffolded but not yet activated. See lib/seo/gsc.ts for activation steps.' }
}
