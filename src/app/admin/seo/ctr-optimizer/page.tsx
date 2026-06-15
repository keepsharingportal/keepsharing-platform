// ── /admin/seo/ctr-optimizer ──────────────────────────────────────────
//
// Articles with high impressions but lower CTR than the position curve
// predicts. The title or meta description isn't earning the click.
// Each row deep-links to the article's SEO editor with a pre-filled
// "rewrite title for SERP appeal" suggestion.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { isGscConfigured } from '@/lib/seo/gsc'
import { findCtrUnderperformers } from '@/lib/seo/ctr-optimizer'
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'CTR optimizer — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function CtrOptimizerPage({ searchParams }: Props) {
  await requireAdmin()
  const { brand } = await searchParams
  const sb = createAdminClient()
  const brandSlug = brand && MARKETS.find(m => m.slug === brand) ? brand : null

  if (!isGscConfigured()) {
    return (
      <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
        <div className="page-header">
          <div>
            <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text"><ArrowLeft size={11} /> SEO</Link>
            <h1 className="ph-title" style={{ marginTop: 6 }}>CTR optimizer</h1>
          </div>
        </div>
        <div className="content-body">
          <div className="card" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
            <strong>Search Console not connected.</strong>
            <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 6 }}>
              CTR optimizer needs GSC click + impression data. Connect from <Link href="/admin/seo" className="text-portal-blue fw-700">/admin/seo</Link>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const result = await findCtrUnderperformers(sb, brandSlug, 28)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} /> SEO
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>
            <TrendingDown size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            CTR optimizer
          </h1>
          <div className="text-muted text-sm">
            Articles ranking well but not earning clicks — title and meta description rewrites
            with the most leverage.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Brand filter */}
        <div style={{ marginBottom: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <BrandChip slug={null} active={brandSlug === null} label="All brands" />
          {MARKETS.map(m => (
            <BrandChip key={m.slug} slug={m.slug} active={brandSlug === m.slug} label={m.displayName} />
          ))}
        </div>

        <div className="stats-row" style={{ marginBottom: 14 }}>
          <div className="stat-card"><div className="stat-num">{result.totalArticles.toLocaleString()}</div><div className="stat-label">Articles in window</div></div>
          <div className="stat-card"><div className="stat-num has-red">{result.worstPerformers.length}</div><div className="stat-label">Under-performing</div></div>
          <div className="stat-card"><div className="stat-num has-green">{result.bestPerformers.length}</div><div className="stat-label">Over-performing</div></div>
        </div>

        <div className="card" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5, padding: 12 }}>
          <strong style={{ marginBottom: 4, display: 'block' }}>How it works</strong>
          <p className="text-portal-sub" style={{ fontSize: 12 }}>
            For each article with ≥200 impressions/28d, we compare its actual CTR to the position-
            expected CTR (1st place ≈ 27%, page 2 ≈ 1%). Articles where actual is &gt;0.5pt below
            expected are sorted by leverage (deficit × impressions) — highest impact at the top.
          </p>
        </div>

        {/* ── UNDER-PERFORMERS table ───────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)', borderLeft: '3px solid var(--color-portal-red)' }}>
            <strong className="text-portal-text" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={12} /> Under-performing ({result.worstPerformers.length})
            </strong>
            <div className="text-portal-sub" style={{ fontSize: 11 }}>Title or meta description is leaving clicks on the table.</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--color-portal-bg)' }}>
              <tr style={{ textAlign: 'left' }}>
                <Th>Article</Th>
                <Th center>Pos</Th>
                <Th center>Impressions</Th>
                <Th center>Actual CTR</Th>
                <Th center>Expected</Th>
                <Th center>Missing clicks</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {result.worstPerformers.length === 0 && (
                <tr><Td colSpan={7} center><span className="text-portal-sub">No under-performers in window.</span></Td></tr>
              )}
              {result.worstPerformers.map(r => {
                const missingClicks = Math.round(r.ctrDeficit * r.impressions)
                const editorHref = r.articleId
                  ? `/admin/articles/${r.articleId}/seo?suggestion=${encodeURIComponent(buildSuggestion(r))}&from=ctr-optimizer`
                  : null
                return (
                  <tr key={r.pagePath} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td>
                      <div className="fw-700" style={{ fontSize: 13 }}>{r.title ?? shortPath(r.pagePath)}</div>
                      <div className="text-portal-sub" style={{ fontSize: 11 }}>
                        <code>{r.pagePath}</code>
                      </div>
                    </Td>
                    <Td center>{r.avgPosition.toFixed(1)}</Td>
                    <Td center>{r.impressions.toLocaleString()}</Td>
                    <Td center>
                      <span style={{ color: 'var(--color-portal-red)', fontWeight: 700 }}>{(r.ctr * 100).toFixed(2)}%</span>
                    </Td>
                    <Td center>{(r.expectedCtr * 100).toFixed(2)}%</Td>
                    <Td center>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px',
                        background: 'var(--color-portal-red-lt, #fee2e2)',
                        color: 'var(--color-portal-red)',
                        borderRadius: 10, fontWeight: 700, fontSize: 12,
                      }}>~{missingClicks.toLocaleString()}</span>
                    </Td>
                    <Td>
                      {editorHref ? (
                        <Link href={editorHref} className="text-portal-blue fw-700" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          Rewrite <ArrowRight size={10} />
                        </Link>
                      ) : <span className="text-portal-sub" style={{ fontSize: 11 }}>—</span>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── OVER-PERFORMERS table — small ───────────────── */}
        {result.bestPerformers.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)', borderLeft: '3px solid var(--color-portal-green)' }}>
              <strong className="text-portal-text" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={12} /> Over-performing ({result.bestPerformers.length})
              </strong>
              <div className="text-portal-sub" style={{ fontSize: 11 }}>
                Titles + descriptions worth modeling — way above what the position predicts.
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: 'var(--color-portal-bg)' }}>
                <tr style={{ textAlign: 'left' }}>
                  <Th>Article</Th>
                  <Th center>Pos</Th>
                  <Th center>CTR</Th>
                  <Th center>Expected</Th>
                </tr>
              </thead>
              <tbody>
                {result.bestPerformers.map(r => (
                  <tr key={r.pagePath} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td>
                      <div className="fw-700" style={{ fontSize: 13 }}>{r.title ?? shortPath(r.pagePath)}</div>
                    </Td>
                    <Td center>{r.avgPosition.toFixed(1)}</Td>
                    <Td center><span style={{ color: 'var(--color-portal-green)', fontWeight: 700 }}>{(r.ctr * 100).toFixed(2)}%</span></Td>
                    <Td center>{(r.expectedCtr * 100).toFixed(2)}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

import type { CtrFinding } from '@/lib/seo/ctr-optimizer'

function buildSuggestion(f: CtrFinding): string {
  const missing = Math.round(f.ctrDeficit * f.impressions)
  return `This article ranks at position ${f.avgPosition.toFixed(1)} with ${f.impressions.toLocaleString()} impressions/28d but only a ${(f.ctr * 100).toFixed(2)}% CTR — expected at this position is ~${(f.expectedCtr * 100).toFixed(2)}%. You're leaving ~${missing} clicks on the table. Rewrite the SEO title to be more specific + benefit-driven (numbers, location, year work well), and rewrite the meta description so it answers the searcher's question directly in the first 150 characters.`
}

function BrandChip({ slug, active, label }: { slug: string | null; active: boolean; label: string }) {
  const href = slug ? `/admin/seo/ctr-optimizer?brand=${slug}` : '/admin/seo/ctr-optimizer'
  return (
    <Link
      href={href}
      style={{
        padding: '6px 12px', borderRadius: 14, fontSize: 12, fontWeight: 700, textDecoration: 'none',
        background: active ? 'var(--color-portal-navy)' : 'white',
        color:      active ? 'white' : 'var(--color-portal-text)',
        border: `1px solid ${active ? 'var(--color-portal-navy)' : 'var(--color-portal-border)'}`,
      }}
    >{label}</Link>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th style={{
      padding: '10px 14px', fontSize: 11, fontWeight: 700,
      color: 'var(--color-portal-sub)',
      textTransform: 'uppercase', letterSpacing: '.4px',
      textAlign: center ? 'center' : 'left',
    }}>{children}</th>
  )
}

function Td({ children, center, colSpan }: { children?: React.ReactNode; center?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: center ? 'center' : 'left' }}>{children}</td>
  )
}

function shortPath(p: string): string { return p.length <= 36 ? p : p.slice(0, 18) + '…' + p.slice(-15) }
