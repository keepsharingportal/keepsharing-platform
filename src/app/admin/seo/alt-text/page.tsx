// ── /admin/seo/alt-text — Missing alt-text audit ────────────────────────
//
// Scans every published article for <img> without alt + gallery images
// with empty alt fields. Surfaces the worst offenders so the editor
// can patch the highest-leverage articles first.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAltTextAudit } from '@/lib/seo/alt-text-audit'
import { MARKETS } from '@/lib/markets'
import { Image as ImageIcon, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Alt-text audit — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ brand?: string }>
}

export default async function AltTextAuditPage({ searchParams }: Props) {
  await requireAdmin()
  const { brand } = await searchParams
  const sb = createAdminClient()
  const brandSlug = brand && MARKETS.find(m => m.slug === brand) ? brand : null

  const summary = await runAltTextAudit(sb, brandSlug, 800)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} /> SEO
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>
            <ImageIcon size={20} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
            Alt-text audit
          </h1>
          <div className="text-muted text-sm">
            Images without alt text hurt accessibility AND image-search SEO. Each row points to a
            specific article — fix in the article editor, save, the row disappears.
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
          <div className="stat-card">
            <div className="stat-num">{summary.articlesChecked}</div>
            <div className="stat-label">Articles checked</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{summary.totalImages.toLocaleString()}</div>
            <div className="stat-label">Total images</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${summary.missingAlts === 0 ? 'has-green' : 'has-red'}`}>
              {summary.missingAlts.toLocaleString()}
            </div>
            <div className="stat-label">Missing alts</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${summary.affectedArticles === 0 ? 'has-green' : 'has-amber'}`}>
              {summary.affectedArticles}
            </div>
            <div className="stat-label">Affected articles</div>
          </div>
        </div>

        {summary.findings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--color-portal-green)', fontSize: 14 }}>
            ✓ All checked images have alt text.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: 'var(--color-portal-bg)' }}>
                <tr style={{ textAlign: 'left' }}>
                  <Th>Article</Th>
                  <Th center>Brand</Th>
                  <Th center>Total imgs</Th>
                  <Th center>Missing</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {summary.findings.map(f => (
                  <tr key={f.articleId} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td>
                      <div className="fw-700" style={{ fontSize: 13, marginBottom: 2 }}>{f.title}</div>
                      <div className="text-portal-sub" style={{ fontSize: 11 }}>
                        <code>/columns/{f.columnSlug}/{f.slug}</code>
                      </div>
                      {f.missing.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {f.missing.slice(0, 4).map((m, i) => (
                            <span key={i} style={{
                              fontSize: 10,
                              background: 'var(--color-portal-amber-lt, #fef3c7)',
                              color: 'var(--color-portal-amber)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontFamily: 'monospace',
                            }}>
                              {m.where}: {short(m.src)}
                            </span>
                          ))}
                          {f.missing.length > 4 && (
                            <span style={{ fontSize: 10, color: 'var(--color-portal-sub)' }}>
                              +{f.missing.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td center>
                      <code style={{ fontSize: 11 }}>{f.brandSlug ?? '—'}</code>
                    </Td>
                    <Td center>{f.imageCount}</Td>
                    <Td center>
                      <span style={{
                        display: 'inline-block',
                        background: 'var(--color-portal-red-lt, #fee2e2)',
                        color: 'var(--color-portal-red)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 12,
                      }}>{f.missingCount}</span>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/articles/${f.articleId}/edit`}
                        className="text-portal-blue fw-700"
                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        Fix <ArrowRight size={10} />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-portal-sub text-xs" style={{ marginTop: 14, lineHeight: 1.5 }}>
          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
          Body images come from inline <code>&lt;img&gt;</code> tags in the article body. Gallery images
          come from the <code>gallery_images</code> JSONB column. Hero images aren&apos;t flagged — the
          renderer auto-uses the article title as the alt fallback.
        </p>

      </div>
    </div>
  )
}

function BrandChip({ slug, active, label }: { slug: string | null; active: boolean; label: string }) {
  const href = slug ? `/admin/seo/alt-text?brand=${slug}` : '/admin/seo/alt-text'
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

function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: '8px 14px', verticalAlign: 'top', textAlign: center ? 'center' : 'left' }}>{children}</td>
  )
}

function short(src: string): string {
  if (src.length <= 40) return src
  return src.slice(0, 22) + '…' + src.slice(-15)
}
