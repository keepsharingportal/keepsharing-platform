import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}

export async function POST(req: NextRequest) {
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user || user.email !== 'jade31994@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { accountId } = await req.json()
  const supabase = supabaseAdmin()

  await supabase.from('advertiser_accounts').update({
    onboarding_status: 'live',
    published_at: new Date().toISOString(),
    landing_page_published: true,
  }).eq('id', accountId)

  return NextResponse.json({ success: true })
}
