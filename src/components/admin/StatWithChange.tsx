// Universal "big number + period-over-period delta" card. Every analytics
// surface uses this so trend context is visible at a glance — no number
// stands alone.

import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import type { PeriodChange } from '@/lib/admin/period-compare'
import { formatPctChange } from '@/lib/admin/period-compare'

interface Props {
  label:     string
  value:     string | number
  change?:   PeriodChange
  /** Optional sublabel — e.g. "unique visitors", "USD spent". */
  sublabel?: string
  /** Hide the comparison footer entirely (e.g. on raw counters that have
   *  no prior-period concept). */
  hideChange?: boolean
}

export function StatWithChange({ label, value, change, sublabel, hideChange }: Props) {
  const display = typeof value === 'number' ? value.toLocaleString('en-US') : value
  const fmt = change && !hideChange ? formatPctChange(change) : null

  return (
    <div className="bg-white border border-portal-border rounded-lg px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-portal-muted">
        {label}
      </p>
      <p className="text-2xl font-bold text-portal-text mt-1 tabular-nums">
        {display}
      </p>
      {sublabel && (
        <p className="text-[11px] text-portal-sub mt-0.5">{sublabel}</p>
      )}
      {fmt && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
          {fmt.tone === 'up' && <TrendingUp  size={11} className="text-portal-green" />}
          {fmt.tone === 'down' && <TrendingDown size={11} className="text-portal-red" />}
          {fmt.tone === 'flat' && <Minus size={11} className="text-portal-muted" />}
          {fmt.tone === 'new' && <Sparkles size={11} className="text-portal-blue" />}
          <span className={
            fmt.tone === 'up'   ? 'text-portal-green' :
            fmt.tone === 'down' ? 'text-portal-red' :
            fmt.tone === 'new'  ? 'text-portal-blue' :
            'text-portal-muted'
          }>
            {fmt.text}
          </span>
          <span className="text-portal-muted font-normal">vs prior {change?.prior.toLocaleString('en-US')}</span>
        </div>
      )}
    </div>
  )
}
