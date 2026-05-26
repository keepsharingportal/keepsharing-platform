// GET /api/school-bits/by-school?school_id=...&limit=4  (PUBLIC)
//
// Returns the latest approved/published bits for a specific school. Used by
// the YourSchoolBitsWidget on the School Zone page (personalized to the
// reader's remembered school).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const schoolId = searchParams.get('school_id')?.trim()
  const limit    = Math.max(1, Math.min(12, Number(searchParams.get('limit')) || 4))

  if (!schoolId) {
    return NextResponse.json({ error: 'school_id is required' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  // Time gate: don't surface bits whose published_at is still in the future
  // (drip-scheduled bits stay hidden until their moment arrives).
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('school_bits')
    .select('id, title, blurb, image_web_url, published_at, created_at')
    .eq('market', MARKET)
    .eq('school_id', schoolId)
    .in('status', ['approved', 'published'])
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at',   { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ bits: [], error: error.message }, { status: 500 })
  return NextResponse.json({ bits: data ?? [] })
}
