import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}

// POST /api/admin/partners/start-onboarding
// Body: { partnerId: string }
// Requires admin auth (checked via bearer token matching ADMIN_SECRET env var)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { partnerId } = await req.json()
    if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // Generate or retrieve token
    const { data: account } = await supabase.from('advertiser_accounts').select('id, contact_email, contact_name, business_name, onboarding_token, slug').eq('id', partnerId).maybeSingle()
    if (!account) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

    let token = account.onboarding_token
    if (!token) {
      token = randomUUID()
      await supabase.from('advertiser_accounts').update({ onboarding_token: token, onboarding_status: 'not-started' }).eq('id', partnerId)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
    const onboardingUrl = `${siteUrl}/onboard/${token}`

    // TODO: send email when GHL email is configured
    // For now, return the URL for Jason to send manually
    console.log(`[start-onboarding] Token generated for ${account.business_name}: ${onboardingUrl}`)

    return NextResponse.json({
      success: true,
      onboardingUrl,
      token,
      contactEmail: account.contact_email,
    })
  } catch (e) {
    console.error('[start-onboarding]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
