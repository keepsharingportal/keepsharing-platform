// expand-recurrences — turn calendar_events rows with a recurrence_rule
// into virtual one-off rows for the requested date window. The DB stays
// lean (one row per recurring event, not one per occurrence), and the
// public calendar reads see a flat sorted list it can render with no
// special-case logic.
//
// Used by:
//   - /api/calendar/events/route.ts  (the calendar feed API)
//   - /api/calendar/feed.ics/route.ts (the subscribe-able iCal feed)
//   - /app/calendar/page.tsx         (the calendar page query)
//
// Inputs: events from a Supabase query + a date window. Recurring rows
// are EXPANDED into virtual occurrences within the window; non-recurring
// rows pass through unchanged. Virtual rows are clones of the template
// with `start_date` set to the occurrence date and `end_date` moved with
// that occurrence when the stored end belongs to an earlier week.
//
// The master row is never rewritten. Detail pages and Event JSON-LD read
// the canonical row, so a weekly series stays a single-day event there
// instead of stretching out to its UNTIL date.
//
// Important: the SELECT that feeds this should NOT filter recurring
// events by start_date (a weekly event that started a year ago is still
// producing occurrences today). Use `recurringOutOfWindowFilter` below
// for the calendar feed.

import { rrulestr } from 'rrule'

export interface ExpandableEvent {
  start_date:       string                  // 'YYYY-MM-DD'
  end_date?:        string | null           // 'YYYY-MM-DD'
  start_time?:      string | null           // 'HH:MM:SS' (optional)
  end_time?:        string | null
  recurrence_rule?: string | null
}

/**
 * Expand any recurring rows in `events` into virtual occurrences in
 * [windowStart, windowEnd], keep the non-recurring rows as-is, and
 * return a sorted-by-date flat list.
 */
export function expandRecurrences<T extends ExpandableEvent>(
  events:      T[],
  windowStart: Date,
  windowEnd:   Date,
): T[] {
  const out: T[] = []
  for (const ev of events) {
    if (!ev.recurrence_rule) {
      // Non-recurring — keep if it falls inside the window. The caller
      // typically already filtered for this, but we double-check so the
      // function is safe to use with mixed inputs. A continuous multi-day
      // master (Alabama National Fair, Oct 8–18) has no per-day split, so
      // its real end_date passes through untouched.
      if (inWindow(ev.start_date, windowStart, windowEnd)) out.push(ev)
      continue
    }

    try {
      const dtstart = parseDtstart(ev.start_date, ev.start_time ?? null)
      const rule    = rrulestr(ev.recurrence_rule, { dtstart })
      const occurrences = rule.between(windowStart, windowEnd, true /* inclusive */)
      for (const occ of occurrences) {
        out.push(withOccurrenceDates(ev, occ))
      }
    } catch {
      // Bad rule string — fall through and treat the row as one-off so
      // the editor still sees their event on the calendar.
      if (inWindow(ev.start_date, windowStart, windowEnd)) out.push(ev)
    }
  }
  out.sort((a, b) => a.start_date.localeCompare(b.start_date))
  return out
}

/**
 * The two-query helper for callers that want maximum performance:
 *   - non-recurring + recurring rows in the window: cheap straight scan
 *   - recurring rows that started BEFORE the window: must be fetched
 *     separately and expanded because their start_date is out of range
 *
 * Returns the OR filter string for the second query so the caller can
 * .or(filter) on top of their own WHERE. Use when start_date filtering
 * on the public side is critical for performance.
 */
export function recurringOutOfWindowFilter(windowStartIso: string): string {
  // Postgrest 'or' string: rows where recurrence_rule is set AND
  // start_date is before the window. These need expansion.
  return `recurrence_rule.not.is.null,start_date.lt.${windowStartIso}`
}

/**
 * Point a virtual occurrence at its own dates.
 *
 * Weekly (and similar) masters store end_date as the first occurrence's
 * end — often the same day as start_date. Copying that end onto a later
 * week makes start_date > end_date. Shift the end forward by the original
 * length so a one-day trivia night stays one day, and a Fri–Sun repeat
 * still ends on Sunday.
 *
 * Leave the end alone when it is still on or after this occurrence.
 * FREQ=DAILY series such as NewSouth (Sep 30–Oct 3) keep the real series
 * end on each expanded day, and an unsplit multi-day master never reaches
 * this function.
 */
function withOccurrenceDates<T extends ExpandableEvent>(ev: T, occ: Date): T {
  const start_date = toIsoDate(occ)
  if (!ev.end_date || ev.end_date >= start_date) {
    return { ...ev, start_date }
  }
  return {
    ...ev,
    start_date,
    end_date: shiftedEndDate(ev.start_date, ev.end_date, start_date, ev.recurrence_rule ?? ''),
  }
}

function shiftedEndDate(
  masterStart: string,
  masterEnd:   string,
  occStart:    string,
  rule:        string,
): string {
  let span = utcDayNumber(masterEnd) - utcDayNumber(masterStart)
  if (!Number.isFinite(span) || span < 0) span = 0
  // A span that reaches the next repeat is a series boundary parked on
  // the master, not the length of one night. Snap to the occurrence day
  // so a weekly row cannot render as a months-long event.
  const intervalDays = recurrenceIntervalDays(rule)
  if (intervalDays !== null && span >= intervalDays) span = 0
  return addUtcDays(occStart, span)
}

function recurrenceIntervalDays(rule: string): number | null {
  const freq = rule.match(/FREQ=(SECONDLY|MINUTELY|HOURLY|DAILY|WEEKLY|MONTHLY|YEARLY)/i)?.[1]?.toUpperCase()
  if (!freq) return null
  const interval = Number(rule.match(/INTERVAL=(\d+)/i)?.[1] ?? '1')
  const step = Number.isFinite(interval) && interval >= 1 ? interval : 1
  const base =
    freq === 'DAILY'   ? 1   :
    freq === 'WEEKLY'  ? 7   :
    freq === 'MONTHLY' ? 28  :
    freq === 'YEARLY'  ? 365 :
    1
  return base * step
}

function parseDtstart(dateStr: string, timeStr: string | null): Date {
  // The DB stores start_date as a plain DATE and start_time as TIME
  // without timezone. We anchor everything to UTC for rrule expansion
  // so the date math is stable across server timezones; downstream
  // renderers already treat start_date as a wall-clock date.
  const t = (timeStr ?? '00:00:00').slice(0, 8)
  return new Date(`${dateStr}T${t}Z`)
}

function utcDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000)
}

function addUtcDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return toIsoDate(new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days)))
}

function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function inWindow(dateStr: string, windowStart: Date, windowEnd: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`).getTime()
  return d >= windowStart.getTime() && d <= windowEnd.getTime()
}
