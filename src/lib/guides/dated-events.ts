// Dates for a dated event guide (Fall Festivities today).
//
// ── What was there before ───────────────────────────────────────────────────
// Listings carried a free-text `dates` string ("October 30, 2026", "Weekends
// through Oct") which rendered on the card and sorted not at all — the hub
// came out in whatever order the category query returned. A reader scanning
// for "what's on this weekend" had to read every card, and an event that
// finished last week sat at the top looking current.
//
// The importer also writes structured `start_date` / `end_date` in ISO form,
// which is what this module uses. Greater Pensacola's fall import has
// start_date on 87 of 96 listings and end_date on 92. A listing with neither
// is not wrong — "Weekends through October" is genuinely a range nobody
// pinned — so it sorts after the dated ones rather than being hidden.

/** ISO yyyy-mm-dd, or null when the listing has no usable date. */
function isoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  // Accept a full timestamp too; the importer writes plain dates but the
  // admin editor may not.
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

export interface DatedWindow {
  start: string | null
  end:   string | null
}

/** Pull the structured window out of guide_data. */
export function datedWindow(guideData: Record<string, unknown> | null | undefined): DatedWindow {
  const start = isoDate(guideData?.start_date)
  const end   = isoDate(guideData?.end_date)
  // A single-day event often has only one of the two. Treat each as the
  // other's default so "is it on today" has something to compare.
  return { start: start ?? end, end: end ?? start }
}

export type DateStatus = 'happening-now' | 'upcoming' | 'past' | 'undated'

/**
 * Where a listing sits relative to today.
 *
 * `happening-now` means today falls inside [start, end] inclusive — the
 * reader can go this minute, which is the one thing a seasonal hub should
 * put first.
 */
export function dateStatus(
  guideData: Record<string, unknown> | null | undefined,
  todayIso?: string,
): DateStatus {
  const { start, end } = datedWindow(guideData)
  if (!start && !end) return 'undated'
  const today = todayIso ?? new Date().toISOString().slice(0, 10)
  if (end && today > end) return 'past'
  if (start && today < start) return 'upcoming'
  return 'happening-now'
}

/** Has this listing finished? Used to drop it from the hub automatically. */
export function isExpired(
  guideData: Record<string, unknown> | null | undefined,
  todayIso?: string,
): boolean {
  return dateStatus(guideData, todayIso) === 'past'
}

/**
 * Chronological order: soonest first, undated last.
 *
 * Within the same start date, ties break on name so the order is stable
 * between renders — otherwise ISR regenerates the page with cards shuffled
 * and it reads as a bug.
 */
export function compareByDate<T extends { guide_data?: unknown; business_name?: string | null }>(
  a: T, b: T,
): number {
  const aw = datedWindow(a.guide_data as Record<string, unknown> | null)
  const bw = datedWindow(b.guide_data as Record<string, unknown> | null)
  if (!aw.start && !bw.start) return (a.business_name ?? '').localeCompare(b.business_name ?? '')
  if (!aw.start) return 1
  if (!bw.start) return -1
  if (aw.start !== bw.start) return aw.start < bw.start ? -1 : 1
  return (a.business_name ?? '').localeCompare(b.business_name ?? '')
}

/**
 * Split a dated guide's listings into what a seasonal hub should show.
 *
 * `expired` is returned rather than silently dropped so a caller can count
 * it, and so the behaviour is visible in tests instead of being an absence.
 */
export function partitionByDate<T extends { guide_data?: unknown; business_name?: string | null }>(
  listings: T[],
  todayIso?: string,
): { happeningNow: T[]; upcoming: T[]; undated: T[]; expired: T[] } {
  const out = { happeningNow: [] as T[], upcoming: [] as T[], undated: [] as T[], expired: [] as T[] }
  for (const l of listings) {
    const status = dateStatus(l.guide_data as Record<string, unknown> | null, todayIso)
    if (status === 'happening-now') out.happeningNow.push(l)
    else if (status === 'upcoming') out.upcoming.push(l)
    else if (status === 'undated')  out.undated.push(l)
    else out.expired.push(l)
  }
  out.happeningNow.sort(compareByDate)
  out.upcoming.sort(compareByDate)
  out.undated.sort((a, b) => (a.business_name ?? '').localeCompare(b.business_name ?? ''))
  return out
}
