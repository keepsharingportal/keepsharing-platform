// Legacy endpoint. New code should POST to /api/track/ad-event with
// event_type='click'. Kept here for backwards compatibility.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body  = await req.json().catch(() => ({})) as Record<string, unknown>
  const ad_id = (body.ad_id ?? body.ad_placement_id) as string | undefined
  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await supabase.rpc('record_ad_event', {
    p_ad_placement_id: ad_id,
    p_event_type:      'click',
    p_session_id:      (body.session_id as string) ?? null,
    p_source_page:     null,
    p_referrer_host:   null,
    p_utm_source:      null,
    p_utm_medium:      null,
    p_utm_campaign:    null,
  })
  return NextResponse.json({ ok: true })
}
