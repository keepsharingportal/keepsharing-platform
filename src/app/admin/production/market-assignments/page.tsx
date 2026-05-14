// ── /admin/production/market-assignments ──────────────────────────────────────
// Market Assignments — which articles run in which markets.
// V1: counts published articles per target_publication, with a deep link
// into Articles filtered by publication.

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Market Assignments — Production' }
export const dynamic  = 'force-dynamic'

const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents',      color: '#22c55e' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        color: '#3b82f6' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    color: '#f97316' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     color: '#a855f7' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', color: '#14b8a6' },
  { abbrev: 'RRB', name: 'River Region Boom',         color: '#eab308' },
]

export default async function MarketAssignmentsPage() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('guide_articles')
    .select('target_publication, published, source_issue_month')

  const counts: Record<string, { total: number; published: number; thisMonth: number }> = {}
  const thisYM = new Date().toISOString().slice(0, 7)
  for (const r of data ?? []) {
    const pub = (r.target_publication as string | null) ?? 'RRP'
    if (!counts[pub]) counts[pub] = { total: 0, published: 0, thisMonth: 0 }
    counts[pub].total += 1
    if (r.published) counts[pub].published += 1
    const m = ((r.source_issue_month as string | null) ?? '').slice(0, 7)
    if (m === thisYM) counts[pub].thisMonth += 1
  }

  // Submission-side: community submissions also carry target_publication
  const { data: subs } = await supabase
    .from('community_submissions')
    .select('target_publication')

  const subCounts: Record<string, number> = {}
  for (const r of subs ?? []) {
    const pub = (r.target_publication as string | null) ?? 'RRP'
    subCounts[pub] = (subCounts[pub] ?? 0) + 1
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/production" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
          <ArrowLeft size={11} /> Production
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Market Assignments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Where each article and submission is currently assigned.</p>
      </div>

      <section>
        <AdminSectionHeader title="Per-Market Totals" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PUBLICATIONS.map(p => {
            const c   = counts[p.abbrev]    ?? { total: 0, published: 0, thisMonth: 0 }
            const sub = subCounts[p.abbrev] ?? 0
            return (
              <div key={p.abbrev} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: p.color }}>{p.abbrev}</p>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                    <span className="text-xs font-bold" style={{ color: p.color }}>{p.abbrev.slice(0, 2)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-base font-bold text-gray-900">{c.total}</p>
                    <p className="text-[10px] text-gray-500">Articles</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-base font-bold text-gray-900">{c.published}</p>
                    <p className="text-[10px] text-gray-500">Published</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-base font-bold text-gray-900">{sub}</p>
                    <p className="text-[10px] text-gray-500">Submissions</p>
                  </div>
                </div>
                <Link
                  href={`/admin/articles?publication=${p.abbrev}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  View articles <ArrowRight size={11} />
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
