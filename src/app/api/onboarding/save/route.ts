import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}

export async function POST(req: NextRequest) {
  try {
    const { token, accountId, progress } = await req.json()
    if (!token || !accountId) return NextResponse.json({ error: 'token + accountId required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Verify token matches account
    const { data: account } = await supabase.from('advertiser_accounts').select('id').eq('id', accountId).eq('onboarding_token', token).maybeSingle()
    if (!account) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

    await supabase.from('advertiser_accounts').update({
      onboarding_progress: progress,
      onboarding_status: 'in-progress',
      onboarding_started_at: new Date().toISOString(),
    }).eq('id', accountId)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[onboarding/save]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
