// /api/circulation/driver/me
// Resolves the signed-in user's driver row (market + name). Used by the
// distribution login page to send them to their own market portal after
// sign-in when no ?next= was passed.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ market: null }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('circulation_drivers')
    .select('user_id, market, full_name, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!data) return NextResponse.json({ market: null })
  return NextResponse.json({ market: data.market, full_name: data.full_name })
}
