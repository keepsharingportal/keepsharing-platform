// /admin/reports
// Landing page for client performance reports. Lists every advertiser
// account with their active placement count and lifetime totals so you
// can find the one you want to share or review.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BarChart3, Activity, ChevronRight, Eye, MousePointerClick } from 'lucide-react'
import { SectionHelp } from '@/components/admin/AdminHelp'

export const metadata = { title: 'Reports — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

interface AdvertiserSummary {
  id:             string
  slug:           string
  business_name:  string
  account_tier:   string | null
  placement_count: number
  active_count:    number
  impressions:    number
  clicks:         number
}

export default async function ReportsLandingPage() {
  const supabase = createAdminClient()

  const [{ data: advertisers }, { data: placements }] = await Promise.all([
    supabase.from('advertiser_accounts')
      .select('id, slug, business_name, account_tier')
      .order('business_name', { ascending: true }),
    supabase.from('ad_placements')
      .select('advertiser_account_id, is_active, impression_count, click_count'),
  ])

  const byAdvertiser: Record<string, AdvertiserSummary> = {}
  for (const a of (advertisers ?? []) as Array<{ id: string; slug: string; business_name: string; account_tier: string | null }>) {
    byAdvertiser[a.id] = {
      id: a.id, slug: a.slug, business_name: a.business_name, account_tier: a.account_tier,
      placement_count: 0, active_count: 0, impressions: 0, clicks: 0,
    }
  }
  for (const p of (placements ?? []) as Array<{ advertiser_account_id: string | null; is_active: boolean; impression_count: number | null; click_count: number | null }>) {
    if (!p.advertiser_account_id) continue
    const row = byAdvertiser[p.advertiser_account_id]
    if (!row) continue
    row.placement_count++
    if (p.is_active) row.active_count++
    row.impressions += p.impression_count ?? 0
    row.clicks      += p.click_count      ?? 0
  }

  // Sort: most active first, then by lifetime impressions
  const summaries = Object.values(byAdvertiser).sort((a, z) => {
    if (a.active_count !== z.active_count) return z.active_count - a.active_count
    if (a.impressions  !== z.impressions)  return z.impressions  - a.impressions
    return a.business_name.localeCompare(z.business_name)
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl">

      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Reports
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Per-advertiser performance dashboards. Real metrics — impressions, clicks,
          leads, and traffic source — that you can share with clients.
        </p>
      </div>

      <SectionHelp variant="tip" title="Sharing with a client">
        Open an advertiser&apos;s report, choose a date range, and screenshot or copy the
        URL. Every metric is tagged <strong>Measured</strong> / <strong>Estimated</strong> /
        <strong> Not tracked yet</strong> so nothing on a client report is fluffed.
      </SectionHelp>

      {summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center bg-white">
          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No advertiser accounts yet</p>
          <p className="text-xs text-gray-500 mt-1">Add one at <Link href="/admin/advertisers/onboarding" className="text-blue-600 hover:underline">Onboarding</Link>.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Business</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:block">Tier</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:block">Placements</div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right inline-flex items-center gap-1">
              <Eye size={10} /> Lifetime
            </div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right hidden md:inline-flex items-center gap-1">
              <MousePointerClick size={10} /> Clicks
            </div>
            <div />
          </div>

          <div className="divide-y divide-gray-100">
            {summaries.map(s => (
              <Link
                key={s.id}
                href={`/admin/reports/${s.slug}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.business_name}</p>
                  <p className="text-[11px] text-gray-400 truncate">/{s.slug}</p>
                </div>
                <div className="hidden md:block">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {s.account_tier ?? '—'}
                  </span>
                </div>
                <div className="hidden lg:block text-xs text-gray-500 tabular-nums">
                  {s.active_count > 0 ? <strong className="text-green-700">{s.active_count} active</strong> : <span className="text-gray-400">0 active</span>}
                  {' '}<span className="text-gray-400">/ {s.placement_count}</span>
                </div>
                <div className="text-sm tabular-nums text-right font-semibold text-gray-700">
                  {s.impressions.toLocaleString('en-US')}
                </div>
                <div className="text-sm tabular-nums text-right font-semibold text-gray-700 hidden md:block">
                  {s.clicks.toLocaleString('en-US')}
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
