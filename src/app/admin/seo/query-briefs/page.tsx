// ── /admin/seo/query-briefs ──────────────────────────────────────────────
//
// Two columns of editorial briefs derived from real GSC data:
//
//   IMPROVE: queries already ranked on an existing article at position
//            11-20. Click the row to open the article's SEO editor
//            with the query pre-filled as a pending suggestion.
//
//   WRITE:   queries with measurable impressions but no clear owner
//            article. Click the row to seed a new article draft.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGscConfigured } from '@/lib/seo/gsc'
import { buildQueryBriefs } from '@/lib/seo/query-briefs'
import { MARKETS } from '@/lib/markets'
import { ArrowLeft, ArrowRight, Search, TrendingUp, FileEdit } from 'lucide-react'

export const metadata: Metadata = { title: 'Query briefs — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function QueryBriefsPage({ searchParams }: Props) {
  await requireAdmin()
  const { brand } = await searchParams
  const sb = createAdminClient()
  const brandSlug = brand && MARKETS.find(m => m.slug === brand) ? brand : null

  // Short-circuit when GSC isn't connected — we have no data to brief on.
  if (!isGscConfigured()) {
    return (
      <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
        <div className="page-header">
          <div>
            <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={11} /> SEO
            </Link>
            <h1 className="ph-title" style={{ marginTop: 6 }}>Query briefs</h1>
          </div>
        </div>
        <div className="content-body">
          <div className="card" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
            <strong>Search Console not connected yet.</strong>
            <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 6 }}>
              Query briefs use real GSC click + impression data to recommend specific articles to
              improve and specific topics to write. Connect GSC from <Link href="/admin/seo" className="text-portal-blue fw-700">/admin/seo</Link>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const briefs = await buildQueryBriefs(sb, brandSlug, 28)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} /> SEO
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>
            <Search size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            Query briefs
          </h1>
          <div className="text-muted text-sm">
            Editorial briefs derived from the last 28 days of Search Console data.
            Improve = strengthen an existing article. Write = create a new article for a topic the site
            is bleeding traffic on.
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

        <div className="stats-row" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-num">{briefs.queriesAnalyzed.toLocaleString()}</div><div className="stat-label">Queries analyzed</div></div>
          <div className="stat-card"><div className="stat-num has-blue">{briefs.improveBriefs.length}</div><div className="stat-label">Improve briefs</div></div>
          <div className="stat-card"><div className="stat-num has-amber">{briefs.writeBriefs.length}</div><div className="stat-label">Write briefs</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* ── IMPROVE column ───────────────────────────── */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
              <strong className="text-portal-text" style={{ fontSize: 13 }}>
                <TrendingUp size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                Improve existing articles ({briefs.improveBriefs.length})
              </strong>
              <div className="text-portal-sub" style={{ fontSize: 11, marginTop: 2 }}>
                Position 11-20, dominant owner, ≥25 impressions/28d
              </div>
            </div>
            <div style={{ padding: 8 }}>
              {briefs.improveBriefs.length === 0 && (
                <div className="text-portal-sub" style={{ fontSize: 12, padding: 12 }}>
                  No improve briefs in window. (Likely no GSC data imported yet — run a sync from /admin/seo.)
                </div>
              )}
              {briefs.improveBriefs.map((b, i) => (
                <BriefRow key={i} brief={b} />
              ))}
            </div>
          </div>

          {/* ── WRITE column ──────────────────────────── */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
              <strong className="text-portal-text" style={{ fontSize: 13 }}>
                <FileEdit size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                Write new articles ({briefs.writeBriefs.length})
              </strong>
              <div className="text-portal-sub" style={{ fontSize: 11, marginTop: 2 }}>
                ≥100 impressions/28d, no page owns ≥40% of the query
              </div>
            </div>
            <div style={{ padding: 8 }}>
              {briefs.writeBriefs.length === 0 && (
                <div className="text-portal-sub" style={{ fontSize: 12, padding: 12 }}>
                  No write briefs in window.
                </div>
              )}
              {briefs.writeBriefs.map((b, i) => (
                <BriefRow key={i} brief={b} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import type { QueryBrief } from '@/lib/seo/query-briefs'

function BriefRow({ brief }: { brief: QueryBrief }) {
  const isImprove = brief.kind === 'improve'
  const editorHref = isImprove && brief.topArticleId
    ? `/admin/articles/${brief.topArticleId}/seo?suggestion=${encodeURIComponent(`Move "${brief.query}" from position ${brief.avgPosition.toFixed(1)} to page 1: add it to the title or first paragraph, build out the H2 covering it, and add 2+ internal links pointing here from related articles.`)}&from=query-brief`
    : null

  return (
    <div style={{
      padding: 10,
      borderBottom: '1px solid var(--color-portal-border)',
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-700 text-portal-text" style={{ fontSize: 13, marginBottom: 4 }}>“{brief.query}”</div>
        <div className="text-portal-sub" style={{ fontSize: 11, lineHeight: 1.5 }}>
          {brief.impressions.toLocaleString()} impressions · {brief.clicks} clicks · avg pos {brief.avgPosition.toFixed(1)}
        </div>
        {isImprove && brief.topPagePath && (
          <div className="text-portal-sub" style={{ fontSize: 11, marginTop: 4 }}>
            Owner: <code style={{ fontSize: 10 }}>{brief.topPagePath}</code>
          </div>
        )}
        {!isImprove && brief.candidates && brief.candidates.length > 0 && (
          <div className="text-portal-sub" style={{ fontSize: 10, marginTop: 4 }}>
            Scattered across: {brief.candidates.slice(0, 3).map(c => shortPath(c.pageUrl)).join(', ')}
            {brief.candidates.length > 3 && ` +${brief.candidates.length - 3}`}
          </div>
        )}
      </div>
      {editorHref ? (
        <Link href={editorHref} className="text-portal-blue fw-700" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
          Improve <ArrowRight size={10} />
        </Link>
      ) : !isImprove ? (
        <Link
          href={`/admin/articles/new?queryBrief=${encodeURIComponent(brief.query)}&impressions=${brief.impressions}`}
          className="text-portal-blue fw-700"
          style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}
        >
          New article <ArrowRight size={10} />
        </Link>
      ) : null}
    </div>
  )
}

function BrandChip({ slug, active, label }: { slug: string | null; active: boolean; label: string }) {
  const href = slug ? `/admin/seo/query-briefs?brand=${slug}` : '/admin/seo/query-briefs'
  return (
    <Link
      href={href}
      style={{
        padding: '6px 12px',
        borderRadius: 14,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        background: active ? 'var(--color-portal-navy)' : 'white',
        color:      active ? 'white' : 'var(--color-portal-text)',
        border: `1px solid ${active ? 'var(--color-portal-navy)' : 'var(--color-portal-border)'}`,
      }}
    >{label}</Link>
  )
}

function shortPath(url: string): string {
  let p = url
  try { p = new URL(url).pathname } catch { /* ignore */ }
  if (p.length > 36) return p.slice(0, 18) + '…' + p.slice(-15)
  return p
}
