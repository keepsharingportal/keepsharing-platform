// POST /api/admin/ads/payment-link
//
// Generates a Stripe Checkout link for an ad placement. Staff sends the
// link to the advertiser (or opens it for them during a call). When the
// payment completes, the Stripe webhook marks the placement active.
//
// Body: {
//   placement_type:   string,     // e.g., 'section_sponsor'
//   surface:          string,     // e.g., 'calendar' — used with the rate card
//   billing_period:   'monthly' | 'quarterly' | 'annual',
//   advertiser_id:    string,     // advertiser_accounts.id
//   ad_placement_id?: string,     // if already created — attached to metadata
// }
//
// Returns: { url: string } — the Stripe Checkout URL to send to the advertiser.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { getSlotRate } from '@/lib/ads/rate-card'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface Body {
  placement_type?:   string
  surface?:          string
  billing_period?:   'monthly' | 'quarterly' | 'annual'
  advertiser_id?:    string
  ad_placement_id?:  string
}

export async function POST(req: NextRequest) {
  try { await requireSettingsAccess() }
  catch (e) { if (e instanceof Response) return e; throw e }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured (STRIPE_SECRET_KEY missing)' }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  const { placement_type, surface, billing_period, advertiser_id, ad_placement_id } = body

  if (!placement_type) return NextResponse.json({ error: 'placement_type is required' }, { status: 400 })
  if (!surface)        return NextResponse.json({ error: 'surface is required' },        { status: 400 })
  if (!billing_period) return NextResponse.json({ error: 'billing_period is required' }, { status: 400 })
  if (!advertiser_id)  return NextResponse.json({ error: 'advertiser_id is required' },  { status: 400 })

  // Look up pricing from the rate card
  const slot = getSlotRate(placement_type, surface)
  if (!slot) {
    return NextResponse.json(
      { error: `No rate card entry for ${placement_type} on ${surface}` },
      { status: 400 },
    )
  }

  const price = billing_period === 'annual'
    ? slot.annual
    : billing_period === 'quarterly'
      ? slot.quarterly
      : slot.monthly

  const periodLabel = billing_period === 'annual'
    ? '(Annual)'
    : billing_period === 'quarterly'
      ? '(Quarterly)'
      : '(Monthly)'

  // Look up advertiser for the customer email
  const supabase = supabaseAdmin()
  const { data: acct } = await supabase
    .from('advertiser_accounts')
    .select('business_name, contact_email')
    .eq('id', advertiser_id)
    .maybeSingle()

  const businessName  = (acct as { business_name?: string } | null)?.business_name ?? 'Advertiser'
  const customerEmail = (acct as { contact_email?: string } | null)?.contact_email ?? undefined

  const origin = req.nextUrl.origin

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency:     'usd',
          product_data: {
            name:        `${slot.label} ${periodLabel}`,
            description: slot.description,
          },
          unit_amount: Math.round(price * 100), // cents
        },
        quantity: 1,
      }],
      mode:           'payment',
      customer_email: customerEmail,
      success_url:    `${origin}/admin/ads/map?payment=success`,
      cancel_url:     `${origin}/admin/ads/map?payment=cancelled`,
      metadata: {
        type:             'ad_placement',
        placement_type,
        surface,
        billing_period,
        advertiser_id,
        ad_placement_id:  ad_placement_id ?? '',
        business_name:    businessName,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[admin/ads/payment-link] Stripe error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Stripe session creation failed' },
      { status: 500 },
    )
  }
}
