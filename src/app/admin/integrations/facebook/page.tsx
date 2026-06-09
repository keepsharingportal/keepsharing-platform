// ── /admin/integrations/facebook ────────────────────────────────────────────
// Facebook Marketing integration setup + campaign-mapping admin.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { FacebookIntegrationClient } from './FacebookIntegrationClient'

export const metadata: Metadata = { title: 'Facebook Integration — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface FacebookIntegrationRow {
  id:                       string
  ad_account_id:            string
  ad_account_name:          string | null
  business_id:              string | null
  connected_at:             string
  last_sync_at:             string | null
  last_sync_status:         string | null
  last_sync_error:          string | null
  last_sync_campaign_count: number | null
  last_sync_metric_count:   number | null
  is_active:                boolean
}

export interface FacebookCampaignRow {
  id:                         string
  fb_campaign_id:             string
  name:                       string
  status:                     string | null
  effective_status:           string | null
  objective:                  string | null
  advertiser_id:              string | null
  advertiser_mapping_source:  string
  parsed_slug:                string | null
  last_synced_at:             string
}

export interface AdvertiserOption {
  id:            string
  business_name: string
  slug:          string | null
}

export interface SyncLogRow {
  id:             string
  started_at:    string
  finished_at:   string | null
  status:        string | null
  campaign_count: number | null
  metric_count:   number | null
  error:         string | null
  triggered_by:  string | null
}

export default async function FacebookIntegrationPage() {
  const supabase = supabaseAdmin()

  // Migration probe — graceful banner if 137 isn't applied yet.
  const probe = await supabase.from('facebook_integrations').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="bg-white border-b border-portal-border px-6 py-4">
          <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Integrations
          </Link>
          <h1 className="portal-page-title">Facebook Marketing</h1>
        </div>
        <div className="p-6 max-w-3xl">
          <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/137_facebook_integration.sql</code> in the Supabase SQL editor to enable this integration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const [integrationRes, campaignsRes, advertisersRes, logRes] = await Promise.all([
    supabase.from('facebook_integrations')
      .select('id, ad_account_id, ad_account_name, business_id, connected_at, last_sync_at, last_sync_status, last_sync_error, last_sync_campaign_count, last_sync_metric_count, is_active')
      .eq('market', 'rrp')
      .maybeSingle(),
    supabase.from('facebook_campaigns')
      .select('id, fb_campaign_id, name, status, effective_status, objective, advertiser_id, advertiser_mapping_source, parsed_slug, last_synced_at')
      .order('last_synced_at', { ascending: false }),
    supabase.from('advertiser_accounts')
      .select('id, business_name, slug')
      .order('business_name', { ascending: true }),
    supabase.from('facebook_sync_log')
      .select('id, started_at, finished_at, status, campaign_count, metric_count, error, triggered_by')
      .order('started_at', { ascending: false })
      .limit(10),
  ])

  const integration = (integrationRes.data ?? null) as FacebookIntegrationRow | null
  const campaigns   = (campaignsRes.data   ?? []) as FacebookCampaignRow[]
  const advertisers = (advertisersRes.data ?? []) as AdvertiserOption[]
  const recentSyncs = (logRes.data         ?? []) as SyncLogRow[]

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Integrations
        </Link>
        <h1 className="portal-page-title">Facebook Marketing</h1>
        <p className="portal-page-subtitle">
          Pulls campaign performance from your Meta ad account nightly. Drives the advertiser monthly report.
        </p>
      </div>

      <div className="p-6 max-w-5xl">
        <FacebookIntegrationClient
          integration={integration}
          campaigns={campaigns}
          advertisers={advertisers}
          recentSyncs={recentSyncs}
        />
      </div>
    </div>
  )
}
