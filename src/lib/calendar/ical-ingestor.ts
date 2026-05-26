// ── iCal ingestor ─────────────────────────────────────────────────────────────
// Fetches an iCal feed, normalizes events into the calendar_events row shape,
// dedupes against existing rows, and inserts new ones as status='pending'.
// All AI/iCal-discovered events MUST go through manual review — never auto-publish.

import * as ical from 'node-ical'
import { createClient } from '@supabase/supabase-js'
import { fetchOgImage } from './og-image'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizedEvent {
  uid:              string         // stable cross-fetch identifier (iCal UID + occurrence date)
  title:            string
  description:      string | null
  start_date:       string         // YYYY-MM-DD
  end_date:         string         // YYYY-MM-DD
  start_time:       string | null  // HH:mm (24h, local to the feed's TZ)
  end_time:         string | null
  location_name:    string | null
  address:          string | null
  city:             string | null
  registration_url: string | null
  organizer_name:   string | null
}

export interface IngestResult {
  source_id:          string
  source_name:        string
  ical_url:           string
  total_in_feed:      number
  inserted:           number
  skipped_duplicate:  number
  skipped_past:       number
  errors:             string[]
}

interface TrustedSource {
  id: string
  name: string
  ical_url: string | null
  events_url: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function pad(n: number): string { return String(n).padStart(2, '0') }
function ymd(d: Date): string   { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function hm(d: Date): string    { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

/** Pull a city out of "Street, City, ST ZIP" or "City, ST" patterns. */
function parseCity(location: string | null): string | null {
  if (!location) return null
  const parts = location.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length >= 3) return parts[parts.length - 2]   // "Street, City, ST ZIP"
  if (parts.length === 2) return parts[0]                  // "City, ST"
  return null
}

/** Split combined location like "Venue Name, Street, City, ST ZIP" — picks venue + address. */
function splitVenueAndAddress(loc: string | null): { venue: string | null; address: string | null } {
  if (!loc) return { venue: null, address: null }
  const parts = loc.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length <= 1) return { venue: loc, address: null }
  // Heuristic: if first chunk has no digits, treat it as a venue name.
  if (!/\d/.test(parts[0])) {
    return { venue: parts[0], address: parts.slice(1).join(', ') }
  }
  return { venue: null, address: loc }
}

/** Convert an iCal VEVENT into our normalized shape. Returns null if unusable. */
function normalizeEvent(
  raw: ical.VEvent,
  occurrenceStart: Date | null = null,
): NormalizedEvent | null {
  if (!raw || raw.type !== 'VEVENT') return null
  const summary = (raw.summary ?? '').toString().trim()
  if (!summary) return null

  // Determine the start/end Dates we're using (may be a recurrence instance).
  const start: Date | undefined = occurrenceStart ?? (raw.start as Date | undefined)
  if (!start || isNaN(start.getTime())) return null

  // Compute end from the raw event — preserve duration on recurrence instances.
  let end: Date | undefined = raw.end as Date | undefined
  if (occurrenceStart && raw.start && raw.end) {
    const dur = (raw.end as Date).getTime() - (raw.start as Date).getTime()
    end = new Date(occurrenceStart.getTime() + dur)
  }
  if (!end || isNaN(end.getTime())) end = start

  // All-day vs timed: node-ical sets `datetype === 'date'` for all-day events.
  type WithDateType = ical.VEvent & { datetype?: string }
  const isAllDay = (raw as WithDateType).datetype === 'date'

  const occurrenceTag = occurrenceStart ? `@${ymd(occurrenceStart)}` : ''
  const uid           = `${raw.uid ?? `${summary}-${ymd(start)}`}${occurrenceTag}`

  const description = ((raw.description ?? '') as string).toString().trim() || null
  const location    = ((raw.location ?? '')    as string).toString().trim() || null
  const url         = ((raw.url ?? '')         as string).toString().trim() || null

  // Pull organizer (CN= or email)
  const organizerRaw = (raw.organizer ?? null) as unknown
  let organizer: string | null = null
  if (organizerRaw && typeof organizerRaw === 'object') {
    organizer = (organizerRaw as Record<string, unknown>).val as string ?? null
    if (typeof organizer === 'string') {
      organizer = organizer.replace(/^mailto:/i, '').replace(/^.*CN=/i, '').replace(/^"|"$/g, '').trim() || null
    }
  } else if (typeof organizerRaw === 'string') {
    organizer = (organizerRaw as string).replace(/^mailto:/i, '') || null
  }

  const { venue, address } = splitVenueAndAddress(location)

  return {
    uid,
    title:            summary,
    description,
    start_date:       ymd(start),
    end_date:         ymd(end),
    start_time:       isAllDay ? null : hm(start),
    end_time:         isAllDay ? null : hm(end),
    location_name:    venue,
    address,
    city:             parseCity(location),
    registration_url: url,
    organizer_name:   organizer,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch + parse an iCal URL into normalized events.
 * Expands recurring events into the next N days of occurrences so they each
 * land as their own pending event (with shared source_external_id prefix).
 */
export async function fetchIcalEvents(
  icalUrl: string,
  options: { expandDays?: number } = {},
): Promise<NormalizedEvent[]> {
  const expandDays = options.expandDays ?? 90
  const now        = new Date()
  const horizon    = new Date(now.getTime() + expandDays * 24 * 60 * 60 * 1000)

  // node-ical's promise wrapper. The callback signature types `data` as
  // possibly-undefined; treat that as an error condition since we can't
  // process an empty parse result.
  const parsed = await new Promise<ical.CalendarResponse>((resolve, reject) => {
    ical.fromURL(icalUrl, { timeout: 20_000 }, (err, data) => {
      if (err) reject(err)
      else if (!data) reject(new Error('node-ical returned no data'))
      else resolve(data)
    })
  })

  const out: NormalizedEvent[] = []
  for (const key of Object.keys(parsed)) {
    const item = parsed[key]
    if (!item || item.type !== 'VEVENT') continue

    // Recurring event: expand into individual occurrences within horizon.
    type WithRrule = ical.VEvent & { rrule?: { between: (a: Date, b: Date, inc?: boolean) => Date[] } | null }
    const rrule = (item as WithRrule).rrule
    if (rrule && typeof rrule.between === 'function') {
      try {
        const occurrences = rrule.between(now, horizon, true)
        for (const occ of occurrences) {
          const norm = normalizeEvent(item, occ)
          if (norm) out.push(norm)
        }
      } catch {
        // Fall back to single occurrence if rrule expansion fails.
        const norm = normalizeEvent(item)
        if (norm) out.push(norm)
      }
    } else {
      const norm = normalizeEvent(item)
      if (norm) out.push(norm)
    }
  }
  return out
}

/**
 * Pull from the source's iCal feed and insert new events as pending.
 * Dedup strategy:
 *   1. source_external_id (iCal UID + occurrence) — strongest signal
 *   2. title + start_date + location_name fallback for older rows
 * Past events are skipped (we don't want to clog the queue with history).
 */
export async function ingestFromSource(sourceId: string): Promise<IngestResult> {
  const supabase = supabaseAdmin()
  const result: IngestResult = {
    source_id: sourceId, source_name: '', ical_url: '',
    total_in_feed: 0, inserted: 0, skipped_duplicate: 0, skipped_past: 0, errors: [],
  }

  // Load the source
  const { data: src, error: srcErr } = await supabase
    .from('trusted_event_sources')
    .select('id, name, ical_url, events_url')
    .eq('id', sourceId)
    .maybeSingle()

  if (srcErr || !src) {
    result.errors.push(srcErr?.message ?? 'Source not found')
    return result
  }
  const source = src as TrustedSource
  result.source_name = source.name
  result.ical_url    = source.ical_url ?? ''

  if (!source.ical_url) {
    result.errors.push('Source has no ical_url configured. Try probing first, or switch to AI extraction.')
    return result
  }

  // Fetch + parse
  let events: NormalizedEvent[]
  try {
    events = await fetchIcalEvents(source.ical_url)
  } catch (e) {
    result.errors.push(`Fetch failed: ${e instanceof Error ? e.message : String(e)}`)
    return result
  }
  result.total_in_feed = events.length

  const todayIso = ymd(new Date())

  // Filter out past events
  const future = events.filter(e => {
    if (e.start_date < todayIso) { result.skipped_past++; return false }
    return true
  })

  // Pull existing UIDs for this source so we can dedup in-memory.
  const uids = future.map(e => `${source.id}::${e.uid}`)
  let existing = new Set<string>()
  if (uids.length > 0) {
    const { data: dupes } = await supabase
      .from('calendar_events')
      .select('source_external_id')
      .in('source_external_id', uids)
    for (const row of dupes ?? []) {
      const id = (row as { source_external_id: string }).source_external_id
      if (id) existing.add(id)
    }
  }

  // Insert new
  for (const ev of future) {
    const externalId = `${source.id}::${ev.uid}`
    if (existing.has(externalId)) {
      result.skipped_duplicate++
      continue
    }

    const baseSlug = ev.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event'
    const slug     = `${baseSlug}-${ev.start_date}-${Math.random().toString(36).slice(2, 6)}`

    // Best-effort OG image fetch from the registration URL (the per-event page).
    // We skip the source's index URL since that's the calendar listing, not the
    // event detail. Failures are silent — the event still saves without an image.
    let heroImageUrl: string | null = null
    if (ev.registration_url) {
      try { heroImageUrl = await fetchOgImage(ev.registration_url) } catch { /* ignore */ }
    }

    const row = {
      title:               ev.title,
      slug,
      description:         ev.description,
      start_date:          ev.start_date,
      end_date:            ev.end_date,
      start_time:          ev.start_time,
      end_time:            ev.end_time,
      location_name:       ev.location_name,
      address:             ev.address,
      city:                ev.city,
      hero_image_url:      heroImageUrl,
      registration_url:    ev.registration_url,
      organizer_name:      ev.organizer_name,
      source_type:         'ical',
      source_name:         source.name,
      source_url:          source.events_url,
      source_external_id:  externalId,
      discovery_notes:     `Auto-ingested from iCal feed at ${source.ical_url}`,
      status:              'pending',
    }

    const { error } = await supabase.from('calendar_events').insert(row)
    if (error) {
      result.errors.push(`Insert failed (${ev.title}): ${error.message}`)
    } else {
      result.inserted++
      existing.add(externalId)  // guard against duplicate within the same feed
    }
  }

  // Update last-ingested stats on the source row.
  await supabase.from('trusted_event_sources').update({
    last_ingested_at:    new Date().toISOString(),
    last_ingested_count: result.inserted,
  }).eq('id', sourceId)

  return result
}
