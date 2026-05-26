// GET /api/school-bits/recent?limit=4  (PUBLIC)
//
// Returns the latest approved+published bits across ALL schools and areas.
// Powers the discovery panel's default state — when a visitor arrives with
// no localStorage pick, the panel shows real content immediately instead of
// an empty form.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'  // freshness > caching for low-volume content feeds

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const MARKET = 'rrp'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.max(1, Math.min(12, Number(searchParams.get('limit')) || 4))

  const supabase = supabaseAdmin()
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('school_bits')
    .select('id, school_id, school_name, title, blurb, image_web_url, published_at, created_at')
    .eq('market', MARKET)
    .in('status', ['approved', 'published'])
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at',   { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ bits: [], error: error.message }, { status: 500 })
  return NextResponse.json({ bits: data ?? [] })
}
