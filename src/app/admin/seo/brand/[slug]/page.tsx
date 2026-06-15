// ── /admin/seo/brand/[slug] — per-brand GSC dashboard ────────────────────
//
// Hit by clicking a brand health card on /admin/seo. Five-panel layout:
//   1. Header stats: impressions / clicks / CTR / avg position vs prior window
//   2. Sparkline chart: daily impressions + clicks for the window
//   3. Movers list (≥3 pos improvement)
//   4. Losers list (≥3 pos regression)
//   5. Opportunities list (page-2 queries with most impressions)
//
// Access: super/admin see any brand; publisher/editor must have the
// slug in allowedMarkets. 403 otherwise.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { isGscConfigured } from '@/lib/seo/gsc'
import { buildBrandGscStats, type QueryMover } from '@/lib/seo/gsc-brand-stats'
import { computeBrandHealth } from '@/lib/seo/brand-health'
import { assertBrandAccess } from '@/lib/seo/admin-scope'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Target, ArrowRight, FileText, Search } from 'lucide-react'

export const metadata: Metadata = { title: 'Brand SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function BrandSeoDashboard({ params }: Props) {
  const ctx = await requireAdmin()
  const { slug } = await params
  const market = MARKETS.find(m => m.slug === slug)
  if (!market) notFound()
  assertBrandAccess(ctx, slug)

  const sb     = createAdminClient()
  const health = await computeBrandHealth(sb, slug)
  const stats  = isGscConfigured() ? await buildBrandGscStats(sb, slug, 28) : null
  const max    = stats ? Math.max(1, ...stats.daily.map(d => d.impressions)) : 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
              <ArrowLeft size={11} /> SEO Command Center
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-[18px] font-bold text-portal-text">{market.displayName}</h1>
              <HealthPill score={health.score} grade={health.grade} />
            </div>
            <p className="text-[12px] text-portal-sub mt-1">
              Brand health {health.score}/100 ({health.grade}) · live GSC roll-up + movers + opportunities.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/admin/seo/audit-reports?brand=${slug}`} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
              <FileText size={14} /> Weekly audit
            </Link>
            <Link href={`/admin/seo/query-briefs?brand=${slug}`} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
              <Search size={14} /> Query briefs
            </Link>
            <Link href={`/admin/seo/ctr-optimizer?brand=${slug}`} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90">
              CTR optimizer
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {!stats ? (
            <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
              <strong className="text-[13px] text-portal-text">Search Console not connected.</strong>
              <p className="text-[12px] text-portal-sub mt-1">
                Per-brand dashboard lights up after env vars are set + a sync runs. Connect from{' '}
                <Link href="/admin/seo" className="text-portal-blue font-bold">/admin/seo</Link>.
              </p>
            </div>
          ) : (
            <>
              {/* ── Totals strip with WoW deltas ───────────────── */}
              <div className="grid grid-cols-4 gap-3">
                <Stat label="Impressions" cur={stats.totals.impressions} prv={stats.totalsPrev.impressions} />
                <Stat label="Clicks"      cur={stats.totals.clicks}      prv={stats.totalsPrev.clicks} />
                <Stat label="CTR"         cur={pct(stats.totals.ctr)}    prv={pct(stats.totalsPrev.ctr)} format="raw" />
                <Stat label="Avg position"
                      cur={stats.totals.avgPosition.toFixed(1)}
                      prv={stats.totalsPrev.avgPosition.toFixed(1)}
                      format="raw"
                      positionInverted />
              </div>

              {/* ── Daily chart ──────────────────────────────── */}
              <div className="bg-white border border-portal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-[13px] text-portal-text">
                    Daily impressions · clicks · last {stats.windowDays} days
                  </strong>
                  <span className="text-[11px] text-portal-sub">
                    Compared against the previous {stats.comparedAgainst}-day window.
                  </span>
                </div>
                {stats.daily.length === 0 ? (
                  <div className="text-[12px] text-portal-sub p-3">
                    No daily rows for this brand yet — has the GSC importer run for this property?
                  </div>
                ) : (
                  <div className="flex items-end gap-0.5" style={{ height: 120 }}>
                    {stats.daily.map(d => {
                      const h  = Math.max(2, Math.round((d.impressions / max) * 110))
                      const ch = d.impressions > 0 ? Math.max(1, Math.round((d.clicks / d.impressions) * h)) : 0
                      return (
                        <div key={d.date}
                          title={`${d.date} · ${d.impressions} imp · ${d.clicks} clk · pos ${d.avgPosition.toFixed(1)}`}
                          className="flex-1 bg-portal-bg rounded-sm relative"
                          style={{ height: h }}>
                          {ch > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-portal-blue rounded-sm" style={{ height: ch }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Three-up: movers / losers / opportunities ── */}
              <div className="grid grid-cols-3 gap-3">
                <MoverPanel title="Movers — climbed ≥3 positions" tone="green" icon={<ArrowUpRight size={12} />}   rows={stats.movers}        kind="mover" />
                <MoverPanel title="Losers — dropped ≥3 positions"  tone="red"   icon={<ArrowDownRight size={12} />} rows={stats.losers}        kind="loser" />
                <MoverPanel title="Opportunities — page-2 queries" tone="blue"  icon={<Target size={12} />}         rows={stats.opportunities} kind="opp" />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function HealthPill({ score, grade }: { score: number; grade: string }) {
  const tone = score >= 85 ? 'bg-portal-green'
             : score >= 70 ? 'bg-portal-blue'
             : score >= 50 ? 'bg-portal-amber'
             :               'bg-portal-red'
  return (
    <span className={`inline-flex items-center gap-1.5 ${tone} text-white text-[12px] font-bold px-2 py-1 rounded-full`}>
      {score}/100 · {grade}
    </span>
  )
}

function Stat({ label, cur, prv, format, positionInverted }: {
  label: string
  cur: number | string
  prv: number | string
  format?: 'raw'
  positionInverted?: boolean
}) {
  const curNum = typeof cur === 'number' ? cur : parseFloat(cur)
  const prvNum = typeof prv === 'number' ? prv : parseFloat(prv)
  let delta = ''
  let tone: 'green' | 'red' | 'neutral' = 'neutral'
  if (Number.isFinite(curNum) && Number.isFinite(prvNum) && prvNum !== 0) {
    const change    = curNum - prvNum
    const pctChange = (change / Math.abs(prvNum)) * 100
    delta = `${change > 0 ? '+' : ''}${pctChange.toFixed(1)}%`
    if (Math.abs(pctChange) >= 1) {
      tone = positionInverted
        ? (change < 0 ? 'green' : 'red')
        : (change > 0 ? 'green' : 'red')
    }
  }
  const deltaColor = tone === 'green' ? 'text-portal-green' : tone === 'red' ? 'text-portal-red' : 'text-portal-sub'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="text-[22px] font-black text-portal-text">
        {format === 'raw' ? cur : (typeof cur === 'number' ? cur.toLocaleString() : cur)}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">
        {label}
        {delta && <span className={`ml-2 ${deltaColor}`}>{delta}</span>}
      </div>
    </div>
  )
}

function MoverPanel({ title, tone, icon, rows, kind }: {
  title: string
  tone:  'green' | 'red' | 'blue'
  icon:  React.ReactNode
  rows:  QueryMover[]
  kind:  'mover' | 'loser' | 'opp'
}) {
  const borderColor = tone === 'green' ? 'var(--color-portal-green)'
                    : tone === 'red'   ? 'var(--color-portal-red)'
                    :                    'var(--color-portal-blue)'
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: `3px solid ${borderColor}` }}>
        <strong className="text-[12px] font-bold text-portal-text inline-flex items-center gap-1.5">
          {icon} {title}
        </strong>
      </div>
      <div className="divide-y divide-portal-border">
        {rows.length === 0 && (
          <div className="text-[12px] text-portal-sub p-3">None this window.</div>
        )}
        {rows.map((r, i) => (
          <div key={i} className="p-3">
            <div className="text-[12px] font-bold text-portal-text mb-1">&ldquo;{r.query}&rdquo;</div>
            <div className="text-[11px] text-portal-sub leading-relaxed">
              {kind === 'opp'   && <>pos {r.currentPos.toFixed(1)} · {r.impressionsNow.toLocaleString()} imp</>}
              {kind !== 'opp'   && <>pos {r.previousPos.toFixed(1)} → {r.currentPos.toFixed(1)} · {r.impressionsNow.toLocaleString()} imp</>}
            </div>
            {r.topArticleId && (
              <Link href={`/admin/articles/${r.topArticleId}/seo`} className="text-portal-blue text-[11px] font-bold inline-flex items-center gap-1 mt-1.5">
                Open SEO editor <ArrowRight size={10} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function pct(n: number): string { return `${(n * 100).toFixed(2)}%` }
