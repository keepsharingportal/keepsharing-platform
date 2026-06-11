// POST /api/renew/[token]/checkout
// Creates a subscription-mode Stripe Checkout session for an ad placement
// renewal. Token gates the lookup; the linked stripe_products row decides
// the price + interval; metadata.placement_id flows to the webhook so the
// subscription is bound back to the right ad_placements row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCheckoutSession, loadStripe, StripeApiError } from '@/lib/integrations/stripe/client'

export const runtime     = 'nodejs'
export const maxDuration = 30

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  let body: { productId?: string; placementId?: string; customerEmail?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }
  if (!body.productId || !body.placementId) {
    return NextResponse.json({ ok: false, error: 'missing_required' }, { status: 400 })
  }

  const stripe = await loadStripe()
  if (!stripe || !stripe.secret_key) return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 })

  const db = adminDb()

  // Re-validate the token + the placement → product binding so a malicious
  // POST that swaps productId / placementId can't subscribe to a different
  // placement's plan.
  const { data: placementData } = await db
    .from('ad_placements')
    .select('id, stripe_subscription_id, subscription_status')
    .eq('renewal_token', token)
    .eq('id', body.placementId)
    .maybeSingle()
  const placement = placementData as { id: string; stripe_subscription_id: string | null; subscription_status: string | null } | null
  if (!placement) return NextResponse.json({ ok: false, error: 'invalid_token_or_placement' }, { status: 404 })
  if (placement.stripe_subscription_id && placement.subscription_status === 'active') {
    return NextResponse.json({ ok: false, error: 'already_subscribed' }, { status: 409 })
  }

  const { data: productData } = await db
    .from('stripe_products')
    .select('id, stripe_price_id, price_cents, interval, target_table, target_id, is_active')
    .eq('id', body.productId)
    .maybeSingle()
  const product = productData as null | { id: string; stripe_price_id: string; price_cents: number; interval: string | null; target_table: string | null; target_id: string | null; is_active: boolean }
  if (!product || !product.is_active) return NextResponse.json({ ok: false, error: 'product_not_available' }, { status: 404 })
  if (product.target_table !== 'ad_placements' || product.target_id !== body.placementId) {
    return NextResponse.json({ ok: false, error: 'product_not_linked_to_placement' }, { status: 400 })
  }
  if (!product.interval) {
    return NextResponse.json({ ok: false, error: 'product_not_recurring' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  try {
    const session = await createCheckoutSession(stripe.secret_key, {
      priceId:       product.stripe_price_id,
      mode:          'subscription',
      successUrl:    `${base}/renew/${token}?success=1`,
      cancelUrl:     `${base}/renew/${token}?canceled=1`,
      customerEmail: body.customerEmail,
      metadata: {
        source:       'placement_renewal',
        placement_id: body.placementId,
        product_id:   body.productId,
      },
    })

    // Mirror the session so the webhook can route on completion (same
    // pattern as the claim_spot flow).
    await db.from('stripe_checkout_sessions').insert({
      stripe_session_id: session.id,
      product_id:        product.id,
      source:            'placement_renewal',
      target_table:      'ad_placements',
      target_id:         body.placementId,
      amount_cents:      product.price_cents,
      status:            'pending',
    }).then(() => undefined, () => undefined)

    return NextResponse.json({ ok: true, url: session.url })
  } catch (e) {
    const msg = e instanceof StripeApiError ? e.message : (e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
