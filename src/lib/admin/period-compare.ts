// Period-over-period comparison utilities.
//
// Every report number is more useful with context: "1,000 visits" means
// nothing; "1,000 visits, up 23% from prior 30 days" tells the editor
// whether the business is healthier. We compute both windows automatically.
//
//   currentRange:  whatever the user picked (30 days by default)
//   priorRange:    the equivalent window immediately before currentRange
//
// E.g. currentRange = 2026-05-12 to 2026-06-10 (30 days)
//      priorRange   = 2026-04-12 to 2026-05-11 (30 days, immediately prior)

import type { DateRange } from './date-range'

export interface CompareRanges {
  current: DateRange
  prior:   DateRange
}

export function priorPeriod(current: DateRange): DateRange {
  const ms      = 86_400_000
  const startMs = new Date(`${current.since}T00:00:00Z`).getTime()
  const priorEndMs   = startMs - ms             // day before current.since
  const priorStartMs = priorEndMs - (current.days - 1) * ms
  return {
    since: new Date(priorStartMs).toISOString().slice(0, 10),
    until: new Date(priorEndMs).toISOString().slice(0, 10),
    days:  current.days,
  }
}

export interface PeriodChange {
  /** Current period value. */
  current:  number
  /** Prior period value (same length, ending the day before current.since). */
  prior:    number
  /** Absolute change (current − prior). */
  delta:    number
  /** Percentage change. null when prior is 0 (can't compute %). */
  pctChange: number | null
}

export function computeChange(current: number, prior: number): PeriodChange {
  const delta = current - prior
  let pctChange: number | null = null
  if (prior > 0) {
    pctChange = (delta / prior) * 100
  } else if (current > 0) {
    pctChange = null     // first-time, can't compute meaningful %
  } else {
    pctChange = 0        // both zero — flat
  }
  return { current, prior, delta, pctChange }
}

export function formatPctChange(c: PeriodChange): {
  text:   string
  tone:   'up' | 'down' | 'flat' | 'new'
} {
  if (c.pctChange === null && c.current === 0) return { text: '—', tone: 'flat' }
  if (c.pctChange === null) return { text: 'NEW', tone: 'new' }
  if (Math.abs(c.pctChange) < 0.5)             return { text: '0%', tone: 'flat' }
  const sign = c.pctChange > 0 ? '+' : ''
  return {
    text: `${sign}${c.pctChange.toFixed(1)}%`,
    tone: c.pctChange > 0 ? 'up' : 'down',
  }
}

/** ISO timestamp bounds (inclusive start-of-day, end-of-day UTC). */
export function rangeToTs(r: DateRange): { sinceTs: string; untilTs: string } {
  return {
    sinceTs: `${r.since}T00:00:00Z`,
    untilTs: `${r.until}T23:59:59Z`,
  }
}

/** Resolve both ranges from the user's current pick. */
export function withPriorPeriod(current: DateRange): CompareRanges {
  return { current, prior: priorPeriod(current) }
}
