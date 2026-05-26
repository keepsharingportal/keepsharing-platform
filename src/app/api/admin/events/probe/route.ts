// POST /api/admin/events/probe
// Body: { source_id: string }
//
// Fetches the source's events_url, looks for an iCal feed (via inline links
// or common URL patterns), and — if found — saves the iCal URL onto the source
// row. Returns the candidates and notes so the operator knows what happened.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { probeForIcal } from '@/lib/calendar/ical-probe'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const body     = await req.json().catch(() => ({}))
  const sourceId = (body?.source_id as string | undefined) ?? ''
  if (!sourceId) return NextResponse.json({ error: 'source_id is required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data: src, error } = await supabase
    .from('trusted_event_sources')
    .select('id, name, events_url, ical_url')
    .eq('id', sourceId)
    .maybeSingle()

  if (error || !src) {
    return NextResponse.json({ error: error?.message ?? 'Source not found' }, { status: 404 })
  }

  const probe = await probeForIcal((src as { events_url: string }).events_url)

  // If we found a working feed and the source didn't have one, save it.
  // Also flip ingestion_method to 'ical' so the next "Run now" works.
  if (probe.found && probe.ical_url) {
    await supabase
      .from('trusted_event_sources')
      .update({ ical_url: probe.ical_url, ingestion_method: 'ical' })
      .eq('id', sourceId)
  }

  revalidatePath('/admin/events/sources')
  return NextResponse.json(probe)
}
