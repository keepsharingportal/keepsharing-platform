// GET  /api/admin/school-news/schools                — list (filter by area/status)
// POST /api/admin/school-news/schools                — create a school

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isValidArea, isValidGradeBand } from '@/lib/school-news/areas'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const MARKET = 'rrp'  // hardcoded for now; per-market routing comes when we add sister magazines

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const supabase = supabaseAdmin()

  let q = supabase
    .from('schools')
    .select('id, name, area, is_private, district, grade_band, contact_email, facebook_url, city, address, status, created_at')
    .eq('market', MARKET)
    .order('name', { ascending: true })

  const area   = searchParams.get('area')
  const status = searchParams.get('status') ?? 'active'
  if (area && isValidArea(area)) q = q.eq('area', area)
  if (status !== 'all')          q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schools: data ?? [] })
}

interface CreateBody {
  name?:          string
  area?:          string
  is_private?:    boolean
  district?:      string
  grade_band?:    string
  contact_email?: string
  facebook_url?:  string
  city?:          string
  address?:       string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as CreateBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!isValidArea(body.area)) {
    return NextResponse.json({ error: 'area must be one of: montgomery, autauga, elmore, pike-road' }, { status: 400 })
  }
  if (body.grade_band && !isValidGradeBand(body.grade_band)) {
    return NextResponse.json({ error: 'grade_band must be one of: elementary, middle, high, k12, other' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('schools')
    .insert({
      market:        MARKET,
      name,
      area:          body.area,
      is_private:    body.is_private === true,
      district:      body.district?.trim()      || null,
      grade_band:    body.grade_band?.trim()    || null,
      contact_email: body.contact_email?.trim() || null,
      facebook_url:  body.facebook_url?.trim()  || null,
      city:          body.city?.trim()          || null,
      address:       body.address?.trim()       || null,
    })
    .select('id, name, area, is_private')
    .single()

  if (error) {
    // Friendly duplicate-name error
    if (error.code === '23505') {
      return NextResponse.json({ error: `A school named "${name}" already exists in this market.` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/school-news/schools')
  revalidatePath('/admin/school-news')
  return NextResponse.json({ school: data })
}
