import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}

export async function POST(req: NextRequest) {
  try {
    const { token, accountId, data } = await req.json()
    if (!token || !accountId) return NextResponse.json({ error: 'token + accountId required' }, { status: 400 })

    const supabase = supabaseAdmin()

    const { data: account } = await supabase.from('advertiser_accounts').select('id, slug, contact_name, business_name').eq('id', accountId).eq('onboarding_token', token).maybeSingle()
    if (!account) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

    // Update account status
    await supabase.from('advertiser_accounts').update({
      onboarding_status: 'submitted',
      onboarding_submitted_at: new Date().toISOString(),
      onboarding_progress: data,
      business_url: data.basics?.businessUrl ?? undefined,
      contact_name: data.basics?.contactName ?? undefined,
      contact_phone: data.basics?.contactPhone ?? undefined,
      contact_email: data.basics?.contactEmail ?? undefined,
      brand_color_primary: data.brandPrimary ?? undefined,
      brand_color_accent: data.brandAccent ?? undefined,
    }).eq('id', accountId)

    // TODO: send email to Jason when GHL email is configured
    console.log(`[onboarding/submit] ${account.business_name} (${account.slug}) completed onboarding. Review at /admin/partners/${account.slug}/review`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[onboarding/submit]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
