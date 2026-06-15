// ── /admin/seo/audit-reports ──────────────────────────────────────────────
//
// Weekly Claude audit reports per brand. Latest run shown first.
// Editor opens a report, reads the prioritized action list, and works
// through it. "Run now" triggers an immediate audit for a single brand
// (also useful for testing).

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { RunNowButton } from './RunNowButton'
import { SeasonalAlerts } from '@/components/seo/SeasonalAlerts'

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
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb
    .from('seo_audit_runs')
    .select('id, brand_slug, run_at, run_by, articles_checked, issues_found, tokens_used, model_used')
    .order('run_at', { ascending: false })
    .limit(60)
  const rows = (data ?? []) as AuditRow[]

  // Group: latest per brand at top; older runs grouped below per brand.
  const latestByBrand = new Map<string, AuditRow>()
  for (const r of rows) {
    if (!latestByBrand.has(r.brand_slug)) latestByBrand.set(r.brand_slug, r)
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">SEO Audit Reports</h1>
          <div className="text-muted text-sm">
            Weekly Claude-generated audits, prioritized action lists, content gaps, and quick-win recommendations.
            Cron runs every Sunday 02:00 UTC. Click any brand to read its latest report.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Seasonal radar — shows this brand's current + next month
            calendar themes so the editor knows what coverage to push
            BEFORE the audit flags gaps. Defaults to 'rrp' since this
            page lists all brands; per-brand drill-down is in the
            per-audit detail page. */}
        <SeasonalAlerts brandSlug="rrp" />

        {/* Per-brand latest cards */}
        <div className="stats-row" style={{ marginBottom: 16 }}>
          {MARKETS.map(m => {
            const latest = latestByBrand.get(m.slug)
            return (
              <Link
                key={m.slug}
                href={latest ? `/admin/seo/audit-reports/${latest.id}` : '#'}
                className="stat-card"
                style={{ textDecoration: 'none', opacity: latest ? 1 : 0.5 }}
              >
                <div className="stat-num">{latest?.issues_found ?? '—'}</div>
                <div className="stat-label">{m.short ?? m.slug.toUpperCase()}</div>
                {latest && (
                  <div style={{ fontSize: 10, color: 'var(--color-portal-sub)', marginTop: 4 }}>
                    {new Date(latest.run_at).toLocaleDateString()}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Run-now panel */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 4 }}>Run audit now</div>
          <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
            Runs the full Claude audit for every brand. Takes 1-3 minutes. Costs tokens.
          </p>
          <RunNowButton />
        </div>

        {/* Full audit log */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
            <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>All runs</div>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-portal-sub)', fontSize: 13 }}>
              No audits yet. Click &quot;Run audit now&quot; or wait for the Sunday 02:00 UTC cron.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: 'var(--color-portal-bg)' }}>
                <tr style={{ textAlign: 'left' }}>
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
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td><strong>{r.brand_slug}</strong></Td>
                    <Td>{new Date(r.run_at).toLocaleString()}</Td>
                    <Td center>{r.articles_checked}</Td>
                    <Td center>{r.issues_found}</Td>
                    <Td center>{r.tokens_used?.toLocaleString() ?? '—'}</Td>
                    <Td>
                      <Link href={`/admin/seo/audit-reports/${r.id}`} className="text-portal-blue fw-700" style={{ fontSize: 12 }}>
                        Open →
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
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: center ? 'center' : 'left' }}>{children}</th>
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td style={{ padding: '8px 14px', textAlign: center ? 'center' : 'left', verticalAlign: 'middle' }}>{children}</td>
}
