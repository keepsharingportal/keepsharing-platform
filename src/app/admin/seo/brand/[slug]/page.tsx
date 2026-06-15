// ── /admin/seo/brand/[slug] ───────────────────────────────────────────────
//
// Per-brand GSC dashboard. Hit by clicking a brand health card on
// /admin/seo. Five-panel layout:
//   - Header stats: impressions / clicks / CTR / avg position vs prior window
//   - Sparkline chart: daily impressions + clicks for the window
//   - Movers list: queries that improved ≥3 positions
//   - Losers list:  queries that dropped ≥3 positions
//   - Opportunities: queries currently on page 2 with most impressions

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { isGscConfigured } from '@/lib/seo/gsc'
import { buildBrandGscStats, type QueryMover } from '@/lib/seo/gsc-brand-stats'
import { computeBrandHealth } from '@/lib/seo/brand-health'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Target, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Brand SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function BrandSeoDashboard({ params }: Props) {
  await requireAdmin()
  const { slug } = await params
  const market = MARKETS.find(m => m.slug === slug)
  if (!market) notFound()

  const sb = createAdminClient()
  const health = await computeBrandHealth(sb, slug)

  // No GSC = useful page anyway. Show brand health + activation
  // pointer so the editor knows what's blocking richer data.
  if (!isGscConfigured()) {
    return (
      <Shell market={market} health={health}>
        <div className="card" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
          <strong>Search Console not connected.</strong>
          <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 6 }}>
            Brand-level GSC dashboard lights up after env vars are set + a sync runs. Connect from{' '}
            <Link href="/admin/seo" className="text-portal-blue fw-700">/admin/seo</Link>.
          </p>
        </div>
      </Shell>
    )
  }

  const stats = await buildBrandGscStats(sb, slug, 28)
  const max = Math.max(1, ...stats.daily.map(d => d.impressions))

  return (
    <Shell market={market} health={health}>

      {/* ── Totals strip with WoW deltas ───────────────────────── */}
      <div className="stats-row" style={{ marginBottom: 14 }}>
        <Stat label="Impressions" cur={stats.totals.impressions} prv={stats.totalsPrev.impressions} />
        <Stat label="Clicks"      cur={stats.totals.clicks}      prv={stats.totalsPrev.clicks} />
        <Stat label="CTR"         cur={pct(stats.totals.ctr)}    prv={pct(stats.totalsPrev.ctr)}    format="raw" />
        <Stat label="Avg position"
              cur={stats.totals.avgPosition.toFixed(1)}
              prv={stats.totalsPrev.avgPosition.toFixed(1)}
              format="raw"
              positionInverted />
      </div>

      {/* ── Daily chart ───────────────────────────────────────── */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong className="text-portal-text" style={{ fontSize: 13 }}>
            Daily impressions · clicks · last {stats.windowDays} days
          </strong>
          <span className="text-portal-sub" style={{ fontSize: 11 }}>
            Compared against the previous {stats.comparedAgainst}-day window.
          </span>
        </div>
        {stats.daily.length === 0 ? (
          <div className="text-portal-sub" style={{ fontSize: 12, padding: 12 }}>
            No daily rows for this brand yet — has the GSC importer run for this property?
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {stats.daily.map(d => {
              const h = Math.max(2, Math.round((d.impressions / max) * 110))
              const ch = d.impressions > 0 ? Math.max(1, Math.round((d.clicks / d.impressions) * h)) : 0
              return (
                <div key={d.date} title={`${d.date} · ${d.impressions} imp · ${d.clicks} clk · pos ${d.avgPosition.toFixed(1)}`}
                  style={{ flex: 1, height: h, background: 'var(--color-portal-bg)', borderRadius: 2, position: 'relative' }}>
                  {ch > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ch, background: 'var(--color-portal-blue)', borderRadius: 2 }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Three-up: movers / losers / opportunities ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MoverPanel title="Movers — climbed ≥3 positions" tone="green" icon={<ArrowUpRight size={12} />} rows={stats.movers} kind="mover" />
        <MoverPanel title="Losers — dropped ≥3 positions"  tone="red"   icon={<ArrowDownRight size={12} />} rows={stats.losers} kind="loser" />
        <MoverPanel title="Opportunities — page-2 queries" tone="blue"  icon={<Target size={12} />}        rows={stats.opportunities} kind="opp" />
      </div>
    </Shell>
  )
}

function Shell({
  market, health, children,
}: {
  market: typeof MARKETS[number]
  health: { score: number; grade: string }
  children: React.ReactNode
}) {
  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} /> SEO
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>{market.displayName}</h1>
          <div className="text-muted text-sm">
            Brand health <strong style={{ color: health.score >= 70 ? 'var(--color-portal-green)' : 'var(--color-portal-amber)' }}>
              {health.score}/100 ({health.grade})
            </strong> · live GSC roll-up + movers + losers + opportunities.
          </div>
        </div>
      </div>
      <div className="content-body overflow-y-auto">{children}</div>
    </div>
  )
}

function Stat({ label, cur, prv, format, positionInverted }: {
  label: string
  cur: number | string
  prv: number | string
  format?: 'raw'
  positionInverted?: boolean   // for avg position — lower is better
}) {
  const curNum = typeof cur === 'number' ? cur : parseFloat(cur)
  const prvNum = typeof prv === 'number' ? prv : parseFloat(prv)
  let delta = ''
  let tone: 'green' | 'red' | 'neutral' = 'neutral'
  if (Number.isFinite(curNum) && Number.isFinite(prvNum) && prvNum !== 0) {
    const change = curNum - prvNum
    const pctChange = ((change / Math.abs(prvNum)) * 100)
    delta = `${change > 0 ? '+' : ''}${pctChange.toFixed(1)}%`
    if (Math.abs(pctChange) >= 1) {
      if (positionInverted) {
        tone = change < 0 ? 'green' : 'red'
      } else {
        tone = change > 0 ? 'green' : 'red'
      }
    }
  }
  return (
    <div className="stat-card">
      <div className="stat-num">{format === 'raw' ? cur : (typeof cur === 'number' ? cur.toLocaleString() : cur)}</div>
      <div className="stat-label">
        {label}
        {delta && (
          <span style={{
            display: 'inline-block', marginLeft: 6,
            fontSize: 10, fontWeight: 700,
            color: tone === 'green' ? 'var(--color-portal-green)' : tone === 'red' ? 'var(--color-portal-red)' : 'var(--color-portal-sub)',
          }}>{delta}</span>
        )}
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
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-portal-border)', borderLeft: `3px solid ${borderColor}`, background: 'var(--color-portal-bg)' }}>
        <strong className="text-portal-text" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {icon} {title}
        </strong>
      </div>
      <div style={{ padding: 8 }}>
        {rows.length === 0 && (
          <div className="text-portal-sub" style={{ fontSize: 12, padding: 8 }}>None this window.</div>
        )}
        {rows.map((r, i) => (
          <div key={i} style={{
            padding: 8,
            borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--color-portal-border)',
          }}>
            <div className="fw-700 text-portal-text" style={{ fontSize: 12, marginBottom: 2 }}>“{r.query}”</div>
            <div className="text-portal-sub" style={{ fontSize: 11, lineHeight: 1.5 }}>
              {kind === 'opp'   && <>pos {r.currentPos.toFixed(1)} · {r.impressionsNow.toLocaleString()} imp</>}
              {kind === 'mover' && <>pos {r.previousPos.toFixed(1)} → {r.currentPos.toFixed(1)} · {r.impressionsNow.toLocaleString()} imp</>}
              {kind === 'loser' && <>pos {r.previousPos.toFixed(1)} → {r.currentPos.toFixed(1)} · {r.impressionsNow.toLocaleString()} imp</>}
            </div>
            {r.topArticleId && (
              <Link
                href={`/admin/articles/${r.topArticleId}/seo`}
                className="text-portal-blue fw-700"
                style={{ fontSize: 11, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}
              >
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
