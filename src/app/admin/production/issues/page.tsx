// ── /admin/production/issues ──────────────────────────────────────────────────
// Issue planning — lists each market's recent and upcoming monthly issues
// with article counts and a link into the filtered Articles view.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, Plus, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Issues — Production' }
export const dynamic  = 'force-dynamic'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      color: '#22c55e' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        color: '#3b82f6' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    color: '#f97316' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     color: '#a855f7' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', color: '#14b8a6' },
  { abbrev: 'RRB', name: 'River Region Boom',         color: '#eab308' },
]

function fmtMonth(ym: string): string {
  if (!ym) return ''
  const d = new Date(`${ym.slice(0, 7)}-01T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function IssuesPage() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('guide_articles')
    .select('source_issue_month, target_publication, published')
    .not('source_issue_month', 'is', null)

  // Group by issue_month → array of { pub, total, published }
  const byMonth: Record<string, { total: number; published: number; pubs: Record<string, number> }> = {}
  for (const r of data ?? []) {
    const m = ((r.source_issue_month as string | null) ?? '').slice(0, 7)
    if (!m) continue
    if (!byMonth[m]) byMonth[m] = { total: 0, published: 0, pubs: {} }
    byMonth[m].total += 1
    if (r.published) byMonth[m].published += 1
    const pub = (r.target_publication as string | null) ?? 'RRP'
    byMonth[m].pubs[pub] = (byMonth[m].pubs[pub] ?? 0) + 1
  }

  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/production" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
            <ArrowLeft size={11} /> Production
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly issues across all markets. Counts come from articles with an issue month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/production/issues/digital"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Digital Issues <ArrowRight size={11} />
          </Link>
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={12} /> New Article
          </Link>
        </div>
      </div>

      <section>
        <AdminSectionHeader title="Recent Issues" count={months.length} />
        {months.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
            <p className="text-sm text-gray-500">No articles have an issue month set yet.</p>
            <p className="text-xs text-gray-400 mt-1">Set <code className="px-1 bg-gray-100 rounded">source_issue_month</code> on articles to populate this view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {months.map(m => {
              const info = byMonth[m]
              const pct  = info.total > 0 ? Math.round((info.published / info.total) * 100) : 0
              return (
                <div key={m} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{fmtMonth(m)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{info.published} of {info.total} published ({pct}%)</p>
                    </div>
                    <Link
                      href={`/admin/articles?filter=month-${m}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View articles <ArrowRight size={11} />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PUBLICATIONS.map(p => {
                      const n = info.pubs[p.abbrev] ?? 0
                      if (n === 0) return null
                      return (
                        <span
                          key={p.abbrev}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                          style={{ backgroundColor: p.color + '15', color: p.color }}
                        >
                          <span className="font-bold">{p.abbrev}</span>
                          <span>{n}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
