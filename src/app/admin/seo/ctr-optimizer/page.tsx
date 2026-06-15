// ── /admin/seo/ctr-optimizer ─────────────────────────────────────────────
//
// Articles with high impressions but lower CTR than the position curve
// predicts. Each row deep-links to the SEO editor with a pre-filled
// rewrite suggestion. Brand visibility honors role.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGscConfigured } from '@/lib/seo/gsc'
import { findCtrUnderperformers, type CtrFinding } from '@/lib/seo/ctr-optimizer'
import { getSeoAllowedBrands, canSeeAllBrands, resolveBrandParam } from '@/lib/seo/admin-scope'
import { ArrowLeft, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'CTR optimizer — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function CtrOptimizerPage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const { brand } = await searchParams
  const sb       = createAdminClient()
  const allowed  = getSeoAllowedBrands(ctx)
  const allowAll = canSeeAllBrands(ctx)
  const brandSlug = resolveBrandParam(ctx, brand)

  if (!isGscConfigured()) return <NotConnected />

  const result = await findCtrUnderperformers(sb, brandSlug, 28)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <TrendingDown size={16} className="inline -translate-y-0.5 mr-1" />
          CTR optimizer
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Articles ranking well but not earning clicks — title and meta description rewrites with the most leverage.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {(allowAll || allowed.length > 1) && (
            <div className="flex gap-1.5 flex-wrap">
              {allowAll && <BrandChip slug={null} active={brandSlug === null} label="All brands" />}
              {allowed.map(m => (
                <BrandChip key={m.slug} slug={m.slug} active={brandSlug === m.slug} label={m.displayName} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Articles in window" value={result.totalArticles.toLocaleString()} />
            <Stat label="Under-performing"   value={String(result.worstPerformers.length)} tone="red" />
            <Stat label="Over-performing"    value={String(result.bestPerformers.length)}  tone="green" />
          </div>

          <div className="bg-white border border-portal-border rounded-lg p-3 text-[13px] leading-relaxed">
            <strong className="block mb-1">How it works</strong>
            <p className="text-[12px] text-portal-sub">
              For each article with ≥200 impressions/28d, we compare its actual CTR to the position-
              expected CTR (1st place ≈ 27%, page 2 ≈ 1%). Articles where actual is &gt;0.5pt below
              expected are sorted by leverage (deficit × impressions) — highest impact at the top.
            </p>
          </div>

          {/* Under-performers */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
              <strong className="text-[13px] text-portal-text inline-flex items-center gap-1.5">
                <TrendingDown size={12} /> Under-performing ({result.worstPerformers.length})
              </strong>
              <div className="text-[11px] text-portal-sub mt-0.5">
                Title or meta description is leaving clicks on the table.
              </div>
            </div>
            <table className="w-full text-[13px]">
              <thead className="bg-portal-bg">
                <tr className="text-left">
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
                    <tr key={r.pagePath} className="border-t border-portal-border">
                      <Td>
                        <div className="text-[13px] font-bold text-portal-text">{r.title ?? shortPath(r.pagePath)}</div>
                        <div className="text-[11px] text-portal-sub"><code>{r.pagePath}</code></div>
                      </Td>
                      <Td center>{r.avgPosition.toFixed(1)}</Td>
                      <Td center>{r.impressions.toLocaleString()}</Td>
                      <Td center><span className="text-portal-red font-bold">{(r.ctr * 100).toFixed(2)}%</span></Td>
                      <Td center>{(r.expectedCtr * 100).toFixed(2)}%</Td>
                      <Td center>
                        <span className="inline-block px-2 py-0.5 bg-portal-red-lt text-portal-red rounded-full font-bold text-[12px]">
                          ~{missingClicks.toLocaleString()}
                        </span>
                      </Td>
                      <Td>
                        {editorHref ? (
                          <Link href={editorHref} className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1">
                            Rewrite <ArrowRight size={10} />
                          </Link>
                        ) : <span className="text-portal-sub text-[11px]">—</span>}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Over-performers */}
          {result.bestPerformers.length > 0 && (
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: '3px solid var(--color-portal-green)' }}>
                <strong className="text-[13px] text-portal-text inline-flex items-center gap-1.5">
                  <TrendingUp size={12} /> Over-performing ({result.bestPerformers.length})
                </strong>
                <div className="text-[11px] text-portal-sub mt-0.5">
                  Titles + descriptions worth modeling — way above what the position predicts.
                </div>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-portal-bg">
                  <tr className="text-left">
                    <Th>Article</Th>
                    <Th center>Pos</Th>
                    <Th center>CTR</Th>
                    <Th center>Expected</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.bestPerformers.map(r => (
                    <tr key={r.pagePath} className="border-t border-portal-border">
                      <Td><div className="text-[13px] font-bold text-portal-text">{r.title ?? shortPath(r.pagePath)}</div></Td>
                      <Td center>{r.avgPosition.toFixed(1)}</Td>
                      <Td center><span className="text-portal-green font-bold">{(r.ctr * 100).toFixed(2)}%</span></Td>
                      <Td center>{(r.expectedCtr * 100).toFixed(2)}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotConnected() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">CTR optimizer</h1>
      </div>
      <div className="flex-1 bg-portal-bg p-6">
        <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
          <strong className="text-[13px] text-portal-text">Search Console not connected.</strong>
          <p className="text-[12px] text-portal-sub mt-1">
            CTR optimizer needs GSC click + impression data. Connect from <Link href="/admin/seo" className="text-portal-blue font-bold">/admin/seo</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

function buildSuggestion(f: CtrFinding): string {
  const missing = Math.round(f.ctrDeficit * f.impressions)
  return `This article ranks at position ${f.avgPosition.toFixed(1)} with ${f.impressions.toLocaleString()} impressions/28d but only a ${(f.ctr * 100).toFixed(2)}% CTR — expected at this position is ~${(f.expectedCtr * 100).toFixed(2)}%. You're leaving ~${missing} clicks on the table. Rewrite the SEO title to be more specific + benefit-driven (numbers, location, year work well), and rewrite the meta description so it answers the searcher's question directly in the first 150 characters.`
}

function BrandChip({ slug, active, label }: { slug: string | null; active: boolean; label: string }) {
  const href = slug ? `/admin/seo/ctr-optimizer?brand=${slug}` : '/admin/seo/ctr-optimizer'
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  const valueClass = tone === 'red' ? 'text-portal-red' : tone === 'green' ? 'text-portal-green' : 'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${valueClass}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, center, colSpan }: { children?: React.ReactNode; center?: boolean; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`px-3.5 py-2 ${center ? 'text-center' : 'text-left'}`}>{children}</td>
  )
}

function shortPath(p: string): string { return p.length <= 36 ? p : p.slice(0, 18) + '…' + p.slice(-15) }
