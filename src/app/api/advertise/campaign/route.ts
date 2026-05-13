import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

const SIZE_LABELS: Record<string, string> = {
  full: 'Full Page',
  half: 'Half Page',
  quarter: 'Quarter Page',
  sixth: 'Sixth Page',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      // Campaign config
      adSize: string
      commitmentMonths: number
      monthlyRate: number
      totalAmount: number
      // Business info
      firstName: string
      lastName?: string
      businessName: string
      email: string
      phone: string
      goals?: string[]
      campaignNotes?: string
      // Optional: existing lead ID from page 1
      leadId?: string
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
    const supabase = await createClient()

    let leadId = body.leadId

    // Create or update lead record
    if (leadId) {
      await supabase
        .from('advertiser_leads')
        .update({
          ad_size:           body.adSize,
          commitment_months: body.commitmentMonths,
          monthly_rate:      body.monthlyRate,
          total_amount:      body.totalAmount,
          goals:             body.goals ?? [],
          campaign_notes:    body.campaignNotes ?? null,
          status:            'campaign_started',
          updated_at:        new Date().toISOString(),
        })
        .eq('id', leadId)
    } else {
      const { data } = await supabase
        .from('advertiser_leads')
        .insert({
          first_name:        body.firstName,
          last_name:         body.lastName ?? null,
          business_name:     body.businessName,
          email:             body.email,
          phone:             body.phone,
          ad_size:           body.adSize,
          commitment_months: body.commitmentMonths,
          monthly_rate:      body.monthlyRate,
          total_amount:      body.totalAmount,
          goals:             body.goals ?? [],
          campaign_notes:    body.campaignNotes ?? null,
          status:            'campaign_started',
          source:            'self_serve_web',
        })
        .select('id')
        .maybeSingle()
      leadId = data?.id ?? undefined
    }

    // Create Stripe checkout
    const sizeLabel = SIZE_LABELS[body.adSize] ?? body.adSize
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(body.monthlyRate * 100),
            product_data: {
              name: `River Region Parents — ${sizeLabel} Campaign`,
              description: `${body.commitmentMonths}-month advertising campaign in River Region Parents. Your ad runs in print, social media, and email every month.`,
            },
          },
          quantity: body.commitmentMonths,
        },
      ],
      mode: 'payment',
      customer_email: body.email,
      success_url: `${origin}/advertise/success?session_id={CHECKOUT_SESSION_ID}&lead=${leadId ?? ''}`,
      cancel_url:  `${origin}/advertise/campaign`,
      metadata: {
        type:              'advertiser_campaign',
        lead_id:           leadId ?? '',
        first_name:        body.firstName,
        last_name:         body.lastName ?? '',
        business_name:     body.businessName,
        email:             body.email,
        phone:             body.phone ?? '',
        ad_size:           body.adSize,
        commitment_months: String(body.commitmentMonths),
        monthly_rate:      String(body.monthlyRate),
        total_amount:      String(body.totalAmount),
      },
    })

    // Link Stripe session to lead
    if (leadId) {
      await supabase
        .from('advertiser_leads')
        .update({ stripe_session_id: session.id })
        .eq('id', leadId)
    }

    return NextResponse.json({ url: session.url, leadId })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
