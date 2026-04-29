import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      firstName: string
      lastName?: string
      businessName: string
      email: string
      phone?: string
      businessType?: string
      interests?: string[]
      notes?: string
    }

    if (!body.firstName || !body.businessName || !body.email) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('advertiser_leads')
      .insert({
        first_name:    body.firstName,
        last_name:     body.lastName ?? null,
        business_name: body.businessName,
        email:         body.email,
        phone:         body.phone ?? null,
        business_type: body.businessType ?? null,
        interests:     body.interests ?? [],
        notes:         body.notes ?? null,
        status:        'lead',
        source:        'self_serve_web',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // Still return success — don't block the user flow if DB isn't configured
    console.error('Lead save error:', msg)
    return NextResponse.json({ id: null, warning: 'DB not configured' })
  }
}
