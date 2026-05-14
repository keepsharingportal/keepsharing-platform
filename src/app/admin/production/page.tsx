// ── /admin/production ─────────────────────────────────────────────────────────
// Production hub — the orchestration layer between content and channels.
// Surfaces the six core production activities and recent issue activity.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader'
import {
  BookOpen, Sparkles, Printer, Map, Package, Calendar, LayoutGrid, ArrowRight,
} from 'lucide-react'

export const metadata = { title: 'Production — KeepSharing Admin' }
export const dynamic  = 'force-dynamic'

const TILES = [
  { label: 'Issues',             href: '/admin/production/issues',             icon: BookOpen,   blurb: 'Plan monthly issues per market.' },
  { label: 'Monthly Themes',     href: '/admin/production/themes',             icon: Sparkles,   blurb: 'Market-specific editorial themes.' },
  { label: 'Print Planning',     href: '/admin/production/print-planning',     icon: Printer,    blurb: 'Story placement and print layout.' },
  { label: 'Layout Queue',       href: '/admin/advertisers/layout-sheet',      icon: LayoutGrid, blurb: 'Ad layout sheet for the printer.' },
  { label: 'Market Assignments', href: '/admin/production/market-assignments', icon: Map,        blurb: 'Which articles run in which markets.' },
  { label: 'Export Packages',    href: '/admin/production/export-packages',    icon: Package,    blurb: 'Bundles ready for InDesign or PDF.' },
  { label: 'Production Calendar', href: '/admin/content/calendar',             icon: Calendar,   blurb: 'Full editorial + production timeline.' },
]

export default async function ProductionHubPage() {
  const supabase = await createClient()

  // Pull recent issues (distinct source_issue_month) and article counts
  const { data: recentArticles } = await supabase
    .from('guide_articles')
    .select('source_issue_month')
    .not('source_issue_month', 'is', null)
    .order('source_issue_month', { ascending: false })
    .limit(200)

  const issueCounts: Record<string, number> = {}
  for (const r of recentArticles ?? []) {
    const m = (r.source_issue_month as string | null) ?? ''
    if (m) issueCounts[m] = (issueCounts[m] ?? 0) + 1
  }
  const recentIssues = Object.entries(issueCounts).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Production</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan, assemble, and ship each market&apos;s monthly issue.</p>
      </div>

      <section>
        <AdminSectionHeader title="Activities" description="Each tile opens a dedicated workspace" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TILES.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <t.icon size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.blurb}</p>
              </div>
              <ArrowRight size={14} className="text-gray-300 shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <AdminSectionHeader title="Recent Issues" count={recentIssues.length} description="Based on articles with a source_issue_month" />
        {recentIssues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
            <p className="text-sm text-gray-500">No articles have an issue month set yet.</p>
            <Link href="/admin/articles" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:underline">
              Open Articles <ArrowRight size={11} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recentIssues.map(([month, count]) => (
              <Link
                key={month}
                href={`/admin/production/issues?month=${month.slice(0, 7)}`}
                className="rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-300 transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{month.slice(0, 7)}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{count}</p>
                <p className="text-[11px] text-gray-500">{count === 1 ? 'article' : 'articles'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
