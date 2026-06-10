// ── /admin/analytics/content ────────────────────────────────────────────────
// Editorial performance. Four pivots on the same data:
//   • Articles  — title-level leaderboard
//   • Columns   — column rollup (which COLUMN is performing, not just article)
//   • Sections  — section / category rollup (best-of vs school-zone vs etc)
//   • Authors   — per-byline performance
// Period-over-period everywhere.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseRange } from '@/lib/admin/date-range'
import { rangeToTs, withPriorPeriod, computeChange, formatPctChange } from '@/lib/admin/period-compare'
import { AdminDateRangeBar } from '@/components/admin/AdminDateRangeBar'
import { StatWithChange } from '@/components/admin/StatWithChange'

export const metadata: Metadata = { title: 'Content Performance — Analytics' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ since?: string; until?: string; pivot?: string }>
}

type Pivot = 'articles' | 'columns' | 'sections' | 'authors'

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.riverregionparents.com'

export default async function ContentPerformancePage({ searchParams }: PageProps) {
  const params  = await searchParams
  const current = parseRange(params)
  const ranges  = withPriorPeriod(current)
  const pivot   = (['articles', 'columns', 'sections', 'authors'] as Pivot[]).includes(params.pivot as Pivot)
    ? (params.pivot as Pivot)
    : 'articles'

  const supabase = createAdminClient()

  const probe = await supabase.from('article_views').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-portal-amber">Apply migration 071_analytics_foundation.sql first.</p>
        </div>
      </div>
    )
  }

  // Pull both windows + article metadata in parallel.
  const [curRes, priRes] = await Promise.all([
    supabase.from('article_views').select('article_id, session_id')
      .gte('viewed_at', rangeToTs(ranges.current).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.current).untilTs)
      .limit(100_000),
    supabase.from('article_views').select('article_id, session_id')
      .gte('viewed_at', rangeToTs(ranges.prior).sinceTs)
      .lte('viewed_at', rangeToTs(ranges.prior).untilTs)
      .limit(100_000),
  ])
  type Row = { article_id: string; session_id: string }
  const curRows = (curRes.data ?? []) as Row[]
  const priRows = (priRes.data ?? []) as Row[]

  // Build per-article unique-reader sets.
  function readerMap(rows: Row[]): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>()
    for (const r of rows) {
      let set = m.get(r.article_id)
      if (!set) { set = new Set(); m.set(r.article_id, set) }
      set.add(r.session_id)
    }
    return m
  }
  const curByArticle = readerMap(curRows)
  const priByArticle = readerMap(priRows)

  // Pull title metadata for every article touched in either window.
  const allArticleIds = new Set<string>([...curByArticle.keys(), ...priByArticle.keys()])
  let articleMeta: Map<string, { id: string; title: string; slug: string; column_slug: string | null; guide_slug: string | null; author_name: string | null; published_at: string | null }> = new Map()
  if (allArticleIds.size > 0) {
    const { data: artRows } = await supabase
      .from('guide_articles')
      .select('id, title, slug, column_slug, guide_slug, author_name, published_at')
      .in('id', Array.from(allArticleIds))
      .eq('published', true)
    articleMeta = new Map(
      (artRows ?? []).map(r => [(r as { id: string }).id, r as { id: string; title: string; slug: string; column_slug: string | null; guide_slug: string | null; author_name: string | null; published_at: string | null }])
    )
  }

  // ── Pivots: roll up to whichever level the user picked ────────────────
  interface PivotRow {
    key:     string
    label:   string
    sub:     string | null
    current: number
    prior:   number
    href:    string | null
  }

  function articleLink(meta: { id: string; slug: string; column_slug: string | null; guide_slug: string | null }) {
    if (meta.column_slug) return `${SITE_BASE}/columns/${meta.column_slug}/${meta.slug}`
    if (meta.guide_slug)  return `${SITE_BASE}/${meta.guide_slug}/${meta.slug}`
    return `${SITE_BASE}/articles/${meta.slug}`
  }

  let rows: PivotRow[] = []
  if (pivot === 'articles') {
    const built: Array<PivotRow | null> = Array.from(curByArticle.entries())
      .map(([id, set]) => {
        const meta = articleMeta.get(id)
        if (!meta) return null
        const prior = (priByArticle.get(id)?.size) ?? 0
        const row: PivotRow = {
          key: id, label: meta.title,
          sub: meta.column_slug ?? meta.guide_slug ?? 'feature',
          current: set.size, prior,
          href: `/admin/articles/${id}/edit`,
        }
        return row
      })
    rows = built.filter((r): r is PivotRow => r !== null)
  } else if (pivot === 'columns') {
    const byKey = new Map<string, { cur: Set<string>; pri: Set<string> }>()
    function bump(key: string, sessionId: string, isCurrent: boolean) {
      let v = byKey.get(key)
      if (!v) { v = { cur: new Set(), pri: new Set() }; byKey.set(key, v) }
      if (isCurrent) v.cur.add(sessionId); else v.pri.add(sessionId)
    }
    for (const r of curRows) {
      const meta = articleMeta.get(r.article_id); if (!meta?.column_slug) continue
      bump(meta.column_slug, r.session_id, true)
    }
    for (const r of priRows) {
      const meta = articleMeta.get(r.article_id); if (!meta?.column_slug) continue
      bump(meta.column_slug, r.session_id, false)
    }
    rows = Array.from(byKey.entries()).map(([key, v]) => ({
      key, label: key, sub: null,
      current: v.cur.size, prior: v.pri.size,
      href: `/admin/articles?status=all&column_slug=${key}`,
    }))
  } else if (pivot === 'sections') {
    // "Section" = guide_slug, falling back to column_slug. Catches Best Of
    // (frg-best-of), School Zone columns, etc.
    const byKey = new Map<string, { cur: Set<string>; pri: Set<string> }>()
    function bump(key: string, sessionId: string, isCurrent: boolean) {
      let v = byKey.get(key)
      if (!v) { v = { cur: new Set(), pri: new Set() }; byKey.set(key, v) }
      if (isCurrent) v.cur.add(sessionId); else v.pri.add(sessionId)
    }
    function classify(meta: { column_slug: string | null; guide_slug: string | null } | undefined): string | null {
      if (!meta) return null
      if (meta.guide_slug) return meta.guide_slug
      if (meta.column_slug?.startsWith('school-')) return 'school-zone'
      if (meta.column_slug) return meta.column_slug
      return 'other'
    }
    for (const r of curRows) {
      const key = classify(articleMeta.get(r.article_id))
      if (key) bump(key, r.session_id, true)
    }
    for (const r of priRows) {
      const key = classify(articleMeta.get(r.article_id))
      if (key) bump(key, r.session_id, false)
    }
    rows = Array.from(byKey.entries()).map(([key, v]) => ({
      key, label: key, sub: null,
      current: v.cur.size, prior: v.pri.size,
      href: null,
    }))
  } else if (pivot === 'authors') {
    const byKey = new Map<string, { cur: Set<string>; pri: Set<string> }>()
    function bump(key: string, sessionId: string, isCurrent: boolean) {
      let v = byKey.get(key)
      if (!v) { v = { cur: new Set(), pri: new Set() }; byKey.set(key, v) }
      if (isCurrent) v.cur.add(sessionId); else v.pri.add(sessionId)
    }
    for (const r of curRows) {
      const author = articleMeta.get(r.article_id)?.author_name
      if (author) bump(author, r.session_id, true)
    }
    for (const r of priRows) {
      const author = articleMeta.get(r.article_id)?.author_name
      if (author) bump(author, r.session_id, false)
    }
    rows = Array.from(byKey.entries()).map(([key, v]) => ({
      key, label: key, sub: null,
      current: v.cur.size, prior: v.pri.size,
      href: null,
    }))
  }
  rows.sort((a, b) => b.current - a.current)
  rows = rows.slice(0, 100)

  // Totals strip
  const totalCur = curRows.length
  const totalPri = priRows.length
  const uniqueCur = new Set(curRows.map(r => r.session_id)).size
  const uniquePri = new Set(priRows.map(r => r.session_id)).size

  const PIVOTS: Array<{ id: Pivot; label: string }> = [
    { id: 'articles', label: 'Articles' },
    { id: 'columns',  label: 'Columns'  },
    { id: 'sections', label: 'Sections' },
    { id: 'authors',  label: 'Authors'  },
  ]

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <AdminDateRangeBar since={ranges.current.since} until={ranges.current.until} />

      {/* Hero strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatWithChange
          label="Unique readers"
          value={uniqueCur}
          change={computeChange(uniqueCur, uniquePri)}
          sublabel="Anyone who read 1+ article"
        />
        <StatWithChange
          label="Article reads"
          value={totalCur}
          change={computeChange(totalCur, totalPri)}
        />
        <StatWithChange
          label="Articles touched"
          value={curByArticle.size}
          sublabel={`of ${articleMeta.size.toLocaleString()} published`}
          hideChange
        />
      </div>

      {/* Pivot tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted mr-1">View by</span>
        {PIVOTS.map(p => {
          const active = pivot === p.id
          const params = new URLSearchParams()
          params.set('pivot', p.id)
          if (current.since) params.set('since', current.since)
          if (current.until) params.set('until', current.until)
          return (
            <Link
              key={p.id}
              href={`?${params.toString()}`}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                active
                  ? 'bg-portal-navy text-white border-portal-navy'
                  : 'bg-white text-portal-text border-portal-border hover:bg-portal-bg'
              }`}
            >
              {p.label}
            </Link>
          )
        })}
      </div>

      {/* Leaderboard table */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2.5rem_1fr_6rem_5rem_6rem] gap-x-4 items-center px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
          <div>#</div>
          <div>{pivot === 'articles' ? 'Article' : pivot === 'columns' ? 'Column' : pivot === 'sections' ? 'Section' : 'Author'}</div>
          <div className="text-right">Current</div>
          <div className="text-right">Prior</div>
          <div className="text-right">Change</div>
        </div>
        <div className="divide-y divide-portal-border">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-portal-muted">No data for this pivot in the selected range.</div>
          ) : rows.map((r, i) => {
            const ch = computeChange(r.current, r.prior)
            const f  = formatPctChange(ch)
            return (
              <div key={r.key} className="grid grid-cols-[2.5rem_1fr_6rem_5rem_6rem] gap-x-4 items-center px-4 py-2.5 hover:bg-portal-bg/60">
                <div className="text-sm font-bold text-portal-muted tabular-nums">{i + 1}</div>
                <div className="min-w-0">
                  {r.href ? (
                    <Link href={r.href} className="text-sm font-semibold text-portal-text hover:text-portal-blue truncate block" title={r.label}>{r.label}</Link>
                  ) : (
                    <span className="text-sm font-semibold text-portal-text truncate block" title={r.label}>{r.label}</span>
                  )}
                  {r.sub && <p className="text-[11px] text-portal-muted">{r.sub}</p>}
                </div>
                <div className="text-right text-sm tabular-nums font-semibold text-portal-blue">{r.current.toLocaleString()}</div>
                <div className="text-right text-sm tabular-nums text-portal-muted">{r.prior.toLocaleString()}</div>
                <div className={`text-right text-xs font-semibold ${f.tone === 'up' ? 'text-portal-green' : f.tone === 'down' ? 'text-portal-red' : f.tone === 'new' ? 'text-portal-blue' : 'text-portal-muted'}`}>
                  {f.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-portal-muted leading-relaxed">
        <strong>How to use this.</strong> &ldquo;Sections&rdquo; surfaces editorial patterns at the highest level (e.g., best-of vs school-zone). &ldquo;Columns&rdquo; tells you which beats are working. &ldquo;Authors&rdquo; tells you which contributors are pulling. Same data, four lenses — switch between them to triangulate.
      </p>
    </div>
  )
}
