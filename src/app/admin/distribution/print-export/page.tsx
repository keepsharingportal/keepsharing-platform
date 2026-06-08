// ── /admin/distribution/print-export ──────────────────────────────────────────
// Print Export — bridge between Production and the printer.
// Lists each in-flight issue with a one-click manifest download.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, Download, Printer, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Print Export — Distribution' }
export const dynamic  = 'force-dynamic'

function fmtMonth(ym: string) {
  if (!ym) return ''
  return new Date(`${ym.slice(0, 7)}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function PrintExportPage() {
  const supabase = createAdminClient()

  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, source_issue_month, target_publication, hero_image_url, author_name, body, published')
    .not('source_issue_month', 'is', null)
    .order('source_issue_month', { ascending: false })

  type ArticleRow = NonNullable<typeof articles>[number]
  const grouped: Record<string, ArticleRow[]> = {}
  for (const r of articles ?? []) {
    const m = ((r.source_issue_month as string | null) ?? '').slice(0, 7)
    if (!m) continue
    if (!grouped[m]) grouped[m] = []
    grouped[m].push(r)
  }
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).slice(0, 6)

  function readyCount(rows: ArticleRow[]): number {
    return rows.filter(r => r.hero_image_url && r.author_name && ((r.body?.length ?? 0) > 100)).length
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/distribution" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
          <ArrowLeft size={11} /> Distribution
        </Link>
        <h1 className="text-xl font-semibold text-portal-text flex items-center gap-2">
          <Printer size={18} className="text-portal-blue" /> Print Export
        </h1>
        <p className="text-sm text-portal-sub mt-0.5">Hand-off package for each issue: article manifest, image URLs, and print-readiness flags.</p>
      </div>

      <section>
        <AdminSectionHeader title="Issues Ready to Export" count={months.length} />

        {months.length === 0 ? (
          <div className="rounded-xl border border-dashed border-portal-border p-8 text-center bg-white">
            <p className="text-sm text-portal-sub">No issues with tagged articles yet.</p>
            <Link href="/admin/production/issues" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-portal-blue hover:underline">
              Open Issues <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {months.map(m => {
              const rows  = grouped[m]
              const ready = readyCount(rows)
              const pct   = rows.length > 0 ? Math.round((ready / rows.length) * 100) : 0
              return (
                <div key={m} className="rounded-xl border border-portal-border bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-portal-blue-lt flex items-center justify-center shrink-0">
                      <Printer size={15} className="text-portal-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-portal-text">{fmtMonth(m)}</p>
                      <p className="text-[11px] text-portal-sub">{rows.length} articles · {ready} print-ready ({pct}%)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/production/print-planning?month=${m}&pub=RRP`}
                      className="px-3 py-1.5 text-xs font-semibold text-portal-text border border-portal-border rounded-lg hover:bg-portal-bg"
                    >
                      Review readiness
                    </Link>
                    <a
                      href={`/api/admin/articles/bulk?month=${m}&format=csv`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90"
                    >
                      <Download size={12} /> Manifest CSV
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[11px] text-portal-muted mt-3">
          The Manifest CSV is the source-of-truth for InDesign or any layout tool.
          Print-ready means each article has a hero image, byline, and body content over 100 chars.
        </p>
      </section>
    </div>
  )
}
