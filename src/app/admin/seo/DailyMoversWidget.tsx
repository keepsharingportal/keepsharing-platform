// Daily movers digest — one-glance "what happened yesterday" for the
// editor. Server component, reads loadDailyMovers() and renders 4
// compact lists.

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { DailyMoversResult, DailyMover } from '@/lib/seo/daily-movers'

export function DailyMoversWidget({ movers }: { movers: DailyMoversResult }) {
  if (!movers.asOfDate) {
    return (
      <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--color-portal-sub)', padding: 14 }}>
        <strong className="text-portal-text" style={{ fontSize: 13 }}>Daily movers</strong>
        <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 4 }}>
          No GSC data yet — daily movers light up after the first GSC sync runs.
        </p>
      </div>
    )
  }

  const totalMovers = movers.clickJumps.length + movers.clickDrops.length + movers.posJumps.length + movers.posDrops.length

  return (
    <div className="card" style={{ marginTop: 18, padding: 14, borderLeft: '3px solid var(--color-portal-blue)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong className="text-portal-text" style={{ fontSize: 13 }}>
          Daily movers · {formatDate(movers.asOfDate)} vs prior 7d avg
        </strong>
        <span className="text-portal-sub" style={{ fontSize: 11 }}>
          {totalMovers} movements detected
        </span>
      </div>

      {totalMovers === 0 ? (
        <p className="text-portal-sub" style={{ fontSize: 12, padding: 8 }}>
          Quiet day. No articles moved enough to flag.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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
  const color = tone === 'green' ? 'var(--color-portal-green)' : 'var(--color-portal-red)'
  return (
    <div style={{ background: 'var(--color-portal-bg)', borderRadius: 6, padding: 10, minHeight: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, color }}>
        {icon}
        <span className="fw-700" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.3px' }}>
          {title}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-portal-sub" style={{ fontSize: 11 }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {rows.slice(0, 6).map(r => (
            <div key={r.pagePath} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {r.articleId ? (
                  <Link href={`/admin/articles/${r.articleId}/seo`} className="text-portal-text fw-700 hover:underline" style={{ fontSize: 11, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.title ?? shortPath(r.pagePath)}
                  </Link>
                ) : (
                  <span className="text-portal-sub" style={{ fontSize: 10 }}>{shortPath(r.pagePath)}</span>
                )}
              </div>
              <span style={{ fontWeight: 700, color, whiteSpace: 'nowrap' }}>
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
