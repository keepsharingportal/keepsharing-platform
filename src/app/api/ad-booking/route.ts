import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { PRINT_ZONES, WEB_ZONES } from '@/lib/ad-zones'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

const DESIGN_HELP_PRICE = 150_00 // cents

// GET /api/ad-booking?pub=RRP&issue=RRP+APR26
export async function GET(req: NextRequest) {
  const pub   = req.nextUrl.searchParams.get('pub') ?? 'RRP'
  const issue = req.nextUrl.searchParams.get('issue')

  try {
    const supabase = await createClient()
    const query = supabase
      .from('ad_inventory')
      .select('zone_id, status, booked_business')
      .eq('publication', pub)

    if (issue) query.eq('issue', issue)

    const { data, error } = await query
    if (error) throw error

    // Map zone_id → { status, bookedBusiness }
    const map: Record<string, { status: string; bookedBusiness: string | null }> = {}
    for (const row of data ?? []) {
      map[row.zone_id] = { status: row.status, bookedBusiness: row.booked_business }
    }
    return NextResponse.json(map)
  } catch {
    return NextResponse.json({})
  }
}

// POST /api/ad-booking — create Stripe Checkout session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      publication: string
      zoneId: string
      zoneType: 'print' | 'web'
      issues: string[]
      packageType: 'print' | 'web' | 'bundle'
      businessName: string
      contactName?: string
      phone?: string
      email: string
      website?: string
      designHelp: boolean
    }

    // Resolve zone info + price
    const allZones = [...PRINT_ZONES, ...WEB_ZONES]
    const zone = allZones.find(z => z.id === body.zoneId)
    if (!zone) return NextResponse.json({ error: 'Unknown zone' }, { status: 400 })

    const months = body.issues.length
    let basePrice = zone.price * months

    // Bundle discount 15%
    if (body.packageType === 'bundle') basePrice = Math.round(basePrice * 0.85)

    const totalCents = basePrice * 100 + (body.designHelp ? DESIGN_HELP_PRICE : 0)

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'

    // Create draft booking in DB
    const supabase = await createClient()
    const { data: booking, error: bookErr } = await supabase
      .from('ad_bookings')
      .insert({
        publication:  body.publication,
        issues:       body.issues,
        zone_id:      body.zoneId,
        zone_type:    body.zoneType,
        zone_name:    zone.displayName,
        business_name: body.businessName,
        contact_name: body.contactName ?? null,
        phone:        body.phone ?? null,
        email:        body.email,
        website:      body.website ?? null,
        package_type: body.packageType,
        total_amount: totalCents / 100,
        design_help:  body.designHelp,
        status:       'pending',
      })
      .select('id')
      .single()

    if (bookErr) console.error('booking insert error:', bookErr.message)

    // Reserve inventory slots
    for (const issue of body.issues) {
      await supabase
        .from('ad_inventory')
        .upsert({
          publication: body.publication,
          issue,
          zone_id:     body.zoneId,
          zone_type:   body.zoneType,
          zone_name:   zone.displayName,
          price_monthly: zone.price,
          status:      'reserved',
          booking_id:  booking?.id ?? null,
          booked_business: body.businessName,
        }, { onConflict: 'publication,issue,zone_id' })
    }

    // Build line items
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(basePrice * 100 / months),
          product_data: {
            name: `${zone.displayName} — ${body.publication}`,
            description: `${months} month${months !== 1 ? 's' : ''}: ${body.issues.join(', ')}${body.packageType === 'bundle' ? ' (Multi-Touch Bundle — 15% off)' : ''}`,
          },
        },
        quantity: months,
      },
    ]

    if (body.designHelp) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: DESIGN_HELP_PRICE,
          product_data: { name: 'Design Help', description: 'Custom ad graphic design by KeepSharing team' },
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: body.email,
      success_url: `${origin}/advertise/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/advertise`,
      metadata: {
        type:          'ad_booking',
        booking_id:    booking?.id ?? '',
        publication:   body.publication,
        zone_id:       body.zoneId,
        business_name: body.businessName,
        contact_name:  body.contactName ?? '',
        email:         body.email,
        phone:         body.phone ?? '',
      },
    })

    // Link stripe session to booking
    if (booking?.id) {
      await supabase
        .from('ad_bookings')
        .update({ stripe_session_id: session.id })
        .eq('id', booking.id)
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
