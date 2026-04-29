import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, contactName, email, phone, existingSlug } = body

    if (!businessName || !email) {
      return NextResponse.json({ error: 'Business name and email are required' }, { status: 400 })
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'

    // Save pending upgrade record
    try {
      const supabase = await createClient()
      await supabase.from('summer_guide_leads').insert({
        email,
        source: `enhanced-upgrade-${Date.now()}`,
      })
    } catch { /* non-blocking */ }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 17500, // $175.00
          product_data: {
            name: 'Enhanced Summer Fun Guide Listing — 2026',
            description: `${businessName} — Full season enhanced listing with registration status, ages, price range, and priority placement above community listings.`,
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}/summer-fun-guide/upgrade/success?session_id={CHECKOUT_SESSION_ID}&slug=${existingSlug ?? ''}`,
      cancel_url:  `${origin}/summer-fun-guide/upgrade`,
      metadata: {
        type:          'sfg_enhanced_upgrade',
        business_name: businessName,
        contact_name:  contactName ?? '',
        email,
        phone:         phone ?? '',
        existing_slug: existingSlug ?? '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
