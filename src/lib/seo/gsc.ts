// ── Search Console data sync — ACTIVE ───────────────────────────────────────
//
// Pulls per-day query/page/clicks/impressions/CTR/position rows from
// Google Search Console for each configured site URL and upserts into
// search_console_data so the weekly Claude audit can reason from real
// data instead of guesswork.
//
// Activation requirements (one-time):
//   1. Create a Google Cloud project, enable the Search Console API
//   2. Create a service account, download the JSON key
//   3. In each GSC property → Settings → Users and permissions →
//      Add the service-account email as a "Restricted" user
//   4. Drop env vars on Vercel:
//        GSC_SERVICE_ACCOUNT_JSON  — full JSON contents (one line)
//        GSC_SITE_URLS             — comma-separated property URLs,
//                                    e.g. "https://riverregionparents.com,
//                                          sc-domain:mobilebayparents.com"
//
// Until both env vars are set the importer is a no-op; the weekly
// audit gracefully handles the empty-data case ("GSC data not
// available — note this in the report").

import type { SupabaseClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { MARKETS } from '@/lib/markets'

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export interface ImportResult {
  rowsImported:   number
  sitesProcessed: number
  errors:         Array<{ site: string; error: string }>
  warning?:       string
}

/** Returns true when the service-account env vars are present. */
export function isGscConfigured(): boolean {
  return !!process.env.GSC_SERVICE_ACCOUNT_JSON && !!process.env.GSC_SITE_URLS
}

/** Match a GSC property URL back to one of our brand slugs by hostname.
 *  Supports both URL-style ("https://example.com") and Domain-property
 *  style ("sc-domain:example.com"). Returns null on no match — those
 *  rows still import but tagged 'unknown'. */
function siteUrlToBrandSlug(siteUrl: string): string | null {
  const cleaned = siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const match = MARKETS.find(m => m.publicHost && cleaned.includes(m.publicHost.replace(/^https?:\/\//, '')))
  return match?.slug ?? null
}

/** Build an authenticated JWT client from the service-account JSON env
 *  var. Throws when GSC_SERVICE_ACCOUNT_JSON is malformed so the cron
 *  fails loudly instead of silently no-op'ing on a typo. */
function jwtClient() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON!
  let parsed: { client_email?: string; private_key?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the FULL service-account JSON, not just a key.')
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON missing client_email or private_key.')
  }
  // Vercel env vars can lose newlines; normalize the private key.
  const privateKey = parsed.private_key.replace(/\\n/g, '\n')
  return new google.auth.JWT({
    email:  parsed.client_email,
    key:    privateKey,
    scopes: [GSC_SCOPE],
  })
}

/** Pull the last `daysBack` days of (date, page, query) rows for each
 *  configured site URL and upsert into search_console_data. Paginates
 *  through GSC's 25,000-row-per-request limit until exhausted per
 *  site. */
export async function importGscDaily(
  sb: SupabaseClient,
  daysBack: number = 3,
): Promise<ImportResult> {
  if (!isGscConfigured()) {
    return { rowsImported: 0, sitesProcessed: 0, errors: [], warning: 'GSC_SERVICE_ACCOUNT_JSON or GSC_SITE_URLS not set' }
  }

  const auth = jwtClient()
  await auth.authorize()
  const webmasters = google.webmasters({ version: 'v3', auth })

  const sites = (process.env.GSC_SITE_URLS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (sites.length === 0) {
    return { rowsImported: 0, sitesProcessed: 0, errors: [], warning: 'GSC_SITE_URLS is empty' }
  }

  const now       = new Date()
  const startDate = new Date(now.getTime() - daysBack * 86400000).toISOString().slice(0, 10)
  const endDate   = now.toISOString().slice(0, 10)

  const result: ImportResult = { rowsImported: 0, sitesProcessed: 0, errors: [] }

  for (const siteUrl of sites) {
    const brandSlug = siteUrlToBrandSlug(siteUrl) ?? 'unknown'
    let startRow = 0
    let siteRows = 0

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate, endDate,
            dimensions: ['date', 'page', 'query'],
            rowLimit:   25000,
            startRow,
            // Drop redundant aggregated rows by skipping the property-
            // level summary; we want per-query granularity.
            aggregationType: 'byPage',
          },
        })

        const rows = res.data.rows ?? []
        if (rows.length === 0) break

        // Build upsert payload. The unique key is (date, page_url, query)
        // per the migration's PRIMARY KEY.
        const upserts = rows.map(r => ({
          date:        r.keys![0],
          page_url:    r.keys![1],
          query:       r.keys![2],
          clicks:      r.clicks       ?? 0,
          impressions: r.impressions  ?? 0,
          ctr:         r.ctr          ?? 0,
          position:    r.position     ?? 0,
          brand_slug:  brandSlug,
        }))

        // Upsert in chunks of 1000 to respect Supabase request size
        // limits.
        for (let i = 0; i < upserts.length; i += 1000) {
          const chunk = upserts.slice(i, i + 1000)
          const { error } = await sb.from('search_console_data').upsert(chunk, {
            onConflict: 'date,page_url,query',
          })
          if (error) throw new Error(`Supabase upsert failed: ${error.message}`)
        }

        siteRows  += rows.length
        startRow  += rows.length
        if (rows.length < 25000) break  // last page
      }

      result.rowsImported   += siteRows
      result.sitesProcessed += 1
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push({ site: siteUrl, error: msg })
    }
  }

  return result
}
