// POST /api/best-of/suggest
// Public endpoint — receives Best Of nominations from the FRG masthead
// "Suggest a Best Of" form. Inserts as status='pending' for editorial
// review. No auth; protected from spam by length checks + a soft honeypot.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MARKET = 'rrp'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Body {
  category?:           string
  nominee_name?:       string
  reason?:             string
  submitted_by_name?:  string
  submitted_by_email?: string
  /** Honeypot — real users never fill this. */
  website?:            string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  // Honeypot — return 200 so bots think it succeeded
  if (body.website && body.website.trim()) {
    return NextResponse.json({ success: true })
  }

  const category     = (body.category     ?? '').trim()
  const nomineeName  = (body.nominee_name ?? '').trim()
  const reason       = (body.reason       ?? '').trim() || null
  const submitterName  = (body.submitted_by_name  ?? '').trim() || null
  const submitterEmail = (body.submitted_by_email ?? '').trim() || null

  if (!category || category.length > 120) {
    return NextResponse.json({ error: 'Category is required (max 120 chars)' }, { status: 400 })
  }
  if (!nomineeName || nomineeName.length > 200) {
    return NextResponse.json({ error: 'Nominee name is required (max 200 chars)' }, { status: 400 })
  }
  if (reason && reason.length > 2000) {
    return NextResponse.json({ error: 'Reason is too long (max 2000 chars)' }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('best_of_suggestions')
    .insert({
      market:             MARKET,
      category,
      nominee_name:       nomineeName,
      reason,
      submitted_by_name:  submitterName,
      submitted_by_email: submitterEmail,
      status:             'pending',
    })
    .select('id')
    .single()

  if (error) {
    // Common case: migration 088 hasn't been applied yet
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return NextResponse.json({ error: 'Submissions are not enabled yet. Try again soon.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data!.id, success: true })
}
