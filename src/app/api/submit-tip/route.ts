// POST /api/submit-tip — a mom submitting a recommendation that feeds
// the editorial pipeline for future Best-Of lists.
//
// Light validation; service-role write (the public table has RLS for
// inserts only, no read).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    const recommendation = (body.recommendation as string | undefined)?.trim()
    if (!recommendation || recommendation.length < 3) {
      return NextResponse.json({ error: 'Please tell us a little more.' }, { status: 400 })
    }
    if (recommendation.length > 2000) {
      return NextResponse.json({ error: 'Keep it under 2000 characters.' }, { status: 400 })
    }

    const referer = req.headers.get('referer')
    let sourcePage: string | null = null
    if (referer) {
      try { sourcePage = new URL(referer).pathname } catch { /* malformed */ }
    }

    const supabase = admin()
    const { error } = await supabase.from('submitted_tips').insert({
      category:       (body.category       as string | null) ?? null,
      town:           (body.town           as string | null) ?? null,
      business_name:  (body.business_name  as string | null) ?? null,
      recommendation,
      submitter_name: (body.submitter_name as string | null) ?? null,
      submitter_email:(body.submitter_email as string | null) ?? null,
      source_page:    sourcePage,
    })

    if (error) {
      console.error('[submit-tip] insert error:', error.message)
      return NextResponse.json({ error: 'Could not save tip. Try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
