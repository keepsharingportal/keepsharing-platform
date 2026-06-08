// ── /admin/production/export-packages ─────────────────────────────────────────
// Export Packages — bundles of an issue's content ready for InDesign / PDF.
// V1: lists each recent issue with article + ad-page counts and a copy/CSV
// "package" button (downloads a manifest of titles + slugs + image URLs).

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, Download, Package } from 'lucide-react'

export const metadata = { title: 'Export Packages — Production' }
export const dynamic  = 'force-dynamic'

function fmtMonth(ym: string) {
  if (!ym) return ''
  return new Date(`${ym.slice(0, 7)}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function ExportPackagesPage() {
  const supabase = createAdminClient()

  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, source_issue_month, target_publication, hero_image_url, published')
    .not('source_issue_month', 'is', null)
    .order('source_issue_month', { ascending: false })

  const grouped: Record<string, { pubs: Record<string, number>; total: number; published: number }> = {}
  for (const r of articles ?? []) {
    const m = ((r.source_issue_month as string | null) ?? '').slice(0, 7)
    if (!m) continue
    if (!grouped[m]) grouped[m] = { pubs: {}, total: 0, published: 0 }
    const pub = (r.target_publication as string | null) ?? 'RRP'
    grouped[m].pubs[pub] = (grouped[m].pubs[pub] ?? 0) + 1
    grouped[m].total += 1
    if (r.published) grouped[m].published += 1
  }
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).slice(0, 12)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/production" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mb-1">
          <ArrowLeft size={11} /> Production
        </Link>
        <h1 className="text-xl font-semibold text-portal-text">Export Packages</h1>
        <p className="text-sm text-portal-sub mt-0.5">Each row represents an issue you can hand to print. Click an issue to download its manifest.</p>
      </div>

      <section>
        <AdminSectionHeader title="Recent Issues" count={months.length} />

        {months.length === 0 ? (
          <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
            <p className="text-sm text-portal-sub">No issues have been built yet.</p>
            <p className="text-xs text-portal-muted mt-1">Tag articles with <code className="px-1 bg-portal-row-hover rounded">source_issue_month</code> to populate this view.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-portal-border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-portal-bg border-b border-portal-border">
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Issue</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Articles</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Markets</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Status</th>
                  <th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-portal-sub">Action</th>
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const g          = grouped[m]
                  const pubsList   = Object.entries(g.pubs).sort((a, b) => b[1] - a[1])
                  const allPub     = g.total > 0 && g.published === g.total
                  return (
                    <tr key={m} className="border-b border-portal-border last:border-0 hover:bg-portal-bg">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-portal-muted" />
                          <span className="text-sm font-semibold text-portal-text">{fmtMonth(m)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-portal-text">{g.total}</td>
                      <td className="px-3 py-3 text-xs text-portal-sub">
                        {pubsList.map(([p, n]) => `${p} (${n})`).join(' · ')}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {allPub
                          ? <span className="text-portal-green font-semibold">All published</span>
                          : <span className="text-portal-amber font-semibold">{g.published}/{g.total} published</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <a
                          href={`/api/admin/articles/bulk?month=${m}&format=csv`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-portal-blue hover:underline"
                        >
                          <Download size={11} /> Manifest CSV
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-portal-muted mt-3">
          Manifest CSV includes title, slug, author, hero image URL, and publication for every article in the issue.
          Use it as the source-of-truth when assembling InDesign or PDF.
        </p>
      </section>
    </div>
  )
}
