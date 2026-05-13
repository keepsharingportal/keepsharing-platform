import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

const TIER_PRICES: Record<string, { amount: number; name: string }> = {
  featured: { amount: 4500, name: 'Anniversary Spotlight — Featured ($45)' },
  premium:  { amount: 7500, name: 'Anniversary Spotlight — Premium Keepsake ($75)' },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tier, person1Name, person2Name, yearsTogether, anniversaryDate, shortMessage, email } = body

    const tierConfig = TIER_PRICES[tier]
    if (!tierConfig) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

    // Store pending record before payment
    try {
      const supabase = await createClient()
      await supabase.from('anniversary_spotlights').insert({
        person1_name:      person1Name,
        person2_name:      person2Name,
        couple_name:       `${person1Name} & ${person2Name}`,
        years_together:    parseInt(yearsTogether, 10) || 0,
        anniversary_date:  anniversaryDate,
        short_message:     shortMessage ?? '',
        email,
        tier,
        amount:            tierConfig.amount / 100,
        status:            'pending_payment',
      })
    } catch { /* non-blocking */ }

    const lineItems = [{
      price_data: {
        currency: 'usd',
        unit_amount: tierConfig.amount,
        product_data: {
          name: tierConfig.name,
          description: `${person1Name} & ${person2Name} — ${yearsTogether} year${parseInt(yearsTogether) === 1 ? '' : 's'} together`,
          images: [],
        },
      },
      quantity: 1,
    }]

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/boom/anniversary-spotlight/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/boom/anniversary-spotlight`,
      customer_email: email,
      metadata: {
        type:             'anniversary_spotlight',
        tier,
        person1_name:     person1Name,
        person2_name:     person2Name,
        years_together:   yearsTogether,
        anniversary_date: anniversaryDate,
        short_message:    (shortMessage ?? '').slice(0, 500),
        email,
        publication:      'RRB',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
