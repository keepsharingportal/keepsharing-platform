// POST /api/admin/circulation/import
//
// Idempotent loader for the standalone PHP portal's stop export JSON.
// Pass either:
//   { url: "https://..." }                  — fetch from a remote URL
//   { stops: [ {...}, {...} ] }             — inline JSON array
//   multipart/form-data with file=stops.json — direct upload
//
// On every run:
//   - Each unique `route` string becomes (or matches) a circulation_routes row
//   - Each stop is upserted by (market, route_id, sort_order, name) so re-running
//     with a fresher export updates rather than duplicates
//   - Per-publication quantities (rrp, boom, ...) collapse into the quantities JSONB
//
// Returns a small summary: { routesUpserted, stopsUpserted, geocoded, skipped }.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface RawStop {
  route?:        string
  name?:         string
  address?:      string
  city?:         string
  zip?:          string
  sort_order?:   number
  notes?:        string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  website?:      string
  instagram?:    string
  facebook?:     string
  tiktok?:       string
  ad_level?:     string
  is_advertiser?: boolean
  is_featured?:  boolean
  is_pickup?:    boolean
  not_delivering?: boolean
  not_delivering_note?: string
  active?:       boolean
  lat?:          number | null
  lng?:          number | null
  // Per-publication quantities — keys vary by pub (rrp, boom, aop, etc.)
  [pubKey: string]: unknown
}

const KNOWN_NON_QTY_KEYS = new Set([
  'route','name','address','city','zip','sort_order','notes',
  'contact_name','contact_phone','contact_email','website','instagram',
  'facebook','tiktok','ad_level','is_advertiser','is_featured','is_pickup',
  'not_delivering','not_delivering_note','active','lat','lng','logo_path',
])

// The PHP exporter has produced slightly different shapes over time:
//   - Plain array: [ { route, name, ... }, ... ]
//   - Wrapper:     { stops: [...] }   or   { data: [...] }   or   { rows: [...] }
// We accept all of them and unwrap to a plain RawStop[].
function normalizeStopsPayload(parsed: unknown): RawStop[] {
  if (Array.isArray(parsed)) return parsed as RawStop[]
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    for (const key of ['stops', 'data', 'rows', 'records', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as RawStop[]
    }
  }
  return []
}

function extractQuantities(raw: RawStop): Record<string, number> {
  const q: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (KNOWN_NON_QTY_KEYS.has(k)) continue
    if (typeof v === 'number' && v > 0) q[k.toLowerCase()] = v
  }
  return q
}

