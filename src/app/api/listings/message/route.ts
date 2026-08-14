// POST /api/listings/message
// Captures a listing inquiry from the public guide listing page.
//
// What this does:
//   1. Inserts into listing_messages so there's always a record
//   2. Emails the BUSINESS directly when we hold an email for them, with the
//      parent's address as reply-to and the editor cc'd. The business replies
//      straight to the parent; the editor sees it happened.
//   3. Falls back to notifying only the editor when we have no email for the
//      business — a phone-only listing genuinely needs a human to make the call.
//
// This used to notify the editor alone, who then forwarded every inquiry by
// hand. That was duplicated work and a day of delay on a warm lead, for no
// benefit: the parent has already chosen to contact the business, and the
// business is the one who can answer. The editor stays cc'd rather than in the
// middle.

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

/**
 * Email the business directly, cc'ing the editor.
 *
 * Reply-to is the parent, so when the business hits reply it reaches the
 * person asking rather than us — which is the whole point of not sitting in
 * the middle. The editor is cc'd so they can see the lead landed and step in
 * if it goes quiet, without having to forward anything.
 */
async function notifyBusiness(args: {
  businessEmail: string
  businessName:  string
  guideName:     string
  inquiryId:     string
  parentName:    string
  parentEmail:   string
  parentPhone:   string | null
  message:       string
  sourceUrl:     string | null
}): Promise<{ sent: boolean; via?: string; reason?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'no RESEND_API_KEY' }

  const listingLine = `your ${args.guideName} listing`
  try {
    const { Resend } = await import('resend')
    await new Resend(key).emails.send({
      from:    process.env.SUBMISSIONS_FROM_EMAIL ?? 'River Region Parents <hello@riverregionparents.com>',
      to:      [args.businessEmail],
      cc:      [ADMIN_EMAIL],
      replyTo: args.parentEmail,
      subject: `A River Region Parents reader is asking about ${args.businessName}`,
      html: `
        <p>Hi ${esc(args.businessName)},</p>
        <p>A River Region Parents follower is requesting more info from
           ${esc(listingLine)}. Their question is below —
           <strong>just hit reply</strong> and your response goes straight to them.</p>
        <div style="border-left:3px solid #ff7a59;padding:10px 14px;margin:16px 0;background:#fff7f5">
          <p style="margin:0 0 6px"><strong>${esc(args.parentName)}</strong><br>
             <a href="mailto:${esc(args.parentEmail)}">${esc(args.parentEmail)}</a>${
               args.parentPhone ? ` &middot; ${esc(args.parentPhone)}` : ''}</p>
          <p style="margin:0;white-space:pre-wrap">${esc(args.message)}</p>
        </div>
        <p style="font-size:12px;color:#666">You're receiving this because you're listed in
           ${esc(args.guideName)} at River Region Parents. We've copied our editor so we know it
           reached you.</p>
        <p style="font-size:11px;color:#999">Inquiry ${esc(args.inquiryId)}${
          args.sourceUrl ? ` &middot; <a href="${esc(args.sourceUrl)}">${esc(args.sourceUrl)}</a>` : ''}</p>`,
      text:
        `Hi ${args.businessName},\n\n` +
        `A River Region Parents follower is requesting more info from ${listingLine}. ` +
        `Their question is below — just hit reply and your response goes straight to them.\n\n` +
        `${args.parentName}\n${args.parentEmail}${args.parentPhone ? ` · ${args.parentPhone}` : ''}\n\n` +
        `${args.message}\n\n` +
        `You're receiving this because you're listed in ${args.guideName} at River Region Parents. ` +
        `We've copied our editor so we know it reached you.\n` +
        `Inquiry ${args.inquiryId}${args.sourceUrl ? ` · ${args.sourceUrl}` : ''}`,
    })
    return { sent: true, via: 'resend:business' }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[listings/message] direct-to-business send failed for inquiry %s: %s', args.inquiryId, reason)
    return { sent: false, reason }
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Backup notification over Resend, used when the GHL send doesn't land.
 * Plain text as well as HTML — an HTML-only message from a domain with little
 * sending history is exactly the shape spam filters hold onto, and this one
 * carries a lead we cannot afford to lose.
 */
async function notifyAdminViaResend(
  args: Parameters<typeof notifyAdmin>[0],
  ghlReason?: string,
): Promise<{ sent: boolean; via?: string; reason?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error(
      '[listings/message] inquiry saved but NOT notified — GHL failed (%s) and ' +
      'RESEND_API_KEY is unset. Inquiry %s is sitting unread in listing_messages.',
      ghlReason, args.inquiryId,
    )
    return { sent: false, reason: `ghl: ${ghlReason}; resend: no API key` }
  }
  try {
    const { Resend } = await import('resend')
    const contact = [args.contactEmail, args.contactPhone].filter(Boolean).join(' · ') || 'no contact on file'
    await new Resend(key).emails.send({
      from:    process.env.SUBMISSIONS_FROM_EMAIL ?? 'River Region Parents <hello@riverregionparents.com>',
      to:      [ADMIN_EMAIL],
      replyTo: args.parentEmail,
      subject: `Listing inquiry — ${args.businessName} (from ${args.parentName})`,
      html: `
        <p><strong>New listing inquiry — ${args.businessName}</strong></p>
        <p>${args.parentName} &lt;${args.parentEmail}&gt;${args.parentPhone ? ` · ${args.parentPhone}` : ''}</p>
        <blockquote style="border-left:3px solid #ddd;padding-left:12px;color:#444">${args.message}</blockquote>
        <p>Pass to: ${contact}</p>
        <p style="font-size:11px;color:#888">Inquiry ${args.inquiryId}${args.sourceUrl ? ` · ${args.sourceUrl}` : ''}<br>
        Sent via Resend because the GHL notification failed (${ghlReason}).</p>`,
      text:
        `New listing inquiry — ${args.businessName}\n\n` +
        `${args.parentName} <${args.parentEmail}>${args.parentPhone ? ` · ${args.parentPhone}` : ''}\n\n` +
        `${args.message}\n\n` +
        `Pass to: ${contact}\n` +
        `Inquiry ${args.inquiryId}${args.sourceUrl ? ` · ${args.sourceUrl}` : ''}\n` +
        `Sent via Resend because the GHL notification failed (${ghlReason}).`,
    })
    return { sent: true, via: 'resend' }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[listings/message] BOTH notification paths failed for inquiry %s: ghl=%s resend=%s',
      args.inquiryId, ghlReason, reason)
    return { sent: false, reason: `ghl: ${ghlReason}; resend: ${reason}` }
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

  // Don't fail the request if notification is down — the inquiry is already
  // saved and reviewable in admin.
  const args = {
    businessName:  acct?.business_name ?? 'Unknown business',
    contactEmail:  acct?.contact_email ?? null,
    contactPhone:  acct?.office_phone ?? acct?.contact_phone ?? acct?.mobile_phone ?? null,
    inquiryId:     inquiry?.id ?? '?',
    parentName:    body.parent_name,
    parentEmail:   body.parent_email,
    parentPhone:   body.parent_phone ?? null,
    message:       body.message,
    sourceUrl:     body.source_url ?? `${SITE_URL}/`,
  }

  // Which guide is this listing in? Only used for the line "your After-School
  // Guide listing", but naming the guide is what makes the email read as
  // something the business opted into rather than cold mail.
  const { data: guideRow } = await supabase
    .from('guide_listings')
    .select('guide_types ( display_name )')
    .eq('advertiser_account_id', body.advertiser_account_id)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle()
  const guideName =
    (guideRow as { guide_types?: { display_name?: string } } | null)?.guide_types?.display_name
    ?? 'River Region Parents guide'

  const businessEmail = acct?.contact_email ?? null

  // Straight to the business when we can reach them; editor cc'd, parent as
  // reply-to. Only when we hold no email does an editor have to get involved.
  let notification: { sent: boolean; via?: string; reason?: string }
  let businessNotified = false

  if (businessEmail) {
    notification = await notifyBusiness({
      businessEmail,
      businessName: args.businessName,
      guideName,
      inquiryId:    args.inquiryId,
      parentName:   args.parentName,
      parentEmail:  args.parentEmail,
      parentPhone:  args.parentPhone,
      message:      args.message,
      sourceUrl:    args.sourceUrl,
    })
    businessNotified = notification.sent
    // If the direct send fails the lead must not evaporate — fall back to
    // telling the editor, who can forward the old way.
    if (!notification.sent) notification = await notifyAdminViaResend(args, notification.reason)
  } else {
    notification = await notifyAdmin(args)
    if (!notification.sent) notification = await notifyAdminViaResend(args, notification.reason)
  }

  return NextResponse.json({
    success: true,
    business_notified: businessNotified,
    admin_notified: notification.sent,
    // Surfaced so a failure is visible to whoever is testing the form rather
    // than living only in server logs.
    notify_via: notification.sent ? notification.via ?? 'ghl' : null,
    notify_error: notification.sent ? null : notification.reason ?? 'unknown',
  })
}
