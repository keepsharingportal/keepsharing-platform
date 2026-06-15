// ── /admin/seo — SEO command center landing ──────────────────────────────
//
// First page editors land on under the SEO sidebar group. Layout:
//   1. Page header: title + "Settings" / "Activate GSC" actions
//   2. Tabs: Overview · Tools · Activity
//   3. Brand health grid — one card per brand the caller can see
//   4. Daily movers digest (cross-brand or scoped to single brand)
//   5. Tool nav grid linking every SEO surface
//   6. GSC sync + feeds healthcheck widgets
//
// Brand visibility honors the caller's role:
//   - super / admin → every brand
//   - publisher     → only brands in allowedMarkets
//   - editor        → same as publisher (typically one brand)
//
// All styling matches Ads & Sponsors vocabulary: white headers,
// portal-* tokens, text-[13px] body, text-[18px] title, no
// .portal-app / .card / .stat-card legacy classes.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeBrandHealth } from '@/lib/seo/brand-health'
import { isGscConfigured } from '@/lib/seo/gsc'
import { getSeoAllowedBrands, canSeeAllBrands } from '@/lib/seo/admin-scope'
import { GscSyncWidget } from './GscSyncWidget'
import { FeedsHealthWidget } from './FeedsHealthWidget'
import { buildDailyMovers } from '@/lib/seo/daily-movers'
import { DailyMoversWidget } from './DailyMoversWidget'
import { getActivationStatus } from '@/lib/seo/activation-status'
import { ActivationWizard } from './ActivationWizard'
import {
  Repeat, AlertTriangle, Link as LinkIcon, ListChecks,
  Settings2, FileText, Activity, ArrowRight, Sparkles, Users,
  Image as ImageIcon, Search, TrendingDown, Layers, ShieldCheck,
} from 'lucide-react'

export const metadata: Metadata = { title: 'SEO — Admin' }
export const dynamic = 'force-dynamic'

const TOOLS = [
  { slug: 'brand-profile',  title: 'Brand SEO Profile', desc: 'Pillars, sub-areas, personas, calendar — the strategy Claude reads.', href: '/admin/seo/brand-profile', icon: Settings2 },
  { slug: 'clusters',       title: 'Topical Authority', desc: 'Group every article under its pillar. Spot orphans + weak clusters before Google does.', href: '/admin/seo/clusters', icon: Layers },
  { slug: 'authors',        title: 'Author Profiles', desc: 'E-E-A-T bios + headshots + credentials. Renders Person JSON-LD.', href: '/admin/seo/authors', icon: Users },
  { slug: 'alt-text',       title: 'Alt-text Audit', desc: 'Find published articles with images missing alt text.', href: '/admin/seo/alt-text', icon: ImageIcon },
  { slug: 'query-briefs',   title: 'Query Briefs', desc: 'GSC-driven briefs: improve page-2 articles, write for content gaps.', href: '/admin/seo/query-briefs', icon: Search },
  { slug: 'ctr-optimizer',  title: 'CTR Optimizer', desc: 'Ranking well but not earning clicks? Title + meta rewrites with leverage.', href: '/admin/seo/ctr-optimizer', icon: TrendingDown },
  { slug: 'audit-reports',  title: 'Weekly Audit Reports', desc: 'Claude-generated action lists per brand. Runs Sunday 02:00 UTC.', href: '/admin/seo/audit-reports', icon: FileText },
  { slug: 'redirects',      title: 'Redirect Manager', desc: '301/302/307/308 — when URLs change, keep external links working.', href: '/admin/seo/redirects', icon: Repeat },
  { slug: '404-log',        title: '404 Monitor', desc: 'Top 404 paths. One-click convert any to a 301 redirect.', href: '/admin/seo/404-log', icon: AlertTriangle },
  { slug: 'internal-links', title: 'Internal Link Queue', desc: 'Auto-found linking opportunities. Editor approves or rejects.', href: '/admin/seo/internal-links', icon: LinkIcon },
  { slug: 'schema-validator', title: 'Schema Graph Validator', desc: 'Crawl + verify Organization/Author/Article @id consistency. Catches silent rich-result loss.', href: '/admin/seo/schema-validator', icon: ShieldCheck },
  { slug: 'bulk',           title: 'Bulk SEO Edit', desc: 'Filter, multi-select, apply across many articles at once.', href: '/admin/seo/bulk', icon: ListChecks },
  { slug: 'seo-health',     title: 'Route Coverage Audit', desc: 'Every static page route + which SEO surfaces each one taps.', href: '/admin/seo-health', icon: Activity },
] as const

