import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = supabaseAdmin()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, business_name, contact_email, status')
    .eq('token_slug', token)
    .maybeSingle()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (proposal.status === 'accepted') return NextResponse.json({ success: true, alreadyAccepted: true })

  await supabase.from('proposals').update({
    status:      'accepted',
    accepted_at: new Date().toISOString(),
  }).eq('token_slug', token)

  // Log to console (GHL notification can be wired via workflow trigger)
  console.log(`[proposal accepted] ${proposal.business_name} — ${proposal.contact_email ?? 'no email'}`)

  return NextResponse.json({ success: true })
}
