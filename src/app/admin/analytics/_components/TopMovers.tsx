// "Top movers" — articles whose engagement changed the most vs the prior
// equivalent window. Surfaces both gainers (new hits) and losers (faded
// stories) so the editorial team has a quick-glance "what's happening
// this week" signal.
//
// Implementation: we already pull the current period in the parent
// loader, so this component runs one additional query for the prior
// period's article view counts, then computes deltas in JS.

import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'

interface Props {
  currentRows:      Array<{ article_id: string; session_id: string }>
  priorWindowStart: string
  priorWindowEnd:   string
}

export async function TopMovers({ currentRows, priorWindowStart, priorWindowEnd }: Props) {
  const supabase = createAdminClient()

  // Roll current rows to (article_id → unique readers + total views).
  type Bucket = { article_id: string; uniqueReaders: number; views: number }
  const curMap = new Map<string, { uniqueSet: Set<string>; views: number }>()
  for (const r of currentRows) {
    let b = curMap.get(r.article_id)
    if (!b) { b = { uniqueSet: new Set(), views: 0 }; curMap.set(r.article_id, b) }
    b.uniqueSet.add(r.session_id)
    b.views++
  }
  const current: Bucket[] = Array.from(curMap.entries()).map(([article_id, b]) => ({
    article_id, uniqueReaders: b.uniqueSet.size, views: b.views,
  }))

  // Prior period — only need the same article IDs (don't care about
  // articles that disappeared entirely, they'll still surface as 0).
  const { data: priorRowsRaw } = await supabase
    .from('article_views')
    .select('article_id, session_id')
    .gte('viewed_at', priorWindowStart)
    .lte('viewed_at', priorWindowEnd)
    .limit(50_000)
  const priMap = new Map<string, Set<string>>()
  for (const r of ((priorRowsRaw ?? []) as Array<{ article_id: string; session_id: string }>)) {
    let set = priMap.get(r.article_id)
    if (!set) { set = new Set(); priMap.set(r.article_id, set) }
    set.add(r.session_id)
  }

  // Title lookup for the article IDs we'll show.
  const allIds = new Set<string>([...current.map(c => c.article_id), ...priMap.keys()])
  const titleMap = new Map<string, { title: string; column_slug: string | null }>()
  if (allIds.size > 0) {
    const { data: artRows } = await supabase
      .from('guide_articles')
      .select('id, title, column_slug')
      .in('id', Array.from(allIds))
    for (const row of (artRows ?? []) as Array<{ id: string; title: string; column_slug: string | null }>) {
      titleMap.set(row.id, { title: row.title, column_slug: row.column_slug })
    }
  }

  // Compute delta per article. Show top 5 gainers + top 3 losers.
  interface Mover {
    article_id:    string
    title:         string
    column_slug:   string | null
    currentReaders: number
    priorReaders:  number
    delta:         number
    isNew:         boolean
  }
  const movers: Mover[] = []
  for (const c of current) {
    const meta = titleMap.get(c.article_id)
    if (!meta) continue
    const prior = (priMap.get(c.article_id)?.size) ?? 0
    movers.push({
      article_id: c.article_id, title: meta.title, column_slug: meta.column_slug,
      currentReaders: c.uniqueReaders, priorReaders: prior,
      delta: c.uniqueReaders - prior,
      isNew: prior === 0 && c.uniqueReaders > 0,
    })
  }
  // Losers — articles in prior that aren't (or barely are) in current.
  for (const [pid, pset] of priMap.entries()) {
    if (curMap.has(pid)) continue   // already in movers list above
    const meta = titleMap.get(pid)
    if (!meta) continue
    movers.push({
      article_id: pid, title: meta.title, column_slug: meta.column_slug,
      currentReaders: 0, priorReaders: pset.size,
      delta: -pset.size, isNew: false,
    })
  }

  const gainers = movers.filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5)
  const losers  = movers.filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)

  if (gainers.length === 0 && losers.length === 0) return null

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub mb-3">Top movers</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <MoverList title="Gainers" rows={gainers} tone="up" />
        <MoverList title="Losers"  rows={losers}  tone="down" />
      </div>
    </section>
  )
}

function MoverList({ title, rows, tone }: { title: string; rows: Array<{ article_id: string; title: string; column_slug: string | null; currentReaders: number; priorReaders: number; delta: number; isNew: boolean }>; tone: 'up' | 'down' }) {
  const Icon = tone === 'up' ? TrendingUp : TrendingDown
  const accent = tone === 'up' ? 'text-portal-green' : 'text-portal-red'

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-portal-border bg-portal-bg flex items-center gap-1.5">
        <Icon size={12} className={accent} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-portal-muted">{title}</span>
      </div>
      <div className="divide-y divide-portal-border">
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-portal-muted">No movers in this period.</div>
        )}
        {rows.map(r => (
          <Link key={r.article_id} href={`/admin/articles/${r.article_id}/edit`} className="block px-4 py-2.5 hover:bg-portal-bg/60">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-portal-text truncate">{r.title}</p>
                {r.column_slug && <p className="text-[11px] text-portal-muted">{r.column_slug}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold tabular-nums ${accent}`}>
                  {r.delta > 0 ? '+' : ''}{r.delta}
                </p>
                <p className="text-[10px] text-portal-muted tabular-nums">
                  {r.priorReaders} → {r.currentReaders}
                </p>
              </div>
              {r.isNew && <Sparkles size={11} className="text-portal-blue shrink-0" />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
