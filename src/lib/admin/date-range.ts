// Shared date-range parsing + helpers for the admin analytics surface.
// Same defaults across every report (7d/30d/90d/All/Custom, 30d default)
// so editors don't have to relearn the picker per page.

export interface DateRange {
  since: string                // 'YYYY-MM-DD'
  until: string                // 'YYYY-MM-DD'
  days:  number
}

export function defaultRange(): { since: string; until: string } {
  const until = new Date()
  const since = new Date(until); since.setUTCDate(since.getUTCDate() - 29)
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  }
}

export function parseRange(raw: { since?: string | null; until?: string | null }): DateRange {
  const def = defaultRange()
  const valid = (s: string | null | undefined): string | null => {
    if (!s) return null
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  let since = valid(raw.since) ?? def.since
  let until = valid(raw.until) ?? def.until
  if (since > until) [since, until] = [until, since]
  const days = Math.max(1, Math.round(
    (new Date(`${until}T00:00:00Z`).getTime() - new Date(`${since}T00:00:00Z`).getTime()) / 86_400_000,
  ) + 1)
  return { since, until, days }
}

/** Build ISO timestamp bounds inclusive at start-of-day / end-of-day UTC. */
export function rangeToTimestamps(r: { since: string; until: string }): { sinceTs: string; untilTs: string } {
  return {
    sinceTs: `${r.since}T00:00:00Z`,
    untilTs: `${r.until}T23:59:59Z`,
  }
}
