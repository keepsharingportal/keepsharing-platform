import { NextRequest, NextResponse } from 'next/server'
import { checkoutOrigin } from '@/lib/checkout-origin'
import { loadBrandContext } from '@/lib/brand-context'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

const TIER_PRICES: Record<string, { amount: number; name: string }> = {
  basic:    { amount: 2500, name: 'Birthday Spotlight Basic' },
  featured: { amount: 4500, name: 'Birthday Spotlight Featured' },
  premium:  { amount: 7500, name: 'Birthday Spotlight Premium (Birthday Star)' },
}

export async function POST(req: NextRequest) {
  const { market } = await loadBrandContext()
  const brandName    = market.displayName
  try {
    const body = await req.json()
    const { tier, childName, birthdayDate, parentEmail, parentName, parentPhone, childAge, message } = body

    const tierConfig = TIER_PRICES[tier]
    if (!tierConfig) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Was: the raw Origin request header, then NEXT_PUBLIC_SITE_URL, then a
    // hardcoded River Region URL. Two bugs in one line. Origin is
    // attacker-controlled, so it fed an unvalidated host straight into
    // Stripe's success_url — a forged Origin turned the post-payment
    // redirect into an open redirect. And when Origin was absent, a Greater
    // Pensacola payer landed on River Region's site. Both are handled in
    // lib/checkout-origin.ts; see the header there.
    const { origin } = checkoutOrigin(req)

    // Store draft record in Supabase before payment (status: pending_payment)
    try {
      const supabase = await createClient()
      await supabase.from('birthday_spotlights').insert({
        child_name:    childName,
        child_age:     parseInt(childAge, 10),
        birthday_date: birthdayDate,
        parent_name:   parentName,
        parent_email:  parentEmail,
        parent_phone:  parentPhone,
        message:       message ?? '',
        tier,
        amount:        tierConfig.amount / 100,
        status:        'pending_payment',
        publication:   'RRP',
      })
    } catch { /* non-blocking — session proceeds even if DB insert fails */ }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: tierConfig.amount,
          product_data: {
            name: tierConfig.name,
            description: `${childName}'s Birthday Spotlight in ${brandName} — ${tier.charAt(0).toUpperCase() + tier.slice(1)} Package`,
            images: [],
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/birthday-spotlight/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/birthday-spotlight`,
      customer_email: parentEmail,
      metadata: {
        type:          'birthday_spotlight',
        tier,
        child_name:    childName,
        birthday_date: birthdayDate,
        parent_name:   parentName,
        parent_email:  parentEmail,
        parent_phone:  parentPhone,
        child_age:     childAge,
        message:       (message ?? '').slice(0, 500),
        publication:   'RRP',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
