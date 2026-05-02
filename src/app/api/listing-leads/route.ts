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
    const { name, email, message, listingSlug, listingName, advertiserId } = await req.json()

    if (!email || !message) {
      return NextResponse.json({ error: 'email and message required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Save to lead_submissions
    await supabase.from('lead_submissions').insert({
      submitter_name:       name ?? null,
      submitter_email:      email,
      message,
      source_page:          `/newcomer-guide/listings/${listingSlug ?? ''}`,
      target_advertiser_id: advertiserId ?? null,
      form_step_completed:  1,
    })

    // GHL: subscribe to Mom Insider + tag with source listing
    const parts = (name ?? '').trim().split(/\s+/)
    const firstName = parts[0] ?? undefined
    const lastName  = parts.slice(1).join(' ') || undefined
    const tags = ['mom-insider', `source-family-guide-listing-${listingSlug ?? 'unknown'}`]

    await upsertContact({
      publicationSlug: 'rrp',
      email,
      firstName,
      lastName,
      tags,
    })

    // Click count tracking
    if (listingSlug) {
      await supabase.rpc('increment_listing_click', { p_slug: listingSlug, p_field: 'message' }).catch(() => null)
    }

    // TODO: send email to advertiser's contact_email when email service configured
    // (use Supabase Edge Function or Resend in a future build)
    console.log(`[listing-leads] Message from ${email} to ${listingName}: "${message.slice(0, 80)}"`)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[listing-leads] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
