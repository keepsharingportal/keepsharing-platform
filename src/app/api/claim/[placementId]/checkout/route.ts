// Public ad-spot claim → Stripe Checkout session creation.
// Reads stripe_products to find the right price + creates a Checkout session
// with metadata that the webhook handler will read to activate the spot.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCheckoutSession, loadStripe, StripeApiError } from '@/lib/integrations/stripe/client'

export const runtime     = 'nodejs'
export const maxDuration = 30

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ placementId: string }> }) {
  const { placementId } = await ctx.params
  let body: { productId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Bad JSON' }, { status: 400 }) }
  const productId = body.productId
  if (!productId) return NextResponse.json({ ok: false, error: 'Missing productId' }, { status: 400 })

  const stripe = await loadStripe()
  if (!stripe || !stripe.secret_key) return NextResponse.json({ ok: false, error: 'Stripe not configured' }, { status: 503 })

  const db = adminDb()
  const { data: placementData } = await db
    .from('ad_placements')
    .select('id, advertiser_account_id, claimed_at')
    .eq('id', placementId)
    .maybeSingle()
  const placement = placementData as { id: string; advertiser_account_id: string | null; claimed_at: string | null } | null
  if (!placement) return NextResponse.json({ ok: false, error: 'Placement not found' }, { status: 404 })
  if (placement.advertiser_account_id || placement.claimed_at) {
    return NextResponse.json({ ok: false, error: 'Spot already claimed' }, { status: 409 })
  }

  const { data: productData } = await db
    .from('stripe_products')
    .select('id, stripe_price_id, price_cents, interval, is_active, target_table, target_id')
    .eq('id', productId)
    .maybeSingle()
  const product = productData as null | { id: string; stripe_price_id: string; price_cents: number; interval: string | null; is_active: boolean; target_table: string | null; target_id: string | null }
  if (!product || !product.is_active) return NextResponse.json({ ok: false, error: 'Product not available' }, { status: 404 })
  if (product.target_table !== 'ad_placements' || product.target_id !== placementId) {
    return NextResponse.json({ ok: false, error: 'Product not linked to this placement' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
  try {
    const session = await createCheckoutSession(stripe.secret_key, {
      priceId:     product.stripe_price_id,
      mode:        product.interval ? 'subscription' : 'payment',
      successUrl:  `${base}/claim/${placementId}?success=1`,
      cancelUrl:   `${base}/claim/${placementId}?canceled=1`,
      metadata:    { source: 'claim_spot', placement_id: placementId },
    })

    // Mirror the session locally so the webhook can route on completion.
    await db.from('stripe_checkout_sessions').insert({
      stripe_session_id: session.id,
      product_id:        product.id,
      source:            'claim_spot',
      target_table:      'ad_placements',
      target_id:         placementId,
      amount_cents:      product.price_cents,
      status:            'pending',
    }).then(() => undefined, () => undefined)   // pre-151 tolerance

    return NextResponse.json({ ok: true, url: session.url })
  } catch (e) {
    const msg = e instanceof StripeApiError ? e.message : (e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
