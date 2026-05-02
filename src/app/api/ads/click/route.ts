import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { ad_id } = await req.json()
  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await supabase.rpc('increment_ad_click', { p_ad_id: ad_id })
  return NextResponse.json({ ok: true })
}
