// /admin/advertisers/[id]/report — Printable monthly performance report.
//
// One advertiser, one month, every metric the platform tracks for them —
// in a layout designed to screenshot or save as PDF and send to the
// client. No admin chrome (sidebar/header) so it prints cleanly.
//
// Defaults to last 30 days; ?month=YYYY-MM in the URL targets a specific
// month. Future enhancement: arrows to step month-by-month.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { RATE_CARD } from '@/lib/ads/rate-card'
import {
  ArrowLeft, Eye, MousePointer, Calendar, Globe, Smartphone,
} from 'lucide-react'
import { PrintButton } from './PrintButton'

export const metadata: Metadata = { title: 'Monthly Report — Admin' }
export const dynamic  = 'force-dynamic'

interface Props {
  params:       Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}

function fmtMonth(iso: string): string {
  return new Date(iso + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function MonthlyReportPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const { month: monthParam } = await searchParams

  const supabase = createAdminClient()

  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, package_tier, contact_name, contact_email, logo_url')
    .eq('id', id)
    .maybeSingle()
  if (!acct) return notFound()

  const a = acct as Record<string, unknown>
  const name      = String(a.business_name ?? 'Unknown')
  const slug      = String(a.slug ?? '')
  const tier      = String(a.package_tier ?? '')
  const logoUrl   = a.logo_url ? String(a.logo_url) : null

  // Time window — current calendar month by default, or ?month=YYYY-MM
  const now    = new Date()
  const ym     = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const start  = new Date(ym + '-01T00:00:00').toISOString()
  const endDt  = new Date(ym + '-01T00:00:00')
  endDt.setMonth(endDt.getMonth() + 1)
  const end    = endDt.toISOString()

  // Ad events (impressions + clicks) within the window for this advertiser's
  // placements. Group by placement so we can show per-ad performance.
  const { data: placementRows } = await supabase
    .from('ad_placements')
    .select('id, placement_type, context_slug, ad_headline, ad_eyebrow, is_active')
    .eq('advertiser_account_id', id)
  type Pl = { id: string; placement_type: string; context_slug: string | null; ad_headline: string | null; ad_eyebrow: string | null; is_active: boolean }
  const plRows = (placementRows ?? []) as Pl[]
  const placementIds = plRows.map(p => p.id)

  let monthImpressions = 0
  let monthClicks      = 0
  type PerPlacement = Record<string, { impressions: number; clicks: number }>
  const perPlacement: PerPlacement = {}

  if (placementIds.length > 0) {
    const { data: events } = await supabase
      .from('ad_events')
      .select('ad_placement_id, event_type')
      .in('ad_placement_id', placementIds)
      .gte('occurred_at', start)
      .lt('occurred_at', end)
    for (const ev of (events ?? []) as Array<{ ad_placement_id: string; event_type: string }>) {
      const bucket = perPlacement[ev.ad_placement_id] ??= { impressions: 0, clicks: 0 }
      if (ev.event_type === 'impression') { bucket.impressions++; monthImpressions++ }
      else if (ev.event_type === 'click')  { bucket.clicks++;      monthClicks++ }
    }
  }

  const monthCtr = monthImpressions > 0 ? ((monthClicks / monthImpressions) * 100).toFixed(2) : '—'

  // QR codes (short_links) — we display lifetime counts since per-month QR
  // tracking would need a join on the click events table. Phase 2 can break
  // it out by month.
  type QrRow = { id: string; shortcode: string; destination: string; label: string | null; click_count: number; utm_campaign: string | null }
  let qrCodes: QrRow[] = []
  const qrRes = await supabase
    .from('short_links')
    .select('id, shortcode, destination, label, click_count, utm_campaign')
    .eq('advertiser_account_id', id)
    .order('click_count', { ascending: false })
  if (!qrRes.error) qrCodes = (qrRes.data ?? []) as QrRow[]
  const totalQrScans = qrCodes.reduce((s, q) => s + (q.click_count ?? 0), 0)

  return (
    <div className="flex-1 overflow-y-auto bg-white print:bg-white">
      {/* Admin chrome (hidden on print) */}
      <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center justify-between print:hidden">
        <Link href={`/admin/advertisers/${id}`} className="text-xs text-portal-sub hover:text-portal-text inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Back to {name}
        </Link>
        <PrintButton />
      </div>

      {/* Report body — clean, print-friendly */}
      <div className="max-w-4xl mx-auto p-10 md:p-14">
        {/* Header */}
        <div className="border-b-2 border-portal-blue pb-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-portal-blue mb-2">
            River Region Parents — Monthly Performance Report
          </p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={name} className="w-16 h-16 rounded-lg object-contain ring-1 ring-gray-200" />
              ) : null}
              <div>
                <h1 className="text-3xl font-bold text-portal-text">{name}</h1>
                {tier && <p className="text-sm text-portal-sub mt-0.5">{tier.replace(/-/g, ' ')}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider font-bold text-portal-muted">Reporting Period</p>
              <p className="text-lg font-bold text-portal-text inline-flex items-center gap-1.5 mt-0.5">
                <Calendar size={16} className="text-portal-blue" /> {fmtMonth(ym)}
              </p>
            </div>
          </div>
        </div>

        {/* Headline metrics */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-portal-sub mb-4">
            This Month at a Glance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Ad Impressions"      value={monthImpressions.toLocaleString()} icon={<Eye size={18} className="text-portal-blue" />} />
            <Stat label="Ad Clicks"           value={monthClicks.toLocaleString()}      icon={<MousePointer size={18} className="text-portal-blue" />} />
            <Stat label="Click-Through Rate"  value={monthCtr === '—' ? '—' : `${monthCtr}%`} icon={<span className="text-portal-blue font-bold text-sm">%</span>} />
            <Stat label="QR Scans (lifetime)" value={totalQrScans.toLocaleString()}    icon={<Smartphone size={18} className="text-portal-blue" />} />
          </div>
        </section>

        {/* Ad placement breakdown */}
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-portal-sub mb-4">
            Ad Performance by Placement
          </h2>
          {plRows.length === 0 ? (
            <p className="text-sm text-portal-sub italic">No active ad placements this month.</p>
          ) : (
            <div className="rounded-xl ring-1 ring-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-portal-bg border-b border-portal-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Placement</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Impressions</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Clicks</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {plRows.map(p => {
                    const stats   = perPlacement[p.id] ?? { impressions: 0, clicks: 0 }
                    const ctrCell = stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) + '%' : '—'
                    const rate    = RATE_CARD.find(r => r.placementType === p.placement_type)
                    const label   = rate?.label ?? p.placement_type.replace(/_/g, ' ')
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-portal-text">{label}</p>
                          {p.ad_headline && <p className="text-[11px] text-portal-sub mt-0.5 truncate max-w-xs">&ldquo;{p.ad_headline}&rdquo;</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-portal-text">{stats.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-portal-text">{stats.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold text-portal-blue">{ctrCell}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* QR codes */}
        {qrCodes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-portal-sub mb-4">
              QR Code Performance
            </h2>
            <div className="rounded-xl ring-1 ring-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-portal-bg border-b border-portal-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Short Link</th>
                    <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Label / Campaign</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub">Total Scans</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {qrCodes.map(q => (
                    <tr key={q.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-portal-text">/go/{q.shortcode}</p>
                        <p className="text-[11px] text-portal-sub truncate max-w-xs">→ {q.destination}</p>
                      </td>
                      <td className="px-4 py-3 text-portal-text">
                        {q.label ?? '—'}
                        {q.utm_campaign && <span className="text-[11px] text-portal-sub ml-1">· {q.utm_campaign}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-portal-blue">{q.click_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-portal-border flex items-center justify-between text-[11px] text-portal-muted">
          <span className="inline-flex items-center gap-1.5">
            <Globe size={11} /> riverregionparents.com
          </span>
          <span>Report generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#fdf0eb] ring-1 ring-portal-blue/15 p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-portal-blue/80 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-portal-text">{value}</p>
    </div>
  )
}
