// ── /admin/integrations/google-business ─────────────────────────────────────
// Setup walkthrough + insights view + post composer for Google Business
// Profile (Phase 1: RRP-managed location).

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, MapPin, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { GBPClient } from './GBPClient'

export const metadata: Metadata = { title: 'Google Business Profile — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface GBPIntegrationRow {
  id:                       string
  account_id:               string
  location_id:              string
  location_name:            string | null
  is_active:                boolean
  connected_at:             string
  last_sync_at:             string | null
  last_sync_status:         string | null
  last_sync_error:          string | null
}

export interface GBPInsightRow {
  day:    string
  metric: string
  value:  number
}

export interface GBPPostRow {
  id:            string
  gbp_post_name: string | null
  summary:       string
  cta_label:     string | null
  cta_url:       string | null
  status:        string
  created_at:    string
  published_at:  string | null
  error:         string | null
}

export default async function GoogleBusinessPage() {
  const sb = supabaseAdmin()

  let migrated = true
  let row: GBPIntegrationRow | null = null
  let insights: GBPInsightRow[] = []
  let posts: GBPPostRow[] = []
  try {
    const probe = await sb.from('google_business_integrations').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: rowsData } = await sb
        .from('google_business_integrations')
        .select('*')
        .maybeSingle()
      row = (rowsData as GBPIntegrationRow | null) ?? null

      if (row) {
        const since = new Date(); since.setUTCDate(since.getUTCDate() - 30)
        const { data: i } = await sb
          .from('google_business_insights_daily')
          .select('day, metric, value')
          .eq('integration_id', row.id)
          .gte('day', since.toISOString().slice(0, 10))
          .order('day', { ascending: true })
        insights = (i ?? []) as GBPInsightRow[]

        const { data: p } = await sb
          .from('google_business_posts')
          .select('id, gbp_post_name, summary, cta_label, cta_url, status, created_at, published_at, error')
          .eq('integration_id', row.id)
          .order('created_at', { ascending: false })
          .limit(20)
        posts = (p ?? []) as GBPPostRow[]
      }
    }
  } catch { /* fall through */ }

  const oauthEnvOk = !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Integrations
        </Link>
        <h1 className="portal-page-title">Google Business Profile</h1>
        <p className="portal-page-subtitle">
          Phase 1 — RRP&apos;s own GBP. Post updates, see local-search insights, track call clicks + direction requests. Improves local discovery which feeds Google search referrals.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 150 pending.</strong> Run <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/150_google_business_profile.sql</code> first.
          </div>
        )}

        {migrated && !oauthEnvOk && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs leading-relaxed">
            <strong>OAuth credentials needed.</strong> Set <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_ID</code> + <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_SECRET</code> in env. Same Google OAuth client as Search Console works — just make sure to enable the My Business APIs (Account Management, Business Information, Performance, My Business v4) in your Google Cloud project.
          </div>
        )}

        {migrated && oauthEnvOk && (
          <GBPClient row={row} insights={insights} posts={posts} />
        )}

        {!migrated && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-portal-amber" />
              <h3 className="text-sm font-bold text-portal-text">After the migration</h3>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Set Google OAuth env vars (same client as GSC works)</li>
              <li>Enable My Business APIs in Google Cloud project</li>
              <li>Mint a refresh token via OAuth Playground with scope <code className="bg-portal-bg px-1 py-0.5 rounded border border-portal-border">business.manage</code></li>
              <li>Paste it here, pick your location, save</li>
              <li>Sync runs nightly at 09:00 UTC; post updates from the composer below</li>
            </ol>
          </div>
        )}

        {migrated && row && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">What&apos;s next</h3>
            </div>
            <p>Phase 1 covers RRP&apos;s own profile. Phase 2 (deferred) layers in per-advertiser GBP — each advertiser does their own OAuth, RRP&apos;s admin gets a "Post today&apos;s promo to all advertisers" workflow with editorial review. Phase 2 is a real recurring-revenue upsell — &quot;publish to your GBP from your KeepSharing dashboard&quot; — worth shipping after Phase 1 has proven the API integration is solid.</p>
          </div>
        )}
      </div>
    </div>
  )
}
