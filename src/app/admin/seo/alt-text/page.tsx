// ── /admin/seo/alt-text ──────────────────────────────────────────────────
// Brand-scoped to caller's role.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAltTextAudit } from '@/lib/seo/alt-text-audit'
import { getSeoAllowedBrands, canSeeAllBrands, resolveBrandParam } from '@/lib/seo/admin-scope'
import { Image as ImageIcon, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Alt-text audit — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ brand?: string }> }

export default async function AltTextAuditPage({ searchParams }: Props) {
  const ctx = await requireAdmin()
  const { brand } = await searchParams
  const sb       = createAdminClient()
  const allowed  = getSeoAllowedBrands(ctx)
  const allowAll = canSeeAllBrands(ctx)
  const brandSlug = resolveBrandParam(ctx, brand)

  const summary = await runAltTextAudit(sb, brandSlug, 800)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <ImageIcon size={16} className="inline -translate-y-0.5 mr-1" /> Alt-text audit
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Images without alt text hurt accessibility AND image-search SEO. Each row points to a specific
          article — fix in the article editor, save, the row disappears.
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

          <div className="grid grid-cols-4 gap-3">
            <Stat label="Articles checked"     value={summary.articlesChecked.toString()} />
            <Stat label="Total images"         value={summary.totalImages.toLocaleString()} />
            <Stat label="Missing alts"         value={summary.missingAlts.toLocaleString()} tone={summary.missingAlts === 0 ? 'green' : 'red'} />
            <Stat label="Affected articles"    value={summary.affectedArticles.toString()}  tone={summary.affectedArticles === 0 ? 'green' : 'amber'} />
          </div>

          {summary.findings.length === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-green text-[14px]">
              ✓ All checked images have alt text.
            </div>
          ) : (
            <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-portal-bg">
                  <tr className="text-left">
                    <Th>Article</Th>
                    <Th center>Brand</Th>
                    <Th center>Total imgs</Th>
                    <Th center>Missing</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {summary.findings.map(f => (
                    <tr key={f.articleId} className="border-t border-portal-border">
                      <Td>
                        <div className="text-[13px] font-bold text-portal-text">{f.title}</div>
                        <div className="text-[11px] text-portal-sub"><code>/columns/{f.columnSlug}/{f.slug}</code></div>
                        {f.missing.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {f.missing.slice(0, 4).map((m, i) => (
                              <span key={i} className="text-[10px] bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded font-mono">
                                {m.where}: {short(m.src)}
                              </span>
                            ))}
                            {f.missing.length > 4 && (
                              <span className="text-[10px] text-portal-sub">+{f.missing.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </Td>
                      <Td center><code className="text-[11px]">{f.brandSlug ?? '—'}</code></Td>
                      <Td center>{f.imageCount}</Td>
                      <Td center>
                        <span className="inline-block px-2 py-0.5 bg-portal-red-lt text-portal-red rounded-full font-bold text-[12px]">
                          {f.missingCount}
                        </span>
                      </Td>
                      <Td>
                        <Link href={`/admin/articles/${f.articleId}/edit`} className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1">
                          Fix <ArrowRight size={10} />
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-portal-sub leading-relaxed">
            <AlertTriangle size={11} className="inline -translate-y-px mr-1" />
            Body images come from inline <code>&lt;img&gt;</code> tags. Gallery images come from <code>gallery_images</code> JSONB.
            Hero images aren&apos;t flagged — the renderer auto-uses the article title as the alt fallback.
          </p>
        </div>
      </div>
    </div>
  )
}

function BrandChip({ slug, active, label }: { slug: string | null; active: boolean; label: string }) {
  const href = slug ? `/admin/seo/alt-text?brand=${slug}` : '/admin/seo/alt-text'
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' | 'amber' }) {
  const valueClass = tone === 'red'   ? 'text-portal-red'
                   : tone === 'green' ? 'text-portal-green'
                   : tone === 'amber' ? 'text-portal-amber'
                   :                    'text-portal-text'
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

function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <td className={`px-3.5 py-2 align-top ${center ? 'text-center' : 'text-left'}`}>{children}</td>
}

function short(src: string): string {
  if (src.length <= 40) return src
  return src.slice(0, 22) + '…' + src.slice(-15)
}
