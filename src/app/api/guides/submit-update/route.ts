import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, businessName, contactName, phone, email, website, address, description, noChanges } = body

  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  try {
    const supabase = await createClient()

    // Look up the guide listing by token
    const { data: listing } = await supabase
      .from('guide_listings')
      .select('id, business_name')
      .eq('update_token', token)
      .single()

    if (listing) {
      const changes = noChanges ? null : { businessName, contactName, phone, email, website, address, description }
      await supabase.from('guide_listings').update({
        update_status:    noChanges ? 'updated' : 'responded',
        pending_changes:  changes,
        last_verified:    noChanges ? new Date().toISOString().slice(0,10) : null,
        responded_at:     new Date().toISOString(),
      }).eq('update_token', token)

      // Notify VA
      if (!noChanges) {
        await supabase.from('notifications').insert({
          type:    'guide_update_received',
          title:   `Guide update received — ${businessName}`,
          body:    `Business submitted listing changes — review pending`,
          urgency: 'review',
          publication: 'RRP',
          metadata: { token, businessName },
        })
      }
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true })
}
