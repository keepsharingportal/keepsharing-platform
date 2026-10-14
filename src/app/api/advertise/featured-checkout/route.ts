// POST /api/advertise/featured-checkout
//
// Self-serve Stripe Checkout for a featured-tier annual listing.
// Body: { business_name, email, guide_slug }
//
// We don't create the advertiser_account here — that happens in the
// webhook after payment confirms. The metadata travels with the
// session so the webhook can create the right account.
//
// Required env: STRIPE_FEATURED_LISTING_PRICE_ID (a recurring price
// in Stripe representing the annual featured tier).

import { NextRequest, NextResponse } from 'next/server'
import { checkoutOrigin } from '@/lib/checkout-origin'
import { loadStripe, createCheckoutSession } from '@/lib/integrations/stripe/client'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  business_name?: string
  email?:         string
  guide_slug?:    string
  // Honeypot
  website?:       string
}

// Was a chain of deployment-wide env vars ending in a hardcoded River Region
// URL. One deployment serves six brand domains, so no value of those vars
// returns a Greater Pensacola advertiser to Greater Pensacola — they paid and
// landed on River Region's site. Resolved from the request instead; see
// lib/checkout-origin.ts, which also validates the host rather than trusting
// the Origin header.
//
// The honeypot path calls this too: a bot gets the same shape of URL as a
// real submission, which is the point of a honeypot.

export async function POST(req: NextRequest) {
  const allowed = await checkRateLimit({ scope: 'advertise.featured-checkout', req, max: 5 })
  if (!allowed) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  const body = await req.json().catch(() => ({})) as Body
  if (body.website) {
    // Honeypot. Return a fake success URL — don't tell the bot anything.
    return NextResponse.json({ url: `${checkoutOrigin(req).origin}/advertise/featured-success?fake=1` })
  }

  const business_name = (body.business_name ?? '').trim()
  const email         = (body.email ?? '').trim().toLowerCase()
  const guide_slug    = (body.guide_slug ?? 'birthday-party').trim()

  if (!business_name) return NextResponse.json({ error: 'Business name is required.' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const priceId = process.env.STRIPE_FEATURED_LISTING_PRICE_ID
  if (!priceId) {
    return NextResponse.json({
      error: 'Featured-listing checkout is not configured yet — STRIPE_FEATURED_LISTING_PRICE_ID env var is missing.',
    }, { status: 503 })
  }

  const stripe = await loadStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe integration is not configured.' }, { status: 503 })
  }

  try {
    const session = await createCheckoutSession(stripe.secret_key, {
      priceId,
      mode:          'subscription', // annual recurring
      successUrl:    `${checkoutOrigin(req).origin}/advertise/featured-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:     `${checkoutOrigin(req).origin}/advertise/get-listed?canceled=1`,
      customerEmail: email,
      metadata: {
        type:          'featured_listing',
        business_name,
        email,
        guide_slug,
      },
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[advertise/featured-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
