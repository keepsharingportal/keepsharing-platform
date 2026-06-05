// Public unauthenticated endpoint — accepts location-request submissions
// from the /distribution/[market]/request public form.
//
// Light spam protection: requires a populated honeypot to fail. Server-side
// rate limit is left to Supabase's connection throttling; if we get spammed
// we can layer on IP-bucket rate limiting easily here.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALL_MARKET_SLUGS } from '@/lib/markets'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface Body {
  market?:        string
  business_name?: string
  address?:       string
  contact_name?:  string
  contact_phone?: string
  contact_email?: string
  publications?:  string  // comma-sep short names
  notes?:         string
  /** Honeypot — must be empty. Bots fill all fields. */
  website?:       string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  // Honeypot: any value here means a bot. Pretend success but don't write.
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const market = body.market?.trim() ?? ''
  if (!ALL_MARKET_SLUGS.includes(market)) {
    return NextResponse.json({ error: 'Unknown market' }, { status: 400 })
  }
  if (!body.business_name?.trim()) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  const { error } = await sb()
    .from('circulation_location_requests')
    .insert({
      market,
      business_name: body.business_name.trim(),
      address:       body.address?.trim()       || null,
      contact_name:  body.contact_name?.trim()  || null,
      contact_phone: body.contact_phone?.trim() || null,
      contact_email: body.contact_email?.trim() || null,
      publications:  body.publications?.trim()  || null,
      notes:         body.notes?.trim()         || null,
      status:        'pending',
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
