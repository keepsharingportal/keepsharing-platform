// POST /api/birthday/subscribe
// Body: { email, child_first_name?, party_date?, source, brand_slug? }
//
// Captures email signups from the planning timeline, freebies block,
// printables unlock, and newsletter widget. Idempotent on (brand,
// email, source). The drip cron (Phase B) reads party_date to fire
// 6-week / 4-week / 2-week / week-of reminders.

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

const ALLOWED_SOURCES = ['timeline-checklist', 'freebies', 'newsletter']

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    email?:             string
    child_first_name?:  string | null
    party_date?:        string | null
    source?:            string
    brand_slug?:        string
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  // Allow source = ALLOWED_SOURCES OR a printables:<id> identifier.
  const source = body.source ?? 'newsletter'
  if (!ALLOWED_SOURCES.includes(source) && !source.startsWith('printables:')) {
    return NextResponse.json({ error: 'Unknown source.' }, { status: 400 })
  }

  const supabase = sb()
  const { error } = await supabase.from('birthday_planning_subscribers').upsert({
    brand_slug:       body.brand_slug ?? 'rrp',
    email,
    child_first_name: body.child_first_name?.trim() || null,
    party_date:       body.party_date || null,
    source,
    is_active:        true,
  }, { onConflict: 'brand_slug,email,source' })

  if (error) {
    console.error('[birthday-subscribe]', error)
    return NextResponse.json({ error: 'Could not save your signup. Try again.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
