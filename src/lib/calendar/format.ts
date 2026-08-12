// Shared display formatting for calendar event times.
//
// This exists because the same fmtTime helper had been copy-pasted into three
// components (theme/EventCard, calendar/RecurringEventRow,
// family-resource-guide/ComingUpEvents) and NOT into the homepage — so the
// homepage rendered the raw Postgres `time` value and showed readers "17:30"
// instead of "5:30 PM". One copy, imported everywhere, so the next surface
// that renders an event time can't quietly miss it.
//
// Input is a Postgres `time` string: "17:30:00", "17:30", or "9:05".

function parseHourMinute(t: string | null | undefined): { h: number; m: number } | null {
  if (!t) return null
  const [rawH, rawM] = t.split(':')
  const h = Number(rawH)
  const m = Number(rawM ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

/** "17:30" → "5:30 PM", "11:00" → "11 AM". Returns null when unparseable so
 *  callers render nothing rather than leaking a raw 24-hour value. */
export function formatEventTime(t: string | null | undefined): string | null {
  const parsed = parseHourMinute(t)
  if (!parsed) return null
  const { h, m } = parsed
  const hour12 = ((h + 11) % 12) + 1
  const period = h >= 12 ? 'PM' : 'AM'
  // Drop ":00" — "11 AM" reads better than "11:00 AM" on a card.
  const minutes = m > 0 ? `:${String(m).padStart(2, '0')}` : ''
  return `${hour12}${minutes} ${period}`
}

/** Compact variant for dense list rows: "17:30" → "5:30pm", "11:00" → "11am". */
export function formatEventTimeCompact(t: string | null | undefined): string | null {
  const parsed = parseHourMinute(t)
  if (!parsed) return null
  const { h, m } = parsed
  const hour12 = ((h + 11) % 12) + 1
  const period = h >= 12 ? 'pm' : 'am'
  const minutes = m > 0 ? `:${String(m).padStart(2, '0')}` : ''
  return `${hour12}${minutes}${period}`
}
