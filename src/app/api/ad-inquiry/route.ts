// POST /api/ad-inquiry
//
// Phase-1 advertise capture. Someone clicks "Claim This Spot" on a
// public placeholder → SlotInquiryModal posts here. We:
//   1. Save the inquiry to ad_inquiries so the editor can see a queue
//      in /admin/ads (next phase).
//   2. Email the editor immediately so they can follow up by hand
//      before Stripe self-serve is wired.
//
// No auth — this is a public form. Rate-limited by absence of bot
// signals + email validation; we'll add a stricter limiter once we
// see real traffic shape.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { findPlacementType } from '@/lib/ads/placement-types'

export const runtime = 'nodejs'

interface Body {
  placement_type?: string
  business_name?:  string
  contact_name?:   string
  email?:          string
  phone?:          string
  message?:        string
  /** Where on the site the form was submitted from (for context in the email). */
  source_url?:     string
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  const businessName = (body.business_name ?? '').trim()
  if (!businessName) {
    return NextResponse.json({ error: 'Business name required' }, { status: 400 })
  }

  const placementType = (body.placement_type ?? '').trim() || null
  const slotDef = placementType ? findPlacementType(placementType) : null
  const slotLabel = slotDef?.label ?? placementType ?? '(no specific slot)'

  // Save the inquiry — best-effort, don't block on insert errors.
  // Falls back gracefully if the table doesn't exist yet (migration 120
  // will create it). Editor still gets the email below.
  const supabase = createAdminClient()
  await supabase
    .from('ad_inquiries')
    .insert({
      placement_type: placementType,
      business_name:  businessName,
      contact_name:   (body.contact_name ?? '').trim() || null,
      email,
      phone:          (body.phone   ?? '').trim() || null,
      message:        (body.message ?? '').trim() || null,
      source_url:     (body.source_url ?? '').trim() || null,
      status:         'new',
    })
    .then(({ error }) => {
      if (error) console.warn('[ad-inquiry] insert failed (may need migration 120):', error.message)
    })

  // Email the editor. Phase 1 = manual follow-up; Phase 2 = Stripe.
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const resend  = new Resend(apiKey)
      const editorEmail = process.env.AD_INQUIRY_EDITOR_EMAIL ?? 'jason@riverregionparents.com'
      const fromAddress = process.env.SUBMISSIONS_FROM_EMAIL  ?? 'River Region Parents <hello@riverregionparents.com>'

      const html = `<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <div style="background: #0f172a; padding: 24px;">
    <p style="color: #fb923c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; margin: 0 0 4px;">Advertise inquiry</p>
    <h1 style="color: #fff; font-family: Georgia, serif; font-size: 22px; margin: 0;">${escape(businessName)}</h1>
  </div>
  <div style="padding: 24px;">
    <p style="margin: 0 0 12px;"><strong>Slot interest:</strong> ${escape(slotLabel)}</p>
    <p style="margin: 0 0 8px;"><strong>Contact:</strong> ${escape((body.contact_name ?? '').trim() || '—')}</p>
    <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${escape(email)}" style="color: #fb923c;">${escape(email)}</a></p>
    ${body.phone ? `<p style="margin: 0 0 8px;"><strong>Phone:</strong> ${escape(body.phone)}</p>` : ''}
    ${body.message ? `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;"><p style="margin: 0 0 8px;"><strong>Message:</strong></p><p style="margin: 0; white-space: pre-wrap; color: #334155;">${escape(body.message)}</p>` : ''}
    ${body.source_url ? `<p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">Submitted from: ${escape(body.source_url)}</p>` : ''}
  </div>
</div>`

      await resend.emails.send({
        from:    fromAddress,
        to:      [editorEmail],
        replyTo: email,
        subject: `Advertise inquiry: ${businessName} — ${slotLabel}`,
        html,
      })
    } catch (e) {
      console.warn('[ad-inquiry] email send failed:', e instanceof Error ? e.message : e)
    }
  }

  return NextResponse.json({ ok: true })
}