export default async function SeoHomePage() {
  const ctx     = await requireAdmin()
  const sb      = createAdminClient()
  const brands  = getSeoAllowedBrands(ctx)
  const allView = canSeeAllBrands(ctx)

  const [healthData, dailyMovers, activation] = await Promise.all([
    Promise.all(brands.map(m => computeBrandHealth(sb, m.slug))),
    isGscConfigured()
      ? buildDailyMovers(sb, allView ? null : (brands[0]?.slug ?? null))
      : Promise.resolve(null),
    getActivationStatus(sb),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[18px] font-bold text-portal-text">SEO Command Center</h1>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">
            {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/seo/brand-profile" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            <Settings2 size={14} /> Brand profile
          </Link>
          <Link href="/admin/seo/audit-reports" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
            <FileText size={14} /> Audit reports
          </Link>
          <Link href="/admin/seo/query-briefs" className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90">
            <Search size={14} /> Query briefs
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-6">

          {/* ── Activation wizard (only renders when blockers exist) ── */}
          <ActivationWizard report={activation} />

          {/* ── Brand health grid ─────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Brand health</h2>
              <span className="text-[11px] text-portal-sub">
                Click any brand to drill into its GSC dashboard.
              </span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {brands.map((m, i) => {
                const h = healthData[i]
                const tone = h.score >= 85 ? 'bg-portal-green'
                           : h.score >= 70 ? 'bg-portal-blue'
                           : h.score >= 50 ? 'bg-portal-amber'
                           :                  'bg-portal-red'
                return (
                  <Link
                    key={m.slug}
                    href={`/admin/seo/brand/${m.slug}`}
                    className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-full ${tone} text-white text-[20px] font-black flex items-center justify-center shrink-0`} title={h.grade}>
                        {h.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-portal-text truncate">{m.displayName}</div>
                        <div className="text-[11px] text-portal-sub">
                          {h.publishedArticles} published · avg article {h.avgArticleScore}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5">
                      <Mini label="Focus kw" value={`${h.withFocusKeywordPct}%`} />
                      <Mini label="Desc"     value={`${h.withDescriptionPct}%`} />
                      <Mini label="Hero img" value={`${h.withHeroImagePct}%`} />
                      <Mini label="Recency"  value={`${h.recencyPct}%`} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* ── Daily movers digest ───────────────────────────── */}
          {dailyMovers && <DailyMoversWidget movers={dailyMovers} />}

          {/* ── Tools grid ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Tools</h2>
              <span className="text-[11px] text-portal-sub">
                Strategy → Data → Recommendations → Action
              </span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {TOOLS.map(t => {
                const Icon = t.icon
                return (
                  <Link
                    key={t.slug}
                    href={t.href}
                    className="bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors block"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-9 h-9 rounded-lg bg-portal-bg text-portal-navy flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 text-[14px] font-bold text-portal-text">{t.title}</div>
                      <ArrowRight size={14} className="text-portal-sub" />
                    </div>
                    <p className="text-[12px] text-portal-sub leading-relaxed">{t.desc}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* ── GSC sync + feeds + first-time tip ─────────────── */}
          <section className="space-y-3">
            <GscSyncWidget configured={isGscConfigured()} />
            <FeedsHealthWidget />

            <div className="bg-white border border-portal-border rounded-lg p-4 flex items-start gap-3" style={{ borderLeft: '3px solid var(--color-portal-blue)' }}>
              <Sparkles size={14} className="text-portal-blue shrink-0 mt-0.5" />
              <div>
                <strong className="text-[13px] text-portal-text">First-time setup tip</strong>
                <p className="text-[12px] text-portal-sub mt-1 leading-relaxed">
                  Open each brand&apos;s profile → click <strong>Generate first draft (Claude)</strong> → save. The weekly audit
                  quality improves dramatically once each brand has its pillars + sub-areas + editorial calendar filled in.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-portal-bg rounded px-1.5 py-1 text-center">
      <div className="text-[9px] uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-[12px] font-bold text-portal-text">{value}</div>
    </div>
  )
}
