import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

// ── Rate card ─────────────────────────────────────────────────────────────────
const RATE_CARD: Record<string, Record<number, number>> = {
  full:    { 1: 937,  3: 863,  6: 797,  12: 747,  18: 697  },
  half:    { 1: 637,  3: 573,  6: 537,  12: 497,  18: 447  },
  quarter: { 1: 453,  3: 407,  6: 377,  12: 337,  18: 297  },
  sixth:   { 1: 327,  3: 297,  6: 263,  12: 223,  18: 197  },
  web:     { 1: 275,  3: 245,  6: 220,  12: 195,  18: 175  },
}

function getBracket(n: number): number {
  if (n <= 1)  return 1
  if (n <= 3)  return 3
  if (n <= 6)  return 6
  if (n <= 12) return 12
  return 18
}

function getMonthlyRate(adSize: string, n: number): number {
  const table = RATE_CARD[adSize] ?? RATE_CARD.sixth
  return table[getBracket(n)] ?? 0
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${NAMES[m - 1]} ${y}`
}

// ── GET /api/bookings?pub=RRP — return active bookings for availability overlay ─
export async function GET(req: NextRequest) {
  const pub = req.nextUrl.searchParams.get('pub') ?? 'RRP'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('ad_size, ad_position, months, business_name, status')
      .eq('publication_abbrev', pub.toUpperCase())
      .in('status', ['pending', 'confirmed'])

    if (error) throw error
    return NextResponse.json({ bookings: data ?? [] })
  } catch {
    return NextResponse.json({ bookings: [] })
  }
}

// ── POST /api/bookings — create booking record + Stripe checkout session ──────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      publicationSlug: string
      adSize: string
      adPosition: string
      months: string[]
      businessName: string
      contactFirstName: string
      contactLastName?: string
      email: string
      phone?: string
      website?: string
      designHelp: boolean
      graphicUrl?: string
    }

    // ── Validate ────────────────────────────────────────────────────────────────
    if (!body.adSize || !body.adPosition || !body.months?.length || !body.email || !body.businessName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const n            = body.months.length
    const monthlyRate  = getMonthlyRate(body.adSize, n)
    const subtotal     = monthlyRate * n
    const designFee    = body.designHelp ? 150 : 0
    const total        = subtotal + designFee

    // ── Look up publication ID ──────────────────────────────────────────────────
    const supabase = await createClient()
    const pubAbbrev = body.publicationSlug.toUpperCase() === 'RRP' ? 'RRP'
      : body.publicationSlug.toUpperCase()
    const { data: pub } = await supabase
      .from('publications')
      .select('id, abbrev')
      .eq('abbrev', pubAbbrev)
      .maybeSingle()

    // ── Conflict check ──────────────────────────────────────────────────────────
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('publication_abbrev', pubAbbrev)
      .eq('ad_size', body.adSize)
      .eq('ad_position', body.adPosition)
      .in('status', ['pending', 'confirmed'])
      .overlaps('months', body.months)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'One or more selected months are already booked for this position.' }, { status: 409 })
    }

    // ── Insert pending booking ──────────────────────────────────────────────────
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        publication_id:      pub?.id ?? null,
        publication_abbrev:  pubAbbrev,
        advertiser_email:    body.email,
        business_name:       body.businessName,
        contact_first_name:  body.contactFirstName,
        contact_last_name:   body.contactLastName ?? null,
        phone:               body.phone ?? null,
        website:             body.website ?? null,
        ad_size:             body.adSize,
        ad_position:         body.adPosition,
        months:              body.months,
        term_length:         n,
        monthly_rate:        monthlyRate,
        total,
        design_help:         body.designHelp,
        graphic_url:         body.graphicUrl ?? null,
        status:              'pending',
      })
      .select('id')
      .single()

    if (bookErr || !booking) {
      console.error('[bookings] insert error:', bookErr?.message)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // ── Build Stripe line items ─────────────────────────────────────────────────
    const adSizeLabel = body.adSize.charAt(0).toUpperCase() + body.adSize.slice(1)
    const monthsLabel = body.months.map(fmtMonth).join(', ')

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: any[] = [
      {
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(monthlyRate * 100),
          product_data: {
            name:        `${adSizeLabel} Page — River Region Parents`,
            description: `${n} month${n !== 1 ? 's' : ''}: ${monthsLabel}`,
          },
        },
        quantity: n,
      },
    ]

    if (body.designHelp) {
      lineItems.push({
        price_data: {
          currency:    'usd',
          unit_amount: 15000,
          product_data: { name: 'Ad Design Help', description: 'Custom ad graphic designed by KeepSharing team' },
        },
        quantity: 1,
      })
    }

    // ── Create Stripe session ───────────────────────────────────────────────────
    const includeJune = body.months.includes('2026-06')

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           lineItems,
      mode:                 'payment',
      customer_email:       body.email,
      success_url:          `${origin}/advertise/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${origin}/advertise`,
      metadata: {
        type:              'spot_booking',
        booking_id:        booking.id,
        publication:       pubAbbrev,
        ad_size:           body.adSize,
        ad_position:       body.adPosition,
        months:            body.months.join(','),
        business_name:     body.businessName,
        first_name:        body.contactFirstName,
        last_name:         body.contactLastName ?? '',
        email:             body.email,
        phone:             body.phone ?? '',
        include_june_2026: includeJune ? 'true' : 'false',
      },
    })

    // Link stripe session ID
    await supabase.from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id)

    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[bookings POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
