// POST /api/public/onboarding/[token]/submit
//
// Public "Submit for review" — flips advertiser_accounts.onboarding_status
// to 'submitted'. The admin queue surfaces submitted self-signups so
// the editor reviews + publishes them.
//
// Does NOT auto-publish guide_listings for free-tier self-signups
// (admin moderates first). Featured-tier signups arrive
// pre-published from the Stripe webhook.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface RouteParams { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params
  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token format.' }, { status: 400 })
  }

  const supabase = sb()
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('id, onboarding_token_expires_at, business_name, contact_email')
    .eq('onboarding_token', token)
    .maybeSingle()

  if (!acct) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 403 })
  if (acct.onboarding_token_expires_at) {
    const expires = new Date(acct.onboarding_token_expires_at as string)
    if (expires.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This link has expired.' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('advertiser_accounts')
    .update({ onboarding_status: 'submitted' })
    .eq('id', acct.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
