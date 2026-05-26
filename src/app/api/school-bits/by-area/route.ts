// GET /api/school-bits/by-area?area=montgomery&limit=4   (PUBLIC)
//
// Returns the latest approved+published bits scoped to a specific area
// (montgomery / autauga / elmore / pike-road), OR — if area=private —
// scoped to all private schools across every area.
//
// Used by the SchoolBitsDiscoveryPanel on /school-zone: when a visitor
// taps an area chip, this fires to populate the inline preview cards.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidArea } from '@/lib/school-news/areas'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const MARKET = 'rrp'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const area  = searchParams.get('area')?.trim() ?? ''
  const limit = Math.max(1, Math.min(12, Number(searchParams.get('limit')) || 4))

  const supabase = supabaseAdmin()

  // First: resolve which schools match the area filter. Cheap query (small N).
  let schoolQuery = supabase
    .from('schools')
    .select('id')
    .eq('market', MARKET)
    .eq('status', 'active')

  if (area === 'private') {
    schoolQuery = schoolQuery.eq('is_private', true)
  } else if (isValidArea(area)) {
    schoolQuery = schoolQuery.eq('area', area)
  } else {
    return NextResponse.json({ error: 'area must be one of: montgomery, autauga, elmore, pike-road, private' }, { status: 400 })
  }

  const { data: schoolRows, error: schoolErr } = await schoolQuery
  if (schoolErr) return NextResponse.json({ error: schoolErr.message }, { status: 500 })

  const schoolIds = (schoolRows ?? []).map(s => (s as { id: string }).id)
  if (schoolIds.length === 0) {
    return NextResponse.json({ bits: [] })
  }

  // Then: pull bits filtered by those school IDs + time-gated to "live now"
  const nowIso = new Date().toISOString()
  const { data: bits, error: bitsErr } = await supabase
    .from('school_bits')
    .select('id, school_id, school_name, title, blurb, image_web_url, published_at, created_at')
    .eq('market', MARKET)
    .in('school_id', schoolIds)
    .in('status', ['approved', 'published'])
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at',   { ascending: false })
    .limit(limit)

  if (bitsErr) return NextResponse.json({ error: bitsErr.message }, { status: 500 })
  return NextResponse.json({ bits: bits ?? [] })
}
