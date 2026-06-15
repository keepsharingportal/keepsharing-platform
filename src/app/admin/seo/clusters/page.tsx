// ── /admin/seo/clusters — Topical authority dashboard ───────────────────
//
// Groups every published article under its strongest-matching brand
// pillar. For each pillar shows: cluster size, total impressions,
// avg position, avg article SEO score, internal links pointing IN,
// top contributing articles, and a one-line health recommendation.
//
// Surfaces orphan articles (matched no pillar) so the editor can
// reassign or add a new pillar to capture them.
//
// Brand visibility honors role. Defaults to the caller's first allowed
// brand; brand chip filter swaps the view.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSeoAllowedBrands, resolveBrandParam } from '@/lib/seo/admin-scope'
import { buildTopicClusters, type ClusterReport, type ClusterArticle } from '@/lib/seo/topic-clusters'
import { ArrowLeft, ArrowRight, Layers, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Topic clusters — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function ClustersPage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const { brand } = await searchParams
  const sb       = createAdminClient()
  const allowed  = getSeoAllowedBrands(ctx)
  const brandSlug = resolveBrandParam(ctx, brand) ?? allowed[0]?.slug ?? 'rrp'

  const result = await buildTopicClusters(sb, brandSlug)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Layers size={16} className="inline -translate-y-0.5 mr-1" /> Topical authority
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Google&apos;s strongest E-E-A-T signal is owning a topic, not mentioning it. Each pillar from this
          brand&apos;s SEO Profile becomes a cluster — these reports tell you which pillars are working and
          which need investment.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Brand chips */}
          {allowed.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {allowed.map(m => (
                <Link
                  key={m.slug}
                  href={`/admin/seo/clusters?brand=${m.slug}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                    brandSlug === m.slug
                      ? 'bg-portal-navy text-white border-portal-navy'
                      : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
                  }`}
                >{m.displayName}</Link>
              ))}
            </div>
          )}

          {result.pillars.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
              <strong className="text-[13px] text-portal-text">No pillars defined for this brand yet.</strong>
              <p className="text-[12px] text-portal-sub mt-1">
                Open <Link href={`/admin/seo/brand-profile?brand=${brandSlug}`} className="text-portal-blue font-bold">Brand SEO Profile</Link> →
                click <strong>Generate first draft (Claude)</strong> to seed pillars, then come back here to see how
                your existing articles cluster.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                <Stat label="Pillars"              value={String(result.pillars.length)} />
                <Stat label="Clustered articles"   value={String(result.pillars.reduce((s, p) => s + p.articleCount, 0))} tone="blue" />
                <Stat label="Orphan articles"      value={String(result.orphans.length)} tone={result.orphans.length === 0 ? 'green' : 'amber'} />
                <Stat label="Total cluster imp."   value={result.pillars.reduce((s, p) => s + p.totalImpressions, 0).toLocaleString()} />
              </div>

              <div className="space-y-3">
                {result.pillars.map(p => <PillarRow key={p.pillar.id} report={p} />)}
              </div>

              {result.orphans.length > 0 && (
                <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
                  <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
                    <strong className="text-[13px] text-portal-text">
                      Orphan articles ({result.orphans.length})
                    </strong>
                    <div className="text-[11px] text-portal-sub mt-0.5">
                      No pillar matched these. Either re-tag with a pillar&apos;s focus keyword, or add a new pillar to capture them.
                    </div>
                  </div>
                  <div className="divide-y divide-portal-border">
                    {result.orphans.slice(0, 12).map(a => (
                      <ArticleRow key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function PillarRow({ report }: { report: ClusterReport }) {
  const tone = report.healthGrade === 'strong'     ? 'green'
             : report.healthGrade === 'developing' ? 'amber'
             :                                       'red'
  const border = tone === 'green' ? 'var(--color-portal-green)' : tone === 'amber' ? 'var(--color-portal-amber)' : 'var(--color-portal-red)'
  const Icon   = tone === 'green' ? CheckCircle2 : tone === 'amber' ? AlertCircle : AlertTriangle
  const iconClass = tone === 'green' ? 'text-portal-green' : tone === 'amber' ? 'text-portal-amber' : 'text-portal-red'

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden" style={{ borderLeft: `3px solid ${border}` }}>
      <div className="bg-portal-bg px-4 py-3 border-b border-portal-border flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Icon size={16} className={`shrink-0 mt-0.5 ${iconClass}`} />
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-portal-text">{report.pillar.title}</div>
            <div className="text-[11px] text-portal-sub mt-0.5">
              <code>{report.pillar.target_keyword}</code>
              {report.pillar.supporting_keywords.length > 0 && (
                <span> · supporting: {report.pillar.supporting_keywords.slice(0, 4).join(', ')}{report.pillar.supporting_keywords.length > 4 ? `, +${report.pillar.supporting_keywords.length - 4}` : ''}</span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${
          tone === 'green' ? 'bg-portal-green-lt text-portal-green' :
          tone === 'amber' ? 'bg-portal-amber-lt text-portal-amber' :
                             'bg-portal-red-lt text-portal-red'
        }`}>
          {report.healthGrade}
        </span>
      </div>

      <div className="px-4 py-3 grid grid-cols-5 gap-2">
        <MiniStat label="Articles"     value={String(report.articleCount)} />
        <MiniStat label="Impressions"  value={report.totalImpressions.toLocaleString()} />
        <MiniStat label="Avg position" value={report.avgPosition > 0 ? report.avgPosition.toFixed(1) : '—'} />
        <MiniStat label="Avg score"    value={String(report.avgSeoScore || '—')} />
        <MiniStat label="Internal in"  value={String(report.internalLinksIn)} />
      </div>

      <div className="px-4 py-2.5 bg-portal-bg border-t border-portal-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Next step</span>
        <p className="text-[12px] text-portal-text mt-1 leading-relaxed">{report.recommendation}</p>
      </div>

      {report.topArticles.length > 0 && (
        <div className="border-t border-portal-border">
          <div className="px-4 py-2 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Top articles in cluster</span>
          </div>
          <div className="divide-y divide-portal-border">
            {report.topArticles.map(a => <ArticleRow key={a.id} article={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ArticleRow({ article }: { article: ClusterArticle }) {
  return (
    <div className="px-4 py-2 flex items-center gap-3 text-[12px]">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-portal-text truncate">{article.title}</div>
        <div className="text-[11px] text-portal-sub">
          <code>{article.pagePath}</code>
        </div>
      </div>
      <div className="text-portal-sub text-[11px] whitespace-nowrap">
        {article.impressions > 0 ? (
          <>
            {article.impressions.toLocaleString()} imp · pos {article.avgPosition.toFixed(1)}
          </>
        ) : (
          <span className="italic">no GSC data</span>
        )}
        {typeof article.seoScore === 'number' && (
          <> · <span className={`font-bold ${
            article.seoScore >= 70 ? 'text-portal-green' :
            article.seoScore >= 50 ? 'text-portal-amber' :
                                     'text-portal-red'
          }`}>{article.seoScore}</span></>
        )}
      </div>
      <Link href={`/admin/articles/${article.id}/seo`} className="text-portal-blue font-bold inline-flex items-center gap-1 whitespace-nowrap">
        Open <ArrowRight size={10} />
      </Link>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'amber' | 'green' }) {
  const valueClass = tone === 'blue'  ? 'text-portal-blue'
                   : tone === 'amber' ? 'text-portal-amber'
                   : tone === 'green' ? 'text-portal-green'
                   :                    'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${valueClass}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-portal-bg rounded px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-[13px] font-bold text-portal-text">{value}</div>
    </div>
  )
}
