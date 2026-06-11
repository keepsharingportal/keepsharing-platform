// /admin/advertisers/[id]/gbp — per-advertiser Google Business Profile.
//
// Phase 2 of the GBP integration: an advertiser connects THEIR own GBP and
// gives the publisher permission to post on their behalf. Publisher
// editorial uses this page to set up the connection, post updates, and
// see local-search metrics for the advertiser. The publisher gets a real
// upsell: "we manage your local search presence + post weekly updates."
//
// Data lives in google_business_integrations (migration 166 adds the
// advertiser_account_id column). The same sync job, post composer, and
// metrics tables that power Phase 1 (RRP's own GBP) cover this — one
// table, one query path, one nightly cron syncs everything.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { AdvertiserGBPClient } from './AdvertiserGBPClient'

export const metadata: Metadata = { title: 'GBP — Advertiser' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface AdvertiserGBPIntegrationRow {
  id:                       string
  account_id:               string
  location_id:              string
  location_name:            string | null
  is_active:                boolean
  connected_at:             string
  last_sync_at:             string | null
  last_sync_status:         string | null
  last_sync_error:          string | null
  advertiser_account_id:    string | null
}

export interface InsightRow {
  day:    string
  metric: string
  value:  number
}

export interface PostRow {
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

interface Props { params: Promise<{ id: string }> }

export default async function AdvertiserGBPPage({ params }: Props) {
  const { id: advertiserId } = await params
  const sb = supabaseAdmin()

  // Confirm the advertiser exists.
  const { data: advData } = await sb
    .from('advertiser_accounts')
    .select('id, business_name, slug, city, state')
    .eq('id', advertiserId)
    .maybeSingle()
  const advertiser = advData as { id: string; business_name: string; slug: string | null; city: string | null; state: string | null } | null
  if (!advertiser) notFound()

  // Has the Phase 2 schema landed?
  let migrated = true
  let row: AdvertiserGBPIntegrationRow | null = null
  let insights: InsightRow[] = []
  let posts: PostRow[] = []

  try {
    const probe = await sb.from('google_business_integrations').select('advertiser_account_id').limit(1)
    if (probe.error && /column .* does not exist/i.test(probe.error.message)) migrated = false
    else if (probe.error) migrated = false
  } catch { migrated = false }

  if (migrated) {
    const { data: rData } = await sb
      .from('google_business_integrations')
      .select('*')
      .eq('advertiser_account_id', advertiserId)
      .maybeSingle()
    row = (rData as AdvertiserGBPIntegrationRow | null) ?? null

    if (row) {
      const since = new Date(); since.setUTCDate(since.getUTCDate() - 30)
      const { data: iData } = await sb
        .from('google_business_insights_daily')
        .select('day, metric, value')
        .eq('integration_id', row.id)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: true })
      insights = (iData ?? []) as InsightRow[]

      const { data: pData } = await sb
        .from('google_business_posts')
        .select('id, gbp_post_name, summary, cta_label, cta_url, status, created_at, published_at, error')
        .eq('integration_id', row.id)
        .order('created_at', { ascending: false })
        .limit(20)
      posts = (pData ?? []) as PostRow[]
    }
  }

  const oauthEnvOk = !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href={`/admin/advertisers/${advertiserId}`} className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Advertiser
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">{advertiser.business_name} · Google Business Profile</h1>
        </div>
        <p className="portal-page-subtitle">
          Connect this advertiser&apos;s Google Business Profile so the publisher can post updates + see local-search metrics on their behalf.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 166 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/166_gbp_phase2_multitenant.sql</code> to enable per-advertiser GBP.
          </div>
        )}

        {migrated && !oauthEnvOk && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs leading-relaxed">
            <strong>OAuth credentials needed.</strong> Set <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_ID</code> + <code className="bg-white px-1 py-0.5 rounded border border-portal-border">GOOGLE_OAUTH_CLIENT_SECRET</code> in env. Same Google OAuth client as Phase 1 works — see <Link href="/admin/integrations/google-business" className="text-portal-blue hover:underline">/admin/integrations/google-business</Link> for setup notes.
          </div>
        )}

        {migrated && oauthEnvOk && (
          <AdvertiserGBPClient
            advertiserId={advertiserId}
            advertiserName={advertiser.business_name}
            row={row}
            insights={insights}
            posts={posts}
          />
        )}

        {migrated && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <h3 className="text-sm font-bold text-portal-text mb-2">How this works (Phase 2)</h3>
            <p className="mb-2">
              The advertiser opens Google OAuth Playground using your client ID, signs in with the Google account that owns
              their GBP, grants <code className="bg-portal-bg px-1 rounded">business.manage</code> scope, and emails you the
              refresh token. You paste it here to connect their location. After that, posting + metrics work the same as
              Phase 1.
            </p>
            <p>
              The advertiser keeps full control: they can revoke the refresh token from their Google account security page
              at any time, which immediately cuts off your access.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
