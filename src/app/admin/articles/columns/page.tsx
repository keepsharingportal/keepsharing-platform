import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { COLUMNS, VERTICALS } from '@/lib/content-taxonomy'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Columns — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

async function fetchColumnCounts(): Promise<Record<string, number>> {
  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from('guide_articles')
    .select('column_slug')
    .not('column_slug', 'is', null)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const slug = row.column_slug as string
    counts[slug] = (counts[slug] ?? 0) + 1
  }
  return counts
}

const VERTICAL_COLORS: Record<string, string> = {
  'school-zone': 'bg-blue-50 text-blue-700 border-blue-200',
  'mom-life':    'bg-pink-50 text-pink-700 border-pink-200',
  'family-fun':  'bg-amber-50 text-amber-700 border-amber-200',
  'health':      'bg-green-50 text-green-700 border-green-200',
  'summer':      'bg-orange-50 text-orange-700 border-orange-200',
  'general':     'bg-gray-50 text-gray-600 border-gray-200',
}

export default async function ColumnsAdminPage() {
  const counts = await fetchColumnCounts()

  // Group columns by vertical
  const byVertical = VERTICALS.map(v => ({
    vertical: v,
    columns:  COLUMNS.filter(c => c.vertical === v.slug),
  })).filter(group => group.columns.length > 0)

  const totalArticles = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/articles" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Columns</h1>
        </div>
        <p className="text-xs text-gray-400 ml-7">
          Content taxonomy — {COLUMNS.length} columns across {VERTICALS.length} verticals · {totalArticles} total articles with a column assigned
        </p>
      </div>

      <div className="p-6 space-y-8 max-w-4xl">
        {byVertical.map(({ vertical, columns }) => {
          const chipClass = VERTICAL_COLORS[vertical.slug] ?? 'bg-gray-50 text-gray-600 border-gray-200'
          const verticalTotal = columns.reduce((sum, c) => sum + (counts[c.slug] ?? 0), 0)

          return (
            <section key={vertical.slug}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  {vertical.label}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${chipClass}`}>
                  {verticalTotal} articles
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {columns.map(col => {
                  const count = counts[col.slug] ?? 0
                  return (
                    <Link
                      key={col.slug}
                      href={`/admin/articles?filter=${col.slug}`}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                            {col.label}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{col.slug}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg shrink-0">
                          {count}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Legend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">About Columns</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Columns are recurring content slots grouped by vertical. Each article can be assigned one column slug,
            which controls its public URL pattern (<code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/columns/[column]/[slug]</code>),
            sidebar display, and related content recommendations.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            To add a new column, edit <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">src/lib/content-taxonomy.ts</code> and
            add an entry to the <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">COLUMNS</code> array.
            No database migration is required — columns are code-defined.
          </p>
        </div>
      </div>
    </div>
  )
}
