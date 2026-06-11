// ── /admin/integrations/search-console ──────────────────────────────────────
// Setup walkthrough + sync log for Google Search Console.
//
// Auth model: refresh token paste. The user goes through Google OAuth
// Playground to mint a refresh token, then pastes it here along with their
// property URL. We validate the token (mints an access token, lists their
// sites), then save the integration row. Nightly sync pulls query + page
// metrics for the trailing 3 days; 90-day retention.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Search, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { SearchConsoleClient } from './SearchConsoleClient'

export const metadata: Metadata = { title: 'Google Search Console — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface GSCIntegrationRow {
  id:                       string
  property_url:             string
  is_active:                boolean
  connected_at:             string
  last_sync_at:             string | null
  last_sync_status:         string | null
  last_sync_error:          string | null
  last_sync_query_count:    number | null
  last_sync_page_count:     number | null
}

export interface GSCSyncLogRow {
  id:           string
  started_at:   string
  finished_at:  string | null
  status:       string | null
  query_count:  number | null
  page_count:   number | null
  error:        string | null
  triggered_by: string | null
}

export default async function SearchConsolePage() {
  const sb = supabaseAdmin()

  let migrated = true
  let row: GSCIntegrationRow | null = null
  let log: GSCSyncLogRow[] = []
  let recentRowCount = 0

  try {
    const probe = await sb.from('search_console_integrations').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: rowsData } = await sb
        .from('search_console_integrations')
        .select('*')
        .maybeSingle()
      row = (rowsData as GSCIntegrationRow | null) ?? null

      const { data: logData } = await sb
        .from('search_console_sync_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10)
      log = (logData ?? []) as GSCSyncLogRow[]

      const { count } = await sb
        .from('search_console_queries')
        .select('id', { count: 'exact', head: true })
      recentRowCount = count ?? 0
    }
  } catch { /* fall through */ }

  const oauthEnvOk = !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Integrations
        </Link>
        <h1 className="portal-page-title">Google Search Console</h1>
        <p className="portal-page-subtitle">
          Pulls the actual search queries that land readers on each article. Direct editorial intelligence — tells you what to commission more of based on real search demand.
        </p>
      </div>

      <div className="p-6 max-w-4xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 149 pending.</strong> Run <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/149_search_console.sql</code> first.
          </div>
        )}

        {migrated && !oauthEnvOk && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs leading-relaxed">
            <strong>OAuth credentials needed.</strong> Before you can connect, set <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_SECRET</code> in <code className="bg-white px-1 py-0.5 rounded border border-portal-border">.env.local</code> (and on Vercel).
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-portal-blue hover:underline">Google Cloud Console → APIs & Services → Credentials</a></li>
              <li>Create an OAuth 2.0 Client ID (type: Web application)</li>
              <li>Add <code className="bg-white px-1 py-0.5 rounded border border-portal-border">https://developers.google.com/oauthplayground</code> as an authorized redirect URI</li>
              <li>Copy the Client ID + Client Secret to env</li>
              <li>Enable the Search Console API for the project (APIs & Services → Library)</li>
            </ol>
          </div>
        )}

        {migrated && oauthEnvOk && (
          <SearchConsoleClient row={row} recentQueryRows={recentRowCount} />
        )}

        {migrated && log.length > 0 && (
          <section className="bg-white border border-portal-border rounded-lg p-5">
            <h3 className="text-sm font-bold text-portal-text mb-3">Recent syncs</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Queries</th>
                  <th className="pb-2 text-right">Pages</th>
                  <th className="pb-2">Trigger</th>
                  <th className="pb-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {log.map(r => (
                  <tr key={r.id}>
                    <td className="py-1.5 text-portal-sub">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="py-1.5">
                      {r.status === 'success' && <span className="text-portal-green font-bold">success</span>}
                      {r.status === 'error'   && <span className="text-red-700 font-bold">error</span>}
                      {!r.status              && <span className="text-portal-muted">running…</span>}
                    </td>
                    <td className="py-1.5 text-right text-portal-text">{r.query_count ?? '—'}</td>
                    <td className="py-1.5 text-right text-portal-text">{r.page_count  ?? '—'}</td>
                    <td className="py-1.5 text-[10px] text-portal-muted">{r.triggered_by ?? '—'}</td>
                    <td className="py-1.5 text-[10px] text-red-700 max-w-[200px] truncate" title={r.error ?? undefined}>
                      {r.error ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {migrated && oauthEnvOk && row && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Search size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">Where the data shows up</h3>
            </div>
            <p><strong>/admin/analytics/acquisition</strong> — Top organic queries panel beside the referrer host table.</p>
            <p><strong>/admin/articles/[id]/edit</strong> — Per-article query list. Tells you "Readers find this article via these queries" — direct input for headline rewrites + follow-up commissions.</p>
            <p className="text-portal-muted text-[11px] mt-2">
              Sync runs nightly at 8:30 UTC. Hit "Sync now" to backfill before then.
            </p>
          </div>
        )}

        {!migrated && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-portal-amber" />
              <h3 className="text-sm font-bold text-portal-text">After the migration</h3>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Set <code className="bg-portal-bg px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_ID</code> + <code className="bg-portal-bg px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_SECRET</code> in env</li>
              <li>Mint a refresh token via Google OAuth Playground (scope: webmasters.readonly)</li>
              <li>Paste it here along with your property URL</li>
              <li>Hit Sync now to pull the last 3 days</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
