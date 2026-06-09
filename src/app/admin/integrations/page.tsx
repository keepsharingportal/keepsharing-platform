// ── /admin/integrations ─────────────────────────────────────────────────────
// Index of external service connections. Each integration has its own page
// with setup walkthrough, status, and per-source admin controls. Today:
// Facebook. Future: Google Ads, Mailchimp, etc.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Megaphone, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Integrations — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function IntegrationsIndexPage() {
  const supabase = supabaseAdmin()

  // Probe — graceful if migration 137 hasn't run.
  const probe = await supabase.from('facebook_integrations').select('id').limit(1)
  const fbReady = !probe.error

  let fbConnected = false
  let fbName: string | null = null
  if (fbReady) {
    const { data } = await supabase
      .from('facebook_integrations')
      .select('is_active, ad_account_name, last_sync_status')
      .eq('market', 'rrp')
      .maybeSingle()
    const row = data as { is_active: boolean; ad_account_name: string | null; last_sync_status: string | null } | null
    fbConnected = !!row?.is_active
    fbName      = row?.ad_account_name ?? null
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <h1 className="portal-page-title">Integrations</h1>
        <p className="portal-page-subtitle">External data sources feeding the advertiser reports + site analytics.</p>
      </div>

      <div className="p-6 max-w-3xl">
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden divide-y divide-portal-border">
          <Link
            href="/admin/integrations/facebook"
            className="flex items-center gap-4 px-5 py-4 hover:bg-portal-bg transition-colors"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
              <Megaphone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-portal-text">Facebook Marketing</h2>
                {!fbReady ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-portal-amber bg-portal-amber-lt border border-portal-amber/30 px-1.5 py-0.5 rounded-full">
                    Migration pending
                  </span>
                ) : fbConnected ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 size={9} /> Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <AlertCircle size={9} /> Not connected
                  </span>
                )}
              </div>
              <p className="text-xs text-portal-sub mt-0.5 truncate">
                {fbConnected
                  ? `${fbName ?? 'Ad account connected'} — campaigns auto-mapped to advertisers via the [slug] naming convention.`
                  : 'Pull campaign spend / impressions / clicks / leads for the advertiser monthly report.'}
              </p>
            </div>
            <ChevronRight size={16} className="text-portal-muted shrink-0" />
          </Link>
        </div>

        <p className="text-[11px] text-portal-muted mt-3">
          More integrations (Google Ads, Mailchimp, GHL webhook delivery) live here as we wire them up.
        </p>
      </div>
    </div>
  )
}
