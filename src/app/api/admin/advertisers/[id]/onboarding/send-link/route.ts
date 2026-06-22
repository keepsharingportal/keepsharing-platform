// POST /api/admin/advertisers/[id]/onboarding/send-link
//
// Generates a tokenized magic link for the business owner and emails
// it to them via Resend. The token lives on advertiser_accounts and
// is the credential for the public /advertise/edit/[token] wizard.
//
// Reuse: re-issuing rotates the token (old one stops working) so the
// editor can refresh a link the business reports as lost / forwarded.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  to?:           string            // explicit override; defaults to advertiser.contact_email
  guide_slug?:   string            // default 'birthday-party'; included in the wizard URL
  expires_days?: number | null     // null = never expires
}

interface RouteParams { params: Promise<{ id: string }> }

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_PUBLIC_ORIGIN
      ?? process.env.NEXT_PUBLIC_SITE_URL
      ?? 'https://riverregionparents.com'
}

function fromAddress(): string {
  return process.env.ADVERTISER_FROM_EMAIL
      ?? 'River Region Parents <hello@riverregionparents.com>'
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Body

  const sb = createAdminClient()
  const { data: acct, error: fetchErr } = await sb
    .from('advertiser_accounts')
    .select('id, business_name, contact_email, slug')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr || !acct) {
    return NextResponse.json({ error: 'Advertiser not found.' }, { status: 404 })
  }

  const recipient = (body.to?.trim()) || (acct.contact_email ?? '').trim()
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return NextResponse.json({
      error: 'No valid email address. Add a contact_email to this business or pass `to` in the request.',
    }, { status: 400 })
  }

  const token = randomUUID()
  const now   = new Date()
  const expiresAt = body.expires_days != null
    ? new Date(now.getTime() + body.expires_days * 86_400_000)
    : null

  const { error: updateErr } = await sb
    .from('advertiser_accounts')
    .update({
      onboarding_token:            token,
      onboarding_token_issued_at:  now.toISOString(),
      onboarding_token_expires_at: expiresAt?.toISOString() ?? null,
      onboarding_status:           'invited',
    })
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const wizardUrl = `${publicOrigin()}/advertise/edit/${token}`
  const guideSlug = body.guide_slug ?? 'birthday-party'

  // Best-effort send — log failures but return 200 to the admin so
  // they can copy the URL manually as a fallback if Resend is down.
  const apiKey = process.env.RESEND_API_KEY
  let sent = false
  if (apiKey) {
    try {
      await new Resend(apiKey).emails.send({
        from:    fromAddress(),
        to:      recipient,
        subject: `Your River Region Parents listing is ready to edit — ${acct.business_name}`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Welcome to River Region Parents</h1>
            <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Hi from the River Region Parents team — your listing for <strong>${acct.business_name}</strong> is set up and waiting for you to fill in the details.</p>
            <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">Click the button below to open your private edit page. You can fill it out in one sitting or come back any time using this same link.</p>
            <p style="text-align:center;margin:0 0 24px;">
              <a href="${wizardUrl}?guide=${encodeURIComponent(guideSlug)}" style="display:inline-block;background:#ff7a59;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Open Your Listing Editor</a>
            </p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 8px;">Or paste this URL into your browser:</p>
            <p style="font-size:12px;color:#888;word-break:break-all;background:#f7f7f7;padding:10px 12px;border-radius:6px;margin:0 0 24px;">${wizardUrl}?guide=${encodeURIComponent(guideSlug)}</p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">Questions? Just reply to this email — we'll help.</p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:8px 0 0;">— River Region Parents</p>
          </div>
        `,
      })
      sent = true
    } catch (e) {
      console.error('[onboarding/send-link] Resend failed:', e)
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    recipient,
    wizard_url: `${wizardUrl}?guide=${encodeURIComponent(guideSlug)}`,
    expires_at: expiresAt?.toISOString() ?? null,
    note: sent
      ? undefined
      : 'Resend was not configured or send failed — copy the URL manually and send to the business.',
  })
}
