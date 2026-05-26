// GET /api/calendar/feed.ics
// Public iCal feed of all published, non-archived, future calendar events.
// Parents can subscribe in Google Calendar, Apple Calendar, Outlook, etc.
//
// One of the biggest trust + retention wins for a community calendar — the
// browser tab isn't the only way to follow along.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime  = 'nodejs'
export const revalidate = 1800   // refresh the feed every 30 minutes

interface PublishedEvent {
  id:               string
  slug:             string | null
  title:            string
  description:      string | null
  start_date:       string
  end_date:         string | null
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  address:          string | null
  city:             string | null
  // Optional — only present when migration 077 has been applied
  registration_url?: string | null
  organizer_name?:   string | null
  is_free:          boolean | null
  cost_text:        string | null
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
const TZID = 'America/Chicago'

/** Escape a string per RFC 5545 §3.3.11. */
function icsEscape(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

/** Fold long lines to <= 75 octets per RFC 5545 §3.1 (CRLF + space). */
function fold(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  let s = line
  out.push(s.slice(0, 75))
  s = s.slice(75)
  while (s.length > 74) {
    out.push(' ' + s.slice(0, 74))
    s = s.slice(74)
  }
  if (s.length) out.push(' ' + s)
  return out.join('\r\n')
}

/** Parse a stored time string ("4:00 PM" or "16:00") into HHMMSS (24-hour). */
function parseTimeToHms(time: string | null): string {
  if (!time) return '000000'
  const trimmed = time.trim()
  // 12-hour: "4:00 PM", "10:30 AM"
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (ampm) {
    let h    = parseInt(ampm[1], 10)
    const m  = ampm[2]
    const ap = ampm[3].toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}${m}00`
  }
  // 24-hour: "16:00", "07:30"
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    return `${hhmm[1].padStart(2, '0')}${hhmm[2]}00`
  }
  return '000000'
}

/** YYYY-MM-DD + time-string → "YYYYMMDDTHHMMSS" local time, paired with TZID. */
function icsDateTime(date: string, time: string | null): string {
  return `${date.replace(/-/g, '')}T${parseTimeToHms(time)}`
}

/** All-day events use VALUE=DATE without TZID. */
function icsAllDay(date: string): string {
  return date.replace(/-/g, '')
}

function buildVEvent(ev: PublishedEvent): string {
  const lines: string[] = []
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${ev.id}@riverregionparents.com`)
  lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`)

  if (ev.start_time) {
    lines.push(`DTSTART;TZID=${TZID}:${icsDateTime(ev.start_date, ev.start_time)}`)
    const endDate = ev.end_date ?? ev.start_date
    const endTime = ev.end_time ?? ev.start_time
    lines.push(`DTEND;TZID=${TZID}:${icsDateTime(endDate, endTime)}`)
  } else {
    lines.push(`DTSTART;VALUE=DATE:${icsAllDay(ev.start_date)}`)
    if (ev.end_date && ev.end_date !== ev.start_date) {
      // iCal DTEND for all-day is exclusive — add one day
      const next = new Date(`${ev.end_date}T00:00:00Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      lines.push(`DTEND;VALUE=DATE:${icsAllDay(next.toISOString().slice(0, 10))}`)
    }
  }

  lines.push(fold(`SUMMARY:${icsEscape(ev.title)}`))

  // Pack the most useful context into DESCRIPTION
  const descParts: string[] = []
  if (ev.description) descParts.push(ev.description)
  if (ev.organizer_name) descParts.push(`Organized by: ${ev.organizer_name}`)
  if (ev.is_free) descParts.push('Free event')
  else if (ev.cost_text) descParts.push(`Cost: ${ev.cost_text}`)
  if (ev.registration_url) descParts.push(`Register: ${ev.registration_url}`)
  descParts.push(`More details: ${SITE}/calendar/events/${ev.slug ?? ev.id}`)
  lines.push(fold(`DESCRIPTION:${icsEscape(descParts.join('\n'))}`))

  const location = [ev.location_name, ev.address, ev.city].filter(Boolean).join(', ')
  if (location) lines.push(fold(`LOCATION:${icsEscape(location)}`))

  if (ev.registration_url) lines.push(fold(`URL:${ev.registration_url}`))

  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export async function GET(_req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const today = new Date().toISOString().split('T')[0]
  const cap   = new Date(Date.now() + 180 * 86400 * 1000).toISOString().split('T')[0]

  // Pull rich fields, but fall back to the legacy column set if migration 077 isn't applied.
  // Same explicit-typing pattern as /admin/events/pending — the two selects
  // produce different inferred shapes, so we hold the result in a typed
  // local instead of letting TS infer from the first query.
  const richCols = 'id, slug, title, description, start_date, end_date, start_time, end_time, location_name, address, city, registration_url, organizer_name, is_free, cost_text'
  const baseCols = 'id, slug, title, description, start_date, end_date, start_time, end_time, location_name, address, city, is_free, cost_text'

  let events: PublishedEvent[] | null = null
  let error: { message: string } | null = null

  const rich = await supabase
    .from('calendar_events')
    .select(richCols)
    .eq('status', 'published')
    .gte('start_date', today)
    .lte('start_date', cap)
    .order('start_date', { ascending: true })
  events = (rich.data ?? null) as PublishedEvent[] | null
  error  = rich.error

  if (error && /column .* does not exist/i.test(error.message)) {
    const base = await supabase
      .from('calendar_events')
      .select(baseCols)
      .eq('status', 'published')
      .gte('start_date', today)
      .lte('start_date', cap)
      .order('start_date', { ascending: true })
    events = (base.data ?? null) as PublishedEvent[] | null
    error  = base.error
  }

  if (error) return new NextResponse('Calendar feed unavailable', { status: 500 })

  // Compatibility shim: feed loop expects a non-null array
  const evts = events ?? []

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//River Region Parents//Family Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:River Region Parents — Family Calendar`,
    `X-WR-CALDESC:Family-friendly events curated by River Region Parents`,
    `X-WR-TIMEZONE:${TZID}`,
  ]
  for (const ev of evts) lines.push(buildVEvent(ev))
  lines.push('END:VCALENDAR')

  const body = lines.join('\r\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="river-region-parents.ics"',
      'Cache-Control':       'public, max-age=900, s-maxage=900',
    },
  })
}
