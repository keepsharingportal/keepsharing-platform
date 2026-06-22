// POST /api/public/onboarding/signup
//
// Public self-serve signup. Captures business_name + email + guide,
// creates the advertiser_accounts row, generates a magic-link token,
// and emails the wizard URL to the business owner.
//
// Rate-limited per IP to keep this from becoming a spam vector.
// Listings are marked is_published=false so admin reviews them
// before they appear on the public guide; the wizard works either
// way so the business can fill it out immediately.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { slugifyForUrl } from '@/lib/articles/slug'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  business_name?: string
  email?:         string
  guide_slug?:    string
  // Honeypot — bots tend to fill every field; humans don't see this.
  website?:       string
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function publicOrigin(): string {
  return process.env.NEXT_PUBLIC_PUBLIC_ORIGIN
      ?? process.env.NEXT_PUBLIC_SITE_URL
      ?? 'https://riverregionparents.com'
}

function fromAddress(): string {
  return process.env.ADVERTISER_FROM_EMAIL
      ?? 'River Region Parents <hello@riverregionparents.com>'
}

const ALLOWED_GUIDES = new Set([
  'birthday-party', 'summer-camp', 'summer-fun', 'private-school',
  'childcare', 'healthy-kids', 'special-needs', 'afterschool', 'newcomer',
])

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit({ scope: 'advertise.signup', req, max: 5 })
  if (!allowed) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const body = await req.json().catch(() => ({})) as Body
  if (body.website) {
    // Honeypot tripped — bot. Return success quietly to avoid telling
    // them anything useful.
    return NextResponse.json({ ok: true, sent: true })
  }

  const business_name = (body.business_name ?? '').trim()
  const email         = (body.email ?? '').trim().toLowerCase()
  const guide_slug    = (body.guide_slug ?? 'birthday-party').trim()

  if (!business_name) return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required so we can send your edit link.' }, { status: 400 })
  }
  if (!ALLOWED_GUIDES.has(guide_slug)) {
    return NextResponse.json({ error: 'Unknown guide.' }, { status: 400 })
  }

  const supabase = sb()

  // Find-or-create on (case-insensitive) business name. If the name
  // already exists we re-issue a token instead of duplicating.
  const { data: existing } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, contact_email')
    .ilike('business_name', business_name)
    .maybeSingle()

  const token = randomUUID()
  const now   = new Date()
  // Self-signup links expire after 90 days so abandoned signups don't
  // leave editable forever.
  const expiresAt = new Date(now.getTime() + 90 * 86_400_000)

  let advertiserId: string

  if (existing) {
    advertiserId = existing.id
    const { error } = await supabase
      .from('advertiser_accounts')
      .update({
        onboarding_token:            token,
        onboarding_token_issued_at:  now.toISOString(),
        onboarding_token_expires_at: expiresAt.toISOString(),
        onboarding_status:           'self_signup',
        contact_email:               existing.contact_email ?? email,
      })
      .eq('id', advertiserId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const baseSlug = slugifyForUrl(business_name) || 'business'
    let slug = baseSlug
    // Collision-safe slug
    for (let i = 1; i <= 50; i++) {
      const candidate = i === 1 ? baseSlug : `${baseSlug}-${i}`
      const { data: dupe } = await supabase
        .from('advertiser_accounts')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (!dupe) { slug = candidate; break }
    }

    const { data: created, error } = await supabase
      .from('advertiser_accounts')
      .insert({
        business_name,
        slug,
        contact_email:               email,
        is_active:                   true,
        onboarding_token:            token,
        onboarding_token_issued_at:  now.toISOString(),
        onboarding_token_expires_at: expiresAt.toISOString(),
        onboarding_status:           'self_signup',
      })
      .select('id')
      .single()
    if (error || !created) return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 })
    advertiserId = created.id

    // Pre-create an unpublished guide_listings row so the wizard's
    // first guide_data save has a row to merge into. Admin will
    // toggle is_published=true after reviewing.
    await supabase.from('guide_listings').insert({
      advertiser_account_id: advertiserId,
      guide_type_slug:       guide_slug,
      listing_tier:          'community',
      is_published:          false,
      display_order:         9999,
    })
  }

  const wizardUrl = `${publicOrigin()}/advertise/edit/${token}?guide=${encodeURIComponent(guide_slug)}`

  let sent = false
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      await new Resend(apiKey).emails.send({
        from:    fromAddress(),
        to:      email,
        subject: `Welcome to River Region Parents — your listing editor is ready`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Your listing editor is ready</h1>
            <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Thanks for signing up <strong>${business_name}</strong>. Use the button below to open your private listing editor. You can fill out one section at a time and come back any time using the same link.</p>
            <p style="text-align:center;margin:0 0 24px;">
              <a href="${wizardUrl}" style="display:inline-block;background:#ff7a59;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Open Your Listing Editor</a>
            </p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 8px;">Or paste this URL into your browser:</p>
            <p style="font-size:12px;color:#888;word-break:break-all;background:#f7f7f7;padding:10px 12px;border-radius:6px;margin:0 0 24px;">${wizardUrl}</p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">Once you've filled it out, our editor will review and publish your listing to the appropriate guide.</p>
            <p style="font-size:13px;color:#666;line-height:1.6;margin:8px 0 0;">— River Region Parents</p>
          </div>
        `,
      })
      sent = true
    } catch (e) {
      console.error('[advertise/signup] Resend failed:', e)
    }
  }

  return NextResponse.json({ ok: true, sent })
}
