// GET /api/distribution/geocode-zip?zip=12345
// Public endpoint — readers' map ZIP search hits this. Returns lat/lng
// for the ZIP centroid via the server-side Google Geocoding key (which
// is unrestricted to particular referrers, unlike the client key).
//
// Cached server-side (revalidate 1 day) since ZIP centroids don't move.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')?.trim() ?? ''
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'invalid zip' }, { status: 400 })

  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) {
    return NextResponse.json({ ok: false, message: 'geocoding not configured' }, { status: 200 })
  }
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?key=${key}&components=country:US|postal_code:${zip}`,
      { next: { revalidate: 86400 } },
    )
    const j = await r.json() as { status: string; results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> }
    const loc = j.results?.[0]?.geometry?.location
    if (j.status !== 'OK' || !loc) return NextResponse.json({ ok: false, message: 'zip not found' }, { status: 200 })
    return NextResponse.json({ ok: true, lat: loc.lat, lng: loc.lng, zip })
  } catch {
    return NextResponse.json({ ok: false, message: 'geocoding error' }, { status: 200 })
  }
}
