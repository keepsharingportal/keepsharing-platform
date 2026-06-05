// OpenStreetMap (Nominatim) geocoder for stops missing lat/lng.
//
// GET    /api/admin/circulation/geocode?market=rrp&dry=1
//          → list stops missing coords (preview)
// POST   /api/admin/circulation/geocode  body { market, limit?: number }
//          → geocode up to `limit` (default 25) stops via Nominatim,
//            sleeping 1.1s between requests to respect Nominatim's
//            1-request-per-second rate limit. Writes a row to
//            circulation_geocode_runs when done.
//
// We intentionally cap each call at 25 stops so the request can't time
// out on Vercel's 60-second function limit. Admin can keep clicking
// "Geocode next batch" until done.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface Stop { id: string; name: string; address: string | null; city: string | null; zip: string | null }

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'KeepSharingPlatform/1.0 (circulation geocoder)' },
    })
    if (!r.ok) return null
    type Hit = { lat: string; lon: string }
    const arr = (await r.json()) as Hit[]
    if (!arr.length) return null
    const lat = parseFloat(arr[0].lat)
    const lng = parseFloat(arr[0].lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'
  const client = sb()
  const { data: missing } = await client
    .from('circulation_stops')
    .select('id, name, address, city, zip')
    .eq('market', market)
    .eq('active', true)
    .or('lat.is.null,lng.is.null')
    .order('sort_order')
  const { data: total } = await client.from('circulation_stops').select('id', { count: 'exact', head: true }).eq('market', market).eq('active', true)
  void total

  // Last few runs for history
  const { data: history } = await client
    .from('circulation_geocode_runs')
    .select('id, provider, stops_total, stops_success, stops_failed, started_at, finished_at, error')
    .eq('market', market)
    .order('started_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    missing: missing ?? [],
    history: history ?? [],
  })
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json().catch(() => null) as { market?: string; limit?: number } | null
  const market = body?.market?.trim() || 'rrp'
  const limit  = Math.min(25, body?.limit ?? 25)
  const client = sb()

  const { data: missing } = await client
    .from('circulation_stops')
    .select('id, name, address, city, zip')
    .eq('market', market)
    .eq('active', true)
    .or('lat.is.null,lng.is.null')
    .order('sort_order')
    .limit(limit)
  const stops = (missing as Stop[] | null ?? [])

  if (stops.length === 0) {
    return NextResponse.json({ ok: true, geocoded: 0, failed: 0, message: 'Nothing to do — every active stop already has coords.' })
  }

  // Open a run row.
  const { data: run } = await client
    .from('circulation_geocode_runs')
    .insert({ market, provider: 'osm', requested_by: ctx.userId, stops_total: stops.length })
    .select('id')
    .single()
  const runId = (run as { id: string } | null)?.id

  let success = 0
  let failed  = 0
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]
    const query = [s.address, s.city, s.zip].filter(Boolean).join(', ') || s.name
    const hit = await nominatim(query)
    if (hit) {
      await client.from('circulation_stops').update({ lat: hit.lat, lng: hit.lng }).eq('id', s.id)
      success++
    } else {
      failed++
    }
    if (i < stops.length - 1) await new Promise(r => setTimeout(r, 1100))
  }

  if (runId) {
    await client.from('circulation_geocode_runs').update({
      stops_success: success,
      stops_failed:  failed,
      finished_at:   new Date().toISOString(),
    }).eq('id', runId)
  }

  return NextResponse.json({ ok: true, geocoded: success, failed })
}
