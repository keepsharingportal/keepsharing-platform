import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const { leadId, action } = await req.json()
    if (!leadId || !['contacted', 'converted'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const now = new Date().toISOString()

    const update: Record<string, unknown> = {}
    if (action === 'contacted') {
      update.partner_last_action_at = now
      update.status = 'contacted'
    } else {
      update.partner_marked_converted = true
      update.partner_marked_converted_at = now
      update.partner_last_action_at = now
      update.status = 'converted'
    }

    await supabase.from('partner_leads').update(update).eq('id', leadId)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[partner-leads/update] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
