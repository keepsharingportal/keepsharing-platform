import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertContact } from '@/lib/ghl'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Save to Supabase
  try {
    const supabase = await createClient()
    await supabase.from('summer_guide_leads').insert({ email, source: 'summer-guide-2026' })
  } catch { /* non-blocking */ }

  // Tag in GHL as Summer Guide lead
  try {
    await upsertContact({
      publicationSlug: 'rrp',
      email,
      tags: ['summer-guide-2026', 'rrp-prospect'],
    })
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true })
}
