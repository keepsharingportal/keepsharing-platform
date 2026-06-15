// ── /admin/seo/query-briefs ──────────────────────────────────────────────
//
// Two columns of editorial briefs derived from real GSC data.
// IMPROVE rows deep-link to the article's SEO editor with a pre-filled
// suggestion banner. WRITE rows seed a new-article draft.
//
// Brand visibility honors the caller's role.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGscConfigured } from '@/lib/seo/gsc'
import { buildQueryBriefs, type QueryBrief } from '@/lib/seo/query-briefs'
import { getSeoAllowedBrands, canSeeAllBrands, resolveBrandParam } from '@/lib/seo/admin-scope'
import { ArrowLeft, ArrowRight, Search, TrendingUp, FileEdit } from 'lucide-react'

export const metadata: Metadata = { title: 'Query briefs — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function QueryBriefsPage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const { brand } = await searchParams
  const sb       = createAdminClient()
  const allowed  = getSeoAllowedBrands(ctx)
  const allowAll = canSeeAllBrands(ctx)
  const brandSlug = resolveBrandParam(ctx, brand)

  if (!isGscConfigured()) return <NotConnected />

  const briefs = await buildQueryBriefs(sb, brandSlug, 28)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
              <ArrowLeft size={11} /> SEO
            </Link>
            <h1 className="text-[18px] font-bold text-portal-text">
              <Search size={16} className="inline -translate-y-0.5 mr-1" />
              Query briefs
            </h1>
            <p className="text-[12px] text-portal-sub mt-1">
              Editorial briefs derived from the last 28 days of Search Console data.
              Improve = strengthen an existing article. Write = create a new article for a topic the site
              is bleeding traffic on.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Brand filter */}
          {(allowAll || allowed.length > 1) && (
            <div className="flex gap-1.5 flex-wrap">
              {allowAll && <BrandChip slug={null} active={brandSlug === null} label="All brands" />}
              {allowed.map(m => (
                <BrandChip key={m.slug} slug={m.slug} active={brandSlug === m.slug} label={m.displayName} />
              ))}
            </div>
          )}

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Queries analyzed" value={briefs.queriesAnalyzed.toLocaleString()} />
            <Stat label="Improve briefs"   value={String(briefs.improveBriefs.length)} tone="blue" />
            <Stat label="Write briefs"     value={String(briefs.writeBriefs.length)}   tone="amber" />
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <BriefColumn
              title={`Improve existing articles (${briefs.improveBriefs.length})`}
              hint="Position 11-20, dominant owner, ≥25 impressions/28d"
              icon={<TrendingUp size={12} />}
              tone="blue"
              briefs={briefs.improveBriefs}
              emptyHint="No improve briefs in window. (Likely no GSC data imported yet — run a sync from /admin/seo.)"
            />
            <BriefColumn
              title={`Write new articles (${briefs.writeBriefs.length})`}
              hint="≥100 impressions/28d, no page owns ≥40% of the query"
              icon={<FileEdit size={12} />}
              tone="amber"
              briefs={briefs.writeBriefs}
              emptyHint="No write briefs in window."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function NotConnected() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">Query briefs</h1>
      </div>
      <div className="flex-1 bg-portal-bg p-6">
        <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
          <strong className="text-[13px] text-portal-text">Search Console not connected yet.</strong>
          <p className="text-[12px] text-portal-sub mt-1">
            Query briefs use real GSC click + impression data. Connect from <Link href="/admin/seo" className="text-portal-blue font-bold">/admin/seo</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

function BriefColumn({ title, hint, icon, tone, briefs, emptyHint }: {
  title: string; hint: string; icon: React.ReactNode
  tone:  'blue' | 'amber'
  briefs: QueryBrief[]
  emptyHint: string
}) {
  const borderColor = tone === 'blue' ? 'var(--color-portal-blue)' : 'var(--color-portal-amber)'
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: `3px solid ${borderColor}` }}>
        <strong className="text-[13px] text-portal-text inline-flex items-center gap-1.5">{icon} {title}</strong>
        <div className="text-[11px] text-portal-sub mt-0.5">{hint}</div>
      </div>
      <div className="divide-y divide-portal-border">
        {briefs.length === 0 && <div className="text-[12px] text-portal-sub p-3">{emptyHint}</div>}
        {briefs.map((b, i) => <BriefRow key={i} brief={b} />)}
      </div>
    </div>
  )
}

function BriefRow({ brief }: { brief: QueryBrief }) {
  const isImprove = brief.kind === 'improve'
  const editorHref = isImprove && brief.topArticleId
    ? `/admin/articles/${brief.topArticleId}/seo?suggestion=${encodeURIComponent(`Move "${brief.query}" from position ${brief.avgPosition.toFixed(1)} to page 1: add it to the title or first paragraph, build out the H2 covering it, and add 2+ internal links pointing here from related articles.`)}&from=query-brief`
    : null

  return (
    <div className="p-3 flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-portal-text mb-0.5">&ldquo;{brief.query}&rdquo;</div>
        <div className="text-[11px] text-portal-sub leading-relaxed">
          {brief.impressions.toLocaleString()} impressions · {brief.clicks} clicks · avg pos {brief.avgPosition.toFixed(1)}
        </div>
        {isImprove && brief.topPagePath && (
          <div className="text-[11px] text-portal-sub mt-1">
            Owner: <code className="text-[10px]">{brief.topPagePath}</code>
          </div>
        )}
        {!isImprove && brief.candidates && brief.candidates.length > 0 && (
          <div className="text-[10px] text-portal-sub mt-1">
            Scattered across: {brief.candidates.slice(0, 3).map(c => shortPath(c.pageUrl)).join(', ')}
            {brief.candidates.length > 3 && ` +${brief.candidates.length - 3}`}
          </div>
        )}
      </div>
      {editorHref ? (
        <Link href={editorHref} className="text-[11px] font-bold text-portal-blue inline-flex items-center gap-1 whitespace-nowrap">
          Improve <ArrowRight size={10} />
        </Link>
      ) : !isImprove ? (
        <Link
          href={`/admin/articles/new?queryBrief=${encodeURIComponent(brief.query)}&impressions=${brief.impressions}`}
          className="text-[11px] font-bold text-portal-blue inline-flex items-center gap-1 whitespace-nowrap"
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
      className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
        active ? 'bg-portal-navy text-white border-portal-navy'
               : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
      }`}
    >{label}</Link>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'amber' }) {
  const valueClass = tone === 'blue' ? 'text-portal-blue' : tone === 'amber' ? 'text-portal-amber' : 'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${valueClass}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}

function shortPath(url: string): string {
  let p = url
  try { p = new URL(url).pathname } catch { /* ignore */ }
  if (p.length > 36) return p.slice(0, 18) + '…' + p.slice(-15)
  return p
}
