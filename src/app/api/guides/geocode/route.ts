import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — return all listings missing lat/lng
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('summer_fun_guide')
      .select('id, slug, business_name, address, city, state, zip, latitude, longitude')
      .or('latitude.is.null,longitude.is.null')
      .order('business_name')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data ?? [])
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — geocode a single listing by address
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 400 })
  }

  try {
    const { id, address, city, state, zip } = await req.json() as {
      id: string; address?: string; city?: string; state?: string; zip?: string
    }

    const query = [address, city, state ?? 'AL', zip].filter(Boolean).join(', ')
    if (!query.trim()) {
      return NextResponse.json({ error: 'No address data to geocode' }, { status: 400 })
    }

    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const geoData = await geoRes.json() as {
      status: string
      results: { geometry: { location: { lat: number; lng: number } } }[]
    }

    if (geoData.status !== 'OK' || !geoData.results[0]) {
      return NextResponse.json({ error: `Geocode failed: ${geoData.status}`, id }, { status: 422 })
    }

    const { lat, lng } = geoData.results[0].geometry.location

    const supabase = await createClient()
    await supabase
      .from('summer_fun_guide')
      .update({ latitude: lat, longitude: lng, last_verified: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ id, lat, lng })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
