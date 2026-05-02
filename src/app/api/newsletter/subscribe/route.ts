import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertContact } from '@/lib/ghl'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, first_name, source, context, ghl_tags } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Upsert subscriber (update tags if already exists)
    const { data: subscriber, error: dbError } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email:           email.toLowerCase().trim(),
        first_name:      first_name ?? null,
        source:          source ?? 'unknown',
        context_data:    context ?? {},
        tags:            ghl_tags ?? ['rrp-main-email'],
        is_subscribed:   true,
        subscribed_at:   new Date().toISOString(),
      }, { onConflict: 'email' })
      .select('id, ghl_contact_id')
      .single()

    if (dbError) {
      console.error('[newsletter/subscribe] DB error:', dbError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // Sync to GHL (fire-and-forget — don't block the response)
    void (async () => {
      try {
        const tags = Array.isArray(ghl_tags) ? ghl_tags : ['rrp-main-email']

        const ghlRes = await upsertContact({
          publicationSlug: 'rrp',
          email:           email.toLowerCase().trim(),
          firstName:       first_name ?? undefined,
          tags,
        })

        if (ghlRes.success && ghlRes.contactId && subscriber?.id) {
          await supabase
            .from('newsletter_subscribers')
            .update({ ghl_contact_id: ghlRes.contactId })
            .eq('id', subscriber.id)
        }
      } catch (ghlErr) {
        // GHL sync failure is non-blocking — subscriber is saved in DB
        console.warn('[newsletter/subscribe] GHL sync failed (non-blocking):', (ghlErr as Error).message)
      }
    })()

    return NextResponse.json({ success: true, subscriberId: subscriber?.id ?? null })
  } catch (e) {
    console.error('[newsletter/subscribe] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
