// ── /admin/seo/audit-reports/[id] ─────────────────────────────────────────
//
// Single weekly audit report. Renders the markdown narrative + a
// structured task list pulled from action_items JSONB. Each task with
// a fix_url becomes a clickable link to the SEO editor for the
// referenced article.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, ArrowRight, AlertTriangle, ArrowDownCircle } from 'lucide-react'
import { renderMarkdownToHtml } from './render-markdown'

export const metadata: Metadata = { title: 'SEO Audit Report — Admin' }
export const dynamic = 'force-dynamic'

interface ActionItem {
  kind:           string
  severity:       'high' | 'medium' | 'low'
  recommendation: string
  target_id?:     string
  fix_url?:       string
}

interface AuditRow {
  id:               string
  brand_slug:       string
  run_at:           string
  articles_checked: number
  issues_found:     number
  report_markdown:  string
  action_items:     ActionItem[]
  tokens_used:      number | null
  model_used:       string | null
}

interface Props { params: Promise<{ id: string }> }

export default async function AuditReportPage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('seo_audit_runs')
    .select('id, brand_slug, run_at, articles_checked, issues_found, report_markdown, action_items, tokens_used, model_used')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) notFound()
  const row = data as AuditRow
  const items = Array.isArray(row.action_items) ? row.action_items : []

  // Sort severity for the task list rendering
  const order: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 }
  const sortedItems = [...items].sort((a, b) => (order[a.severity] ?? 99) - (order[b.severity] ?? 99))

  const html = renderMarkdownToHtml(row.report_markdown)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo/audit-reports" className="text-xs text-portal-sub hover:text-portal-text" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={11} /> All audits
          </Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>Audit — {row.brand_slug}</h1>
          <div className="text-muted text-sm">
            {new Date(row.run_at).toLocaleString()} · {row.articles_checked} articles checked · {row.issues_found} issues identified
            {row.model_used && <> · {row.model_used}</>}
            {row.tokens_used && <> · {row.tokens_used.toLocaleString()} tokens</>}
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'flex-start' }}>

          {/* LEFT: full markdown narrative */}
          <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 24 }}>
            <article
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {/* RIGHT: action items as a clickable task list */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
              <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Action items ({sortedItems.length})</div>
              <div className="text-portal-sub" style={{ fontSize: 12, marginTop: 2 }}>Sorted by severity.</div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedItems.length === 0 && (
                <div className="text-portal-sub" style={{ fontSize: 12, padding: 8 }}>
                  No structured action items in this report.
                </div>
              )}
              {sortedItems.map((item, i) => (
                <div key={i} style={{
                  padding: 10,
                  borderRadius: 6,
                  background: item.severity === 'high'   ? 'var(--color-portal-red-lt, #fee2e2)'
                          : item.severity === 'medium' ? 'var(--color-portal-amber-lt, #fef3c7)'
                          :                              'var(--color-portal-bg)',
                  borderLeft: `3px solid ${
                    item.severity === 'high'   ? 'var(--color-portal-red)'
                  : item.severity === 'medium' ? 'var(--color-portal-amber)'
                  :                              'var(--color-portal-sub)'
                  }`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <SeverityIcon severity={item.severity} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', color: 'var(--color-portal-sub)' }}>
                      {item.kind}
                    </span>
                  </div>
                  <p className="text-portal-text" style={{ fontSize: 12, lineHeight: 1.5 }}>
                    {item.recommendation}
                  </p>
                  {item.fix_url && (
                    <Link href={item.fix_url} className="text-portal-blue fw-700" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      Open in editor <ArrowRight size={10} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'high')   return <AlertTriangle size={12} color="var(--color-portal-red)" />
  if (severity === 'medium') return <AlertTriangle size={12} color="var(--color-portal-amber)" />
  return <ArrowDownCircle size={12} color="var(--color-portal-sub)" />
}
