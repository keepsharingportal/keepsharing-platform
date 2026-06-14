// POST /api/listings/message
// Captures a listing inquiry from the public guide listing page.
//
// What this actually does (honest):
//   1. Inserts into listing_messages so admin has a record
//   2. Triggers an admin notification email (via GHL) when configured,
//      so an editor can forward to the business
// What it does NOT do:
//   - Send a direct email to the business's contact_email. The form copy
//     reflects that — we say "we'll pass it along" not "they'll get an
//     email instantly".

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? 'hello@riverregionparents.com'
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL    ?? 'https://riverregionparents.com'

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

async function notifyAdmin(args: {
  businessName:  string
  contactEmail:  string | null
  contactPhone:  string | null
  inquiryId:     string
  parentName:    string
  parentEmail:   string
  parentPhone:   string | null
  message:       string
  sourceUrl:     string | null
}) {
  const token = process.env.GHL_PIT_RRP
  if (!token) return { sent: false, reason: 'no GHL token' }

  const body = `
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
  <div style="background: #1a2744; padding: 18px 22px; border-radius: 10px 10px 0 0;">
    <p style="color: #d4a843; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 4px;">River Region Parents</p>
    <h1 style="color: white; font-size: 18px; margin: 0;">📩 New listing inquiry — ${args.businessName}</h1>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 22px; border-radius: 0 0 10px 10px;">
    <div style="background: #f9fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin: 0 0 8px;">From</p>
      <p style="margin: 2px 0; font-size: 14px;"><strong>${args.parentName}</strong></p>
      <p style="margin: 2px 0; font-size: 14px;">${args.parentEmail}</p>
      ${args.parentPhone ? `<p style="margin: 2px 0; font-size: 14px;">${args.parentPhone}</p>` : ''}
    </div>
    <div style="background: #fff7ed; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #ef6442; margin: 0 0 6px;">Forward to business</p>
      <p style="margin: 2px 0; font-size: 14px;"><strong>${args.businessName}</strong></p>
      ${args.contactEmail ? `<p style="margin: 2px 0; font-size: 14px;">📧 <a href="mailto:${args.contactEmail}">${args.contactEmail}</a></p>` : '<p style="margin: 2px 0; font-size: 13px; color: #888;">No business email on file</p>'}
      ${args.contactPhone ? `<p style="margin: 2px 0; font-size: 14px;">📞 ${args.contactPhone}</p>` : ''}
    </div>
    <div style="margin-bottom: 16px;">
      <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin: 0 0 6px;">Message</p>
      <p style="margin: 0; font-size: 14px; line-height: 1.55; white-space: pre-wrap;">${args.message.replace(/[<>]/g, '')}</p>
    </div>
    ${args.sourceUrl ? `<p style="font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; margin-top: 16px;">From: <a href="${args.sourceUrl}" style="color: #4a90d9;">${args.sourceUrl}</a></p>` : ''}
    <p style="font-size: 11px; color: #aaa; margin: 4px 0 0;">Inquiry ID: ${args.inquiryId}</p>
  </div>
</body></html>
  `.trim()

  try {
    const res = await fetch(`${GHL_BASE}/conversations/messages/outbound`, {
      method:  'POST',
      headers: {
        Authorization:   `Bearer ${token}`,
        Version:         GHL_VERSION,
        'Content-Type':  'application/json',
        Accept:          'application/json',
      },
      body: JSON.stringify({
        type:    'Email',
        emailTo: ADMIN_EMAIL,
        subject: `📩 Listing inquiry — ${args.businessName} (from ${args.parentName})`,
        html:    body,
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.warn('[listings/message] GHL admin notify failed:', res.status, err.slice(0, 200))
      return { sent: false, reason: `GHL HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    console.warn('[listings/message] GHL admin notify error:', e)
    return { sent: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const required = ['advertiser_account_id', 'parent_name', 'parent_email', 'message']
  for (const f of required) {
    if (!body[f]) return NextResponse.json({ error: `${f} required` }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: inquiry, error } = await supabase
    .from('listing_messages')
    .insert({
      advertiser_account_id: body.advertiser_account_id,
      guide_type_slug:       body.guide_type_slug ?? null,
      parent_name:           body.parent_name,
      parent_email:          body.parent_email,
      parent_phone:          body.parent_phone ?? null,
      message:               body.message,
      source_url:            body.source_url ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Look up the business's contact info so we can include it in the admin email
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('business_name, contact_email, office_phone, contact_phone, mobile_phone')
    .eq('id', body.advertiser_account_id)
    .maybeSingle()

  // Fire-and-forget — don't fail the request if GHL is down/unconfigured.
  // The inquiry is already saved; admin can still review at /admin/inquiries.
  const notification = await notifyAdmin({
    businessName:  acct?.business_name ?? 'Unknown business',
    contactEmail:  acct?.contact_email ?? null,
    contactPhone:  acct?.office_phone ?? acct?.contact_phone ?? acct?.mobile_phone ?? null,
    inquiryId:     inquiry?.id ?? '?',
    parentName:    body.parent_name,
    parentEmail:   body.parent_email,
    parentPhone:   body.parent_phone ?? null,
    message:       body.message,
    sourceUrl:     body.source_url ?? `${SITE_URL}/`,
  })

  return NextResponse.json({ success: true, admin_notified: notification.sent })
}
