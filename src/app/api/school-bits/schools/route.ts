// GET /api/school-bits/schools  (PUBLIC)
//
// Returns the active schools roster for the current market — used by the
// YourSchoolBitsWidget typeahead. Cached at the edge so we're not hitting
// the DB on every homepage hit.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime  = 'nodejs'
export const revalidate = 600  // 10 min

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const MARKET = 'rrp'

export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, area, is_private')
    .eq('market', MARKET)
    .eq('status', 'active')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ schools: [], error: error.message }, { status: 500 })
  return NextResponse.json({ schools: data ?? [] })
}
