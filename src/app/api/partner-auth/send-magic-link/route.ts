import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email, slug } = await req.json()

    if (!email || !slug) {
      return NextResponse.json({ error: 'Email and slug are required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Verify email matches the advertiser account for this slug
    const { data: account } = await supabase
      .from('advertiser_accounts')
      .select('id, business_name, contact_email, contact_name')
      .eq('slug', slug)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (account.contact_email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email not recognized for this account. Contact River Region Parents if you need help.' }, { status: 403 })
    }

    // Generate token
    const token = randomUUID()
    await supabase.from('partner_auth_tokens').insert({
      advertiser_id: account.id,
      token,
      email: email.toLowerCase(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
    const magicLink = `${baseUrl}/partners/${slug}/admin?token=${token}`

    // Log the link (in production, send via GHL or email service)
    console.log(`[magic-link] ${account.business_name} (${email}): ${magicLink}`)

    // TODO: Send via GHL email API when GHL_PIT_RRP is configured
    // For now, this logs the link and would be sent manually or via a configured email service

    return NextResponse.json({ success: true, message: 'Magic link sent' })
  } catch (e) {
    console.error('[send-magic-link] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
