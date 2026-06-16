// POST /api/birthday/real-parties/submit
// Body: { submitter_name, submitter_email, child_name?, child_age?,
//         party_theme?, venue?, vendor_credits?[], caption, photo_url,
//         party_month?, party_year?, brand_slug? }
//
// UGC submission for the Real River Region Parties wall. Lands as
// status='pending' — editor moderates from /admin/birthday/real-parties
// before it appears on the public page.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface SubmissionBody {
  submitter_name?:  string
  submitter_email?: string
  child_name?:      string
  child_age?:       number
  party_theme?:     string
  venue?:           string
  vendor_credits?:  string[]
  caption?:         string
  photo_url?:       string
  party_month?:     number
  party_year?:      number
  brand_slug?:      string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as SubmissionBody

  if (!body.caption?.trim() || !body.photo_url?.trim()) {
    return NextResponse.json({ error: 'Caption and a photo are required.' }, { status: 400 })
  }
  if (body.submitter_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.submitter_email)) {
    return NextResponse.json({ error: 'Email looks invalid.' }, { status: 400 })
  }

  const supabase = sb()
  const { data, error } = await supabase.from('birthday_real_parties').insert({
    brand_slug:      body.brand_slug ?? 'rrp',
    submitter_name:  body.submitter_name?.trim() || null,
    submitter_email: body.submitter_email?.trim().toLowerCase() || null,
    child_name:      body.child_name?.trim() || null,
    child_age:       body.child_age ?? null,
    party_theme:     body.party_theme?.trim() || null,
    venue:           body.venue?.trim() || null,
    vendor_credits:  body.vendor_credits ?? [],
    caption:         body.caption.trim(),
    photo_url:       body.photo_url.trim(),
    party_month:     body.party_month ?? null,
    party_year:      body.party_year ?? null,
    status:          'pending',
  }).select('id').single()

  if (error) {
    console.error('[real-parties-submit]', error)
    return NextResponse.json({ error: 'Could not save your submission. Try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: (data as { id?: string })?.id })
}
