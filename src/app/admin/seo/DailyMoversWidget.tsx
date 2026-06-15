// Daily movers digest — one-glance "what happened yesterday" for the
// editor. Server component.

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { DailyMoversResult, DailyMover } from '@/lib/seo/daily-movers'

export function DailyMoversWidget({ movers }: { movers: DailyMoversResult }) {
  if (!movers.asOfDate) {
    return (
      <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-sub)' }}>
        <strong className="text-[13px] text-portal-text">Daily movers</strong>
        <p className="text-[12px] text-portal-sub mt-1">
          No GSC data yet — daily movers light up after the first GSC sync runs.
        </p>
      </div>
    )
  }

  const totalMovers = movers.clickJumps.length + movers.clickDrops.length + movers.posJumps.length + movers.posDrops.length

  return (
    <div className="bg-white border border-portal-border rounded-lg p-4" style={{ borderLeft: '3px solid var(--color-portal-blue)' }}>
      <div className="flex items-center justify-between mb-3">
        <strong className="text-[13px] text-portal-text">
          Daily movers · {formatDate(movers.asOfDate)} vs prior 7d avg
        </strong>
        <span className="text-[11px] text-portal-sub">
          {totalMovers} movements detected
        </span>
      </div>

      {totalMovers === 0 ? (
        <p className="text-[12px] text-portal-sub p-2">Quiet day. No articles moved enough to flag.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2.5">
          <MoverList title="Click jumps"     tone="green" icon={<ArrowUpRight size={11} />}   rows={movers.clickJumps} metric="clicks" />
          <MoverList title="Click drops"     tone="red"   icon={<ArrowDownRight size={11} />} rows={movers.clickDrops} metric="clicks" />
          <MoverList title="Position jumps"  tone="green" icon={<TrendingUp size={11} />}     rows={movers.posJumps}   metric="position" />
          <MoverList title="Position drops"  tone="red"   icon={<TrendingDown size={11} />}   rows={movers.posDrops}   metric="position" />
        </div>
      )}
    </div>
  )
}

function MoverList({ title, tone, icon, rows, metric }: {
  title:  string
  tone:   'green' | 'red'
  icon:   React.ReactNode
  rows:   DailyMover[]
  metric: 'clicks' | 'position'
}) {
  const tw = tone === 'green' ? 'text-portal-green' : 'text-portal-red'
  return (
    <div className="bg-portal-bg rounded-md p-2.5" style={{ minHeight: 80 }}>
      <div className={`flex items-center gap-1 mb-2 ${tw}`}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-portal-sub">—</div>
      ) : (
        <div className="space-y-1">
          {rows.slice(0, 6).map(r => (
            <div key={r.pagePath} className="flex items-center gap-1.5 text-[11px]">
              <div className="flex-1 min-w-0">
                {r.articleId ? (
                  <Link href={`/admin/articles/${r.articleId}/seo`} className="text-[11px] font-bold text-portal-text hover:underline block truncate">
                    {r.title ?? shortPath(r.pagePath)}
                  </Link>
                ) : (
                  <span className="text-[10px] text-portal-sub">{shortPath(r.pagePath)}</span>
                )}
              </div>
              <span className={`font-bold whitespace-nowrap ${tw}`}>
                {metric === 'clicks'
                  ? `${r.clicksDelta > 0 ? '+' : ''}${r.clicksDelta.toFixed(1)}`
                  : `${r.positionDelta > 0 ? '+' : ''}${r.positionDelta.toFixed(1)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function shortPath(p: string): string {
  return p.length <= 30 ? p : p.slice(0, 14) + '…' + p.slice(-12)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  } catch { return iso }
}
