// Public, unauthenticated read of stops for a market — feeds the
// public Leaflet map at /distribution/[market]/map.
//
// Returns only the fields the public map needs (no contact_phone/email,
// no notes, no driver-internal flags). All stops are returned regardless
// of active flag so deactivated locations don't suddenly vanish from
// the map without an admin understanding why.
//
// GET /api/circulation/public?market=rrp

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime  = 'nodejs'
export const revalidate = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const market = new URL(req.url).searchParams.get('market')?.trim() || 'rrp'

  const client = sb()
  const [routesRes, stopsRes] = await Promise.all([
    client.from('circulation_routes')
      .select('id, name')
      .eq('market', market)
      .eq('active', true),
    client.from('circulation_stops')
      .select('id, route_id, name, address, city, zip, lat, lng, is_advertiser, is_featured, ad_level, website, instagram, facebook, tiktok, logo_path, quantities')
      .eq('market', market)
      .eq('active', true),
  ])

  if (routesRes.error || stopsRes.error) {
    // Empty payload on DB errors — the map will render its "no data" state.
    return NextResponse.json({ routes: [], stops: [] })
  }

  return NextResponse.json({
    routes: routesRes.data ?? [],
    stops:  stopsRes.data ?? [],
  })
}
