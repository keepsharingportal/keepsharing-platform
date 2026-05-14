// ── /admin/production/print-planning ──────────────────────────────────────────
// Print planning — story-level layout decisions per market per issue.
// V1: lists articles tied to a given issue/market and shows whether they
// have everything print needs (hero image, byline, body length).

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const metadata = { title: 'Print Planning — Production' }
export const dynamic  = 'force-dynamic'

interface Props {
  searchParams: Promise<{ month?: string; pub?: string }>
}

function fmtMonth(ym: string) {
  return new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function PrintPlanningPage({ searchParams }: Props) {
  const { month: rawMonth, pub: rawPub } = await searchParams
  const month = rawMonth ?? thisMonth()
  const pub   = rawPub   ?? 'RRP'

  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, hero_image_url, body, author_name, published, column_slug, source_issue_month')
    .gte('source_issue_month', `${month}-01`)
    .lt('source_issue_month',  `${month}-31`)
    .order('column_slug', { ascending: true, nullsFirst: false })

  const rows = articles ?? []
  const ready = rows.filter(r => r.hero_image_url && r.author_name && (r.body?.length ?? 0) > 100).length

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <Link href="/admin/production" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1">
          <ArrowLeft size={11} /> Production
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Print Planning — {fmtMonth(month)} · {pub}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Confirms each article has the assets it needs before print export.</p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['2026-05', '2026-06', '2026-07', '2026-08'].map(m => (
          <Link
            key={m}
            href={`/admin/production/print-planning?month=${m}&pub=${pub}`}
            className={`px-3 py-1.5 rounded-lg border ${month === m ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
          >
            {fmtMonth(m)}
          </Link>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {['RRP', 'MBP', 'AOP', 'ESP', 'GPP', 'RRB'].map(p => (
          <Link
            key={p}
            href={`/admin/production/print-planning?month=${month}&pub=${p}`}
            className={`px-3 py-1.5 rounded-lg border ${pub === p ? 'bg-gray-900 text-white border-gray-900 font-semibold' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {p}
          </Link>
        ))}
      </div>

      <section>
        <AdminSectionHeader title="Articles in this issue" count={rows.length} description={`${ready} print-ready`} />

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
            <p className="text-sm text-gray-500">No articles assigned to {fmtMonth(month)} yet.</p>
            <Link href="/admin/articles" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:underline">
              Open Articles <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Title</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Column</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Author</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Hero</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Words</th>
                  <th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Ready</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const words      = (r.body ?? '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
                  const hasAll     = !!r.hero_image_url && !!r.author_name && words > 100
                  return (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/articles/${r.id}/edit`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                          {r.title || 'Untitled'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{r.column_slug ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{r.author_name ?? <span className="text-red-500">missing</span>}</td>
                      <td className="px-3 py-2.5 text-xs">{r.hero_image_url ? <CheckCircle2 size={13} className="text-green-600" /> : <AlertTriangle size={13} className="text-amber-500" />}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{words}</td>
                      <td className="px-3 py-2.5 text-xs">{hasAll ? <span className="text-green-600 font-semibold">Ready</span> : <span className="text-amber-600 font-semibold">Incomplete</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