export async function POST(req: NextRequest) {
  await requireAdmin()

  // Accept any of three input modes (URL, JSON body, multipart upload).
  // The PHP portal's export format has varied across versions — some give
  // a bare array, some wrap it in { stops: [...] } or { data: [...] } —
  // so we normalize whatever comes in to a plain array of RawStop.
  let stops: RawStop[] = []
  let market = 'rrp'
  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      market = (form.get('market') as string | null) ?? 'rrp'
      const file = form.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
      const text = await file.text()
      stops = normalizeStopsPayload(JSON.parse(text))
    } else {
      const body = await req.json() as { stops?: RawStop[]; url?: string; market?: string }
      market = body.market?.trim() || 'rrp'
      if (body.url) {
        const r = await fetch(body.url)
        if (!r.ok) return NextResponse.json({ error: `Fetch failed: ${r.status}` }, { status: 400 })
        stops = normalizeStopsPayload(await r.json())
      } else if (Array.isArray(body.stops)) {
        stops = body.stops
      } else {
        return NextResponse.json({ error: 'Provide url, stops[], or file' }, { status: 400 })
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bad input' }, { status: 400 })
  }

  if (!Array.isArray(stops) || stops.length === 0) {
    return NextResponse.json({
      error: 'No stops found in the file. Expected a JSON array of stops, or an object with a "stops" / "data" / "rows" key holding the array.',
    }, { status: 400 })
  }

  const sb = supabaseAdmin()

  // ── Routes: dedupe by name within this market, upsert if missing ───────
  const routeNames = Array.from(new Set(stops.map(s => (s.route ?? '').trim()).filter(Boolean)))
  const routeIdByName = new Map<string, string>()

  // Pull existing routes for this market in one query.
  const { data: existing, error: rErr } = await sb
    .from('circulation_routes')
    .select('id, name')
    .eq('market', market)
  if (rErr) return NextResponse.json({ error: `Routes lookup failed: ${rErr.message}` }, { status: 500 })
  for (const r of existing ?? []) routeIdByName.set(r.name, r.id as string)

  // Insert any routes we don't have yet.
  let routesUpserted = 0
  for (const name of routeNames) {
    if (routeIdByName.has(name)) continue
    const { data: ins, error: insErr } = await sb
      .from('circulation_routes')
      .insert({ market, name, sort_order: routesUpserted })
      .select('id')
      .single()
    if (insErr) return NextResponse.json({ error: `Route create failed: ${insErr.message}` }, { status: 500 })
    routeIdByName.set(name, ins.id as string)
    routesUpserted++
  }

  // ── Stops: build payload, then bulk upsert ────────────────────────────
  let geocoded = 0
  let skipped  = 0
  const stopRows = stops.map((raw, idx) => {
    const routeName = (raw.route ?? '').trim()
    const routeId   = routeIdByName.get(routeName)
    if (!routeId) { skipped++; return null }
    const name = (raw.name ?? '').trim()
    if (!name) { skipped++; return null }
    if (raw.lat && raw.lng) geocoded++
    return {
      market,
      route_id:            routeId,
      sort_order:          raw.sort_order ?? idx,
      name,
      address:             raw.address ?? null,
      city:                raw.city ?? null,
      zip:                 raw.zip ?? null,
      notes:               raw.notes ?? null,
      contact_name:        raw.contact_name ?? null,
      contact_phone:       raw.contact_phone ?? null,
      contact_email:       raw.contact_email ?? null,
      is_pickup:           !!raw.is_pickup,
      is_advertiser:       !!raw.is_advertiser,
      is_featured:         !!raw.is_featured,
      ad_level:            raw.ad_level ?? '',
      website:             raw.website ?? null,
      instagram:           raw.instagram ?? null,
      facebook:            raw.facebook ?? null,
      tiktok:              raw.tiktok ?? null,
      lat:                 typeof raw.lat === 'number' ? raw.lat : null,
      lng:                 typeof raw.lng === 'number' ? raw.lng : null,
      active:              raw.active !== false,
      not_delivering:      !!raw.not_delivering,
      not_delivering_note: raw.not_delivering_note ?? null,
      quantities:          extractQuantities(raw),
    }
  }).filter(Boolean) as Array<Record<string, unknown>>

  if (stopRows.length === 0) {
    return NextResponse.json({ error: 'All stops invalid (missing route or name)' }, { status: 400 })
  }

  // Idempotency: wipe existing stops for this market before re-inserting.
  // The export is the source of truth on each run; partial-merge gets
  // confusing fast when stops get renamed.
  const { error: delErr } = await sb
    .from('circulation_stops')
    .delete()
    .eq('market', market)
  if (delErr) return NextResponse.json({ error: `Stop clear failed: ${delErr.message}` }, { status: 500 })

  // Chunk inserts to stay under Supabase row limits.
  const CHUNK = 500
  let stopsUpserted = 0
  for (let i = 0; i < stopRows.length; i += CHUNK) {
    const slice = stopRows.slice(i, i + CHUNK)
    const { error: insErr } = await sb.from('circulation_stops').insert(slice)
    if (insErr) return NextResponse.json({ error: `Stop insert failed at row ${i}: ${insErr.message}` }, { status: 500 })
    stopsUpserted += slice.length
  }

  return NextResponse.json({
    market,
    routesUpserted,
    stopsUpserted,
    geocoded,
    skipped,
  })
}
