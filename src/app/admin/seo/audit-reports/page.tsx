// ── /admin/seo/audit-reports ──────────────────────────────────────────────
// Weekly Claude audit reports per brand. Brand-scoped to caller's role.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSeoAllowedBrands } from '@/lib/seo/admin-scope'
import { RunNowButton } from './RunNowButton'
import { SeasonalAlerts } from '@/components/seo/SeasonalAlerts'
import { ArrowLeft, FileText, ArrowRight } from 'lucide-react'

export const metadata: Metadata = { title: 'SEO Audit Reports — Admin' }
export const dynamic = 'force-dynamic'

interface AuditRow {
  id:               string
  brand_slug:       string
  run_at:           string
  run_by:           string
  articles_checked: number
  issues_found:     number
  tokens_used:      number | null
  model_used:       string | null
}

export default async function AuditReportsPage() {
  const ctx = await requireAdmin()
  const sb = createAdminClient()
  const allowed = getSeoAllowedBrands(ctx)
  const allowedSlugs = allowed.map(m => m.slug)

  const { data } = await sb
    .from('seo_audit_runs')
    .select('id, brand_slug, run_at, run_by, articles_checked, issues_found, tokens_used, model_used')
    .in('brand_slug', allowedSlugs)
    .order('run_at', { ascending: false })
    .limit(60)
  const rows = (data ?? []) as AuditRow[]

  const latestByBrand = new Map<string, AuditRow>()
  for (const r of rows) {
    if (!latestByBrand.has(r.brand_slug)) latestByBrand.set(r.brand_slug, r)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <FileText size={16} className="inline -translate-y-0.5 mr-1" /> SEO Audit Reports
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Weekly Claude-generated audits, prioritized action lists, content gaps, and quick-win recommendations.
          Cron runs every Sunday 02:00 UTC.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4">

          {/* Seasonal radar — picks the first allowed brand by default */}
          {allowed.length > 0 && <SeasonalAlerts brandSlug={allowed[0].slug} />}

          {/* Per-brand latest cards */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(allowed.length, 6)}, minmax(0, 1fr))` }}>
            {allowed.map(m => {
              const latest = latestByBrand.get(m.slug)
              return (
                <Link
                  key={m.slug}
                  href={latest ? `/admin/seo/audit-reports/${latest.id}` : '#'}
                  className={`bg-white border border-portal-border rounded-lg p-4 hover:border-portal-blue/40 transition-colors ${latest ? '' : 'opacity-50 cursor-default'}`}
                >
                  <div className="text-[22px] font-black text-portal-text">{latest?.issues_found ?? '—'}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">
                    {m.short ?? m.slug.toUpperCase()}
                  </div>
                  {latest && (
                    <div className="text-[10px] text-portal-sub mt-1">
                      {new Date(latest.run_at).toLocaleDateString()}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Run-now panel */}
          <div className="bg-white border border-portal-border rounded-lg p-4">
            <div className="text-[13px] font-bold text-portal-text mb-1">Run audit now</div>
            <p className="text-[12px] text-portal-sub mb-3 leading-relaxed">
              Runs the full Claude audit for every brand. Takes 1-3 minutes. Costs tokens.
            </p>
            <RunNowButton />
          </div>

          {/* Full audit log */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border">
              <div className="text-[13px] font-bold text-portal-text">All runs</div>
            </div>
            {rows.length === 0 ? (
              <div className="text-center text-portal-sub text-[13px] py-8">
                No audits yet. Click &quot;Run audit now&quot; or wait for the Sunday 02:00 UTC cron.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead className="bg-portal-bg">
                  <tr className="text-left">
                    <Th>Brand</Th>
                    <Th>Run at</Th>
                    <Th center>Articles</Th>
                    <Th center>Issues</Th>
                    <Th center>Tokens</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-portal-border">
                      <Td><strong>{r.brand_slug}</strong></Td>
                      <Td>{new Date(r.run_at).toLocaleString()}</Td>
                      <Td center>{r.articles_checked}</Td>
                      <Td center>{r.issues_found}</Td>
                      <Td center>{r.tokens_used?.toLocaleString() ?? '—'}</Td>
                      <Td>
                        <Link href={`/admin/seo/audit-reports/${r.id}`} className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1">
                          Open <ArrowRight size={10} />
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
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
  return <td className={`px-3.5 py-2 align-middle ${center ? 'text-center' : 'text-left'}`}>{children}</td>
}
