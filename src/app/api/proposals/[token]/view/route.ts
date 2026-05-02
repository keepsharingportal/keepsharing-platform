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
    .select('id, viewed_count, viewed_at')
    .eq('token_slug', token)
    .maybeSingle()

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('proposals').update({
    viewed_count: (proposal.viewed_count ?? 0) + 1,
    viewed_at:    proposal.viewed_at ?? new Date().toISOString(),
    status:       'viewed',
  }).eq('token_slug', token)

  return NextResponse.json({ success: true })
}
