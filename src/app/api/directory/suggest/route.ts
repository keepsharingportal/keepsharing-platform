// POST /api/directory/suggest
// Public submission for a directory listing. Rate-limited per IP since
// this is a public write endpoint. No auth — anyone can suggest.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { ALL_MARKET_SLUGS } from '@/lib/markets'

export const runtime = 'nodejs'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // 10 submissions per IP per minute — enough headroom for legitimate
  // typo-and-retry, hard cap against scripted abuse.
  const allowed = await checkRateLimit({ scope: 'directory.suggest', req, max: 10 })
  if (!allowed) return NextResponse.json({ ok: false, error: 'too_many_requests' }, { status: 429 })

  let body: {
    brandSlug?:        string
    submitter_name?:   string | null
    submitter_email?:  string
    notes?:            string
    submitted_data?:   Record<string, unknown>
  }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }) }

  const brandSlug = body.brandSlug && ALL_MARKET_SLUGS.includes(body.brandSlug) ? body.brandSlug : 'rrp'
  const email     = (body.submitter_email ?? '').trim().toLowerCase()
  const notes     = (body.notes ?? '').trim()
  if (!email || !notes) return NextResponse.json({ ok: false, error: 'email_and_notes_required' }, { status: 400 })
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
  if (notes.length > 5000) return NextResponse.json({ ok: false, error: 'notes_too_long' }, { status: 400 })

  const db = adminDb()
  const { error } = await db.from('directory_suggestions').insert({
    brand_slug:      brandSlug,
    submitter_name:  body.submitter_name ?? null,
    submitter_email: email,
    notes,
    submitted_data:  body.submitted_data ?? {},
    status:          'pending',
  })
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json({ ok: false, error: 'migration_pending' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
