// ── iCal feed auto-detector ───────────────────────────────────────────────────
// Given an events-page URL, try to find a public iCal feed for it. Looks for
// common patterns from popular calendar platforms (Tribe Events Calendar,
// WordPress.com, Localist, Trumba, LibCal, civic / municipal CMSes, etc.).

export interface ProbeResult {
  events_url:    string
  found:         boolean
  ical_url:      string | null
  candidates:    string[]            // any plausible URLs we found, ranked
  platform_hint: string | null       // 'tribe' | 'localist' | 'libcal' | 'wp' | etc.
  notes:         string[]            // human-readable explanations
}

// Common URL patterns that frequently expose iCal feeds.
// We test these by HEAD/GET on the response's Content-Type.
const CANDIDATE_SUFFIXES = [
  '/events.ics',
  '/events/?ical=1',     // Tribe Events Calendar (WordPress) — pre-block-editor
  '/events/feed/ical',
  '/feed/eventscalendar', // Tribe
  '/calendar.ics',
  '/ical',
  '/ics',
  '/?ical=1',
  '/calendar/feed.ics',
  '/calendar.ical',
]

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

function isLikelyIcal(text: string): boolean {
  return /^BEGIN:VCALENDAR/m.test(text.trim().slice(0, 1000))
}

async function probeUrl(url: string): Promise<{ ok: boolean; isIcal: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      method:   'GET',
      redirect: 'follow',
      headers:  {
        'Accept':     'text/calendar, text/plain, */*',
        'User-Agent': 'KeepSharing-Calendar-Probe/1.0',
      },
      // node-fetch / undici will follow redirects; default timeout is OK
    })
    if (!res.ok) return { ok: false, isIcal: false, status: res.status }
    const ct  = res.headers.get('content-type') ?? ''
    const txt = await res.text()
    const isIcal = /calendar|ical/i.test(ct) || isLikelyIcal(txt)
    return { ok: true, isIcal, status: res.status }
  } catch {
    return { ok: false, isIcal: false, status: 0 }
  }
}

function detectPlatform(html: string): string | null {
  if (/tribe-events|the-events-calendar|tribe_events/i.test(html)) return 'tribe (WordPress)'
  if (/localist/i.test(html))                                       return 'localist'
  if (/libcal/i.test(html))                                         return 'libcal'
  if (/trumba/i.test(html))                                         return 'trumba'
  if (/CivicPlus|civicplus/i.test(html))                            return 'civicplus'
  if (/wp-content|wordpress/i.test(html))                           return 'wordpress'
  return null
}

/** Look for explicit iCal links inside an HTML page. */
function extractCandidatesFromHtml(html: string, baseUrl: string): string[] {
  const found: string[] = []

  // 1. <link rel="alternate" type="text/calendar" href="...">
  const linkRel = html.matchAll(/<link[^>]+type=["']text\/calendar["'][^>]+href=["']([^"']+)["']/gi)
  for (const m of linkRel) found.push(m[1])

  // 2. Any anchor pointing at a .ics file
  const anchorIcs = html.matchAll(/href=["']([^"']*\.ics(?:[?#][^"']*)?)["']/gi)
  for (const m of anchorIcs) found.push(m[1])

  // 3. Anchors that include 'ical=1' query param (Tribe pattern)
  const tribe = html.matchAll(/href=["']([^"']*[?&]ical=1[^"']*)["']/gi)
  for (const m of tribe) found.push(m[1])

  // Resolve any relative URLs against the source page.
  return uniq(found.map(href => {
    try { return new URL(href, baseUrl).toString() } catch { return href }
  }))
}

/** Try CANDIDATE_SUFFIXES against the source's origin + path. */
function buildPathCandidates(eventsUrl: string): string[] {
  let parsed: URL
  try { parsed = new URL(eventsUrl) } catch { return [] }
  const origin = parsed.origin
  const path   = parsed.pathname.replace(/\/+$/, '')

  const bases: string[] = []
  bases.push(`${origin}${path}`)           // path-relative (e.g. /events)
  bases.push(`${origin}`)                  // origin-relative (e.g. /events.ics on root)
  // If path goes more than one segment deep, try one level up too.
  const segs = path.split('/').filter(Boolean)
  if (segs.length > 1) bases.push(`${origin}/${segs[0]}`)

  return uniq(bases.flatMap(b => CANDIDATE_SUFFIXES.map(suf => `${b}${suf}`)))
}

export async function probeForIcal(eventsUrl: string): Promise<ProbeResult> {
  const result: ProbeResult = {
    events_url:    eventsUrl,
    found:         false,
    ical_url:      null,
    candidates:    [],
    platform_hint: null,
    notes:         [],
  }

  // 1. Fetch the events page and look for explicit iCal links inside it.
  let html = ''
  try {
    const res = await fetch(eventsUrl, {
      method:   'GET',
      redirect: 'follow',
      headers:  {
        'Accept':     'text/html, */*',
        'User-Agent': 'KeepSharing-Calendar-Probe/1.0',
      },
    })
    if (res.ok) {
      html = await res.text()
      result.platform_hint = detectPlatform(html)
      const inline = extractCandidatesFromHtml(html, eventsUrl)
      if (inline.length > 0) {
        result.candidates.push(...inline)
        result.notes.push(`Found ${inline.length} iCal link(s) inside the page HTML.`)
      }
    } else {
      result.notes.push(`Events page returned HTTP ${res.status} — couldn't scan its HTML.`)
    }
  } catch (e) {
    result.notes.push(`Couldn't fetch the events page: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 2. Add common URL-pattern guesses.
  const guesses = buildPathCandidates(eventsUrl)
  for (const g of guesses) {
    if (!result.candidates.includes(g)) result.candidates.push(g)
  }

  // 3. Probe each candidate, return the first one that responds like an iCal.
  for (const url of result.candidates) {
    const probe = await probeUrl(url)
    if (probe.isIcal) {
      result.found    = true
      result.ical_url = url
      result.notes.push(`Confirmed iCal feed at ${url}.`)
      return result
    }
  }

  if (result.candidates.length === 0) {
    result.notes.push('No iCal candidates discovered. This source may need AI extraction or manual entry.')
  } else {
    result.notes.push(`Tried ${result.candidates.length} candidate(s); none returned an iCal-shaped response.`)
  }
  return result
}
