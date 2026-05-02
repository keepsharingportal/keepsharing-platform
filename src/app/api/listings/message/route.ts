import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const required = ['advertiser_account_id', 'parent_name', 'parent_email', 'message']
  for (const f of required) {
    if (!body[f]) return NextResponse.json({ error: `${f} required` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase.from('listing_messages').insert({
    advertiser_account_id: body.advertiser_account_id,
    guide_type_slug:       body.guide_type_slug ?? null,
    parent_name:           body.parent_name,
    parent_email:          body.parent_email,
    parent_phone:          body.parent_phone ?? null,
    message:               body.message,
    source_url:            body.source_url ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
