// /admin/advertisers/[id]/analytics — Analytics tab. Performance roll-
// ups across digital ad_placements and short_links, plus the launch
// button for the monthly report at /admin/advertisers/[id]/report.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import {
  Eye, MousePointer, BarChart3, RotateCw, FileText, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Analytics — Business — Admin' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function AnalyticsTab({ params }: Props) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  const [placementsRes, qrRes] = await Promise.all([
    supabase
      .from('ad_placements')
      .select('id, placement_type, ad_headline, is_active, archived_at, impression_count, click_count, rotation_group')
      .eq('advertiser_account_id', id),
    supabase
      .from('short_links')
      .select('id, shortcode, label, click_count, is_active')
      .eq('advertiser_account_id', id),
  ])

  type PlacementRow = {
    id: string; placement_type: string; ad_headline: string | null;
    is_active: boolean | null; archived_at: string | null;
    impression_count: number; click_count: number; rotation_group: string | null;
  }
  const plRows = (placementsRes.data ?? []) as PlacementRow[]
  type QrRow = { id: string; shortcode: string; label: string | null; click_count: number; is_active: boolean }
  const qrRows = (qrRes.error ? [] : (qrRes.data ?? [])) as QrRow[]

  const totalImpressions = plRows.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const totalClicks      = plRows.reduce((s, p) => s + (p.click_count ?? 0), 0)
  const ctr              = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : null
  const totalQrScans     = qrRows.reduce((s, q) => s + (q.click_count ?? 0), 0)
  const activeCount      = plRows.filter(p => p.is_active && !p.archived_at).length

  // Best performing placement (by CTR among those with > 10 impressions
  // — small denominators are noise). Used as the headline insight.
  const eligible = plRows.filter(p => (p.impression_count ?? 0) > 10)
  const best = eligible.length === 0 ? null : eligible.reduce((winner, p) => {
    const wCtr = (winner.click_count ?? 0) / Math.max(1, (winner.impression_count ?? 0))
    const pCtr = (p.click_count ?? 0)        / Math.max(1, (p.impression_count ?? 0))
    return pCtr > wCtr ? p : winner
  })
  const bestCtr = best ? ((best.click_count / Math.max(1, best.impression_count)) * 100).toFixed(2) : null

  // Top 5 placements by impression count for the breakdown card.
  const byImpressions = [...plRows].sort((a, b) => (b.impression_count ?? 0) - (a.impression_count ?? 0)).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* ── Headline metrics ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={<Eye size={16} />}         label="Ad Impressions" value={totalImpressions.toLocaleString()} />
        <MetricCard icon={<MousePointer size={16} />} label="Ad Clicks"       value={totalClicks.toLocaleString()} />
        <MetricCard icon={<BarChart3 size={16} />}    label="CTR"             value={ctr == null ? '—' : `${ctr}%`} />
        <MetricCard icon={<MousePointer size={16} />} label="QR Scans"        value={totalQrScans.toLocaleString()} />
      </div>

      {/* ── Monthly report CTA ──────────────────────────── */}
      <Link
        href={`/admin/advertisers/${id}/report`}
        className="group bg-white rounded-lg border border-portal-border p-5 flex items-center justify-between hover:ring-portal-blue hover:shadow-sm transition-all"
      >
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-portal-muted group-hover:text-portal-blue transition-colors" />
          <div>
            <p className="text-sm font-bold text-portal-text">Generate Monthly Report</p>
            <p className="text-xs text-portal-sub">Printable performance snapshot for this business&apos;s contacts.</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-gray-300 group-hover:text-portal-blue transition-colors" />
      </Link>

      {/* ── Best performer callout ──────────────────────── */}
      {best && bestCtr && (
        <section className="bg-portal-green-lt border border-emerald-200 rounded-lg p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-portal-green mb-1">Top performer</h3>
          <p className="text-sm text-emerald-900">
            <span className="font-bold">{best.ad_headline ?? best.placement_type.replace(/_/g, ' ')}</span>
            <span className="ml-2 text-portal-green">
              {bestCtr}% CTR · {best.impression_count.toLocaleString()} impressions · {best.click_count.toLocaleString()} clicks
            </span>
          </p>
        </section>
      )}

      {/* ── Per-placement breakdown ─────────────────────── */}
      <section className="bg-white rounded-lg border border-portal-border overflow-hidden">
        <header className="px-5 py-3 border-b border-portal-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">
            Placement Performance ({activeCount} active{plRows.length > activeCount && ` · ${plRows.length} total`})
          </h2>
        </header>
        {byImpressions.length === 0 ? (
          <div className="p-8 text-center text-sm text-portal-muted">
            No placement data yet. Once ads start running, performance shows up here.
          </div>
        ) : (
          <ul className="divide-y divide-portal-border">
            {byImpressions.map(p => {
              const ctrPct = p.impression_count > 0 ? ((p.click_count / p.impression_count) * 100).toFixed(2) : '—'
              return (
                <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <RotateCw size={11} className={p.rotation_group ? 'text-sky-500 shrink-0' : 'text-gray-300 shrink-0'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-portal-text truncate">
                      {p.ad_headline ?? p.placement_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-portal-sub shrink-0 tabular-nums">
                    <span><Eye size={10} className="inline mr-0.5" />{p.impression_count.toLocaleString()}</span>
                    <span><MousePointer size={10} className="inline mr-0.5" />{p.click_count.toLocaleString()}</span>
                    <span className="font-bold text-portal-text">{ctrPct}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Top QR codes ────────────────────────────────── */}
      {qrRows.length > 0 && (
        <section className="bg-white rounded-lg border border-portal-border overflow-hidden">
          <header className="px-5 py-3 border-b border-portal-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">QR Performance</h2>
          </header>
          <ul className="divide-y divide-portal-border">
            {[...qrRows].sort((a, b) => b.click_count - a.click_count).slice(0, 5).map(q => (
              <li key={q.id} className="px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-portal-text">/go/{q.shortcode}</p>
                  {q.label && <p className="text-[11px] text-portal-sub truncate">{q.label}</p>}
                </div>
                <span className="text-xs font-bold text-portal-text tabular-nums">
                  {q.click_count.toLocaleString()} scans
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-portal-border p-4">
      <div className="text-portal-muted mb-1">{icon}</div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-portal-muted">{label}</p>
      <p className="text-xl font-bold text-portal-text">{value}</p>
    </div>
  )
}
