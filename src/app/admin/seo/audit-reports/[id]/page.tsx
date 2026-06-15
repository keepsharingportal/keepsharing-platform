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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo/audit-reports" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> All audits
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">Audit — {row.brand_slug}</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          {new Date(row.run_at).toLocaleString()} · {row.articles_checked} articles checked · {row.issues_found} issues identified
          {row.model_used && <> · {row.model_used}</>}
          {row.tokens_used && <> · {row.tokens_used.toLocaleString()} tokens</>}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>

          {/* LEFT: full markdown narrative */}
          <div className="bg-white border border-portal-border rounded-lg p-6">
            <article
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {/* RIGHT: action items as a clickable task list */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border">
              <div className="text-[13px] font-bold text-portal-text">Action items ({sortedItems.length})</div>
              <div className="text-[12px] text-portal-sub mt-0.5">Sorted by severity.</div>
            </div>
            <div className="p-3 space-y-2.5">
              {sortedItems.length === 0 && (
                <div className="text-[12px] text-portal-sub p-2">
                  No structured action items in this report.
                </div>
              )}
              {sortedItems.map((item, i) => {
                const bg = item.severity === 'high'   ? 'bg-portal-red-lt'
                         : item.severity === 'medium' ? 'bg-portal-amber-lt'
                         :                              'bg-portal-bg'
                const border = item.severity === 'high'   ? 'var(--color-portal-red)'
                             : item.severity === 'medium' ? 'var(--color-portal-amber)'
                             :                              'var(--color-portal-sub)'
                return (
                  <div key={i} className={`p-2.5 rounded ${bg}`} style={{ borderLeft: `3px solid ${border}` }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <SeverityIcon severity={item.severity} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{item.kind}</span>
                    </div>
                    <p className="text-[12px] text-portal-text leading-relaxed">{item.recommendation}</p>
                    {item.fix_url && (
                      <Link
                        href={withSuggestion(item.fix_url, item.recommendation, row.id)}
                        className="text-portal-blue text-[11px] font-bold inline-flex items-center gap-1 mt-1"
                      >
                        Open in editor <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Append the recommendation + audit-run id to the fix URL so the SEO
 *  editor can surface a "Pending action from audit" banner. */
function withSuggestion(fixUrl: string, recommendation: string, auditId: string): string {
  try {
    // URL needs a base for relative paths.
    const u = new URL(fixUrl, 'https://placeholder.local')
    u.searchParams.set('suggestion', recommendation)
    u.searchParams.set('from', auditId)
    return `${u.pathname}?${u.searchParams.toString()}`
  } catch {
    return fixUrl
  }
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'high')   return <AlertTriangle size={12} color="var(--color-portal-red)" />
  if (severity === 'medium') return <AlertTriangle size={12} color="var(--color-portal-amber)" />
  return <ArrowDownCircle size={12} color="var(--color-portal-sub)" />
}
