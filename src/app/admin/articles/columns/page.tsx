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
  'school-zone': 'bg-portal-blue-lt text-portal-blue border-portal-blue/30',
  'mom-life':    'bg-portal-red-lt text-portal-red border-portal-red/30',
  'family-fun':  'bg-portal-amber-lt text-portal-amber border-portal-amber/30',
  'health':      'bg-portal-green-lt text-portal-green border-portal-green/30',
  'summer':      'bg-portal-amber-lt text-portal-amber border-portal-amber/30',
  'general':     'bg-portal-bg text-portal-sub border-portal-border',
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
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/articles" className="text-portal-muted hover:text-portal-sub transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-semibold text-portal-text">Columns</h1>
        </div>
        <p className="text-xs text-portal-muted ml-7">
          Content taxonomy — {COLUMNS.length} columns across {VERTICALS.length} verticals · {totalArticles} total articles with a column assigned
        </p>
      </div>

      <div className="p-6 space-y-8 max-w-4xl">
        {byVertical.map(({ vertical, columns }) => {
          const chipClass = VERTICAL_COLORS[vertical.slug] ?? 'bg-portal-bg text-portal-sub border-portal-border'
          const verticalTotal = columns.reduce((sum, c) => sum + (counts[c.slug] ?? 0), 0)

          return (
            <section key={vertical.slug}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-portal-text uppercase tracking-wider">
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
                      className="bg-white rounded-lg border border-portal-border p-4 hover:border-portal-border-2 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-portal-text group-hover:text-portal-blue transition-colors leading-tight">
                            {col.label}
                          </p>
                          <p className="text-[11px] text-portal-muted mt-0.5 font-mono">{col.slug}</p>
                        </div>
                        <span className="text-xs font-bold text-portal-sub bg-portal-row-hover px-2 py-1 rounded-lg shrink-0">
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
        <div className="bg-white rounded-lg border border-portal-border p-5">
          <h3 className="text-xs font-bold text-portal-sub uppercase tracking-wider mb-3">About Columns</h3>
          <p className="text-sm text-portal-sub leading-relaxed mb-3">
            Columns are recurring content slots grouped by vertical. Each article can be assigned one column slug,
            which controls its public URL pattern (<code className="text-xs bg-portal-row-hover px-1 py-0.5 rounded">/columns/[column]/[slug]</code>),
            sidebar display, and related content recommendations.
          </p>
          <p className="text-sm text-portal-sub leading-relaxed">
            To add a new column, edit <code className="text-xs bg-portal-row-hover px-1 py-0.5 rounded">src/lib/content-taxonomy.ts</code> and
            add an entry to the <code className="text-xs bg-portal-row-hover px-1 py-0.5 rounded">COLUMNS</code> array.
            No database migration is required — columns are code-defined.
          </p>
        </div>
      </div>
    </div>
  )
}
