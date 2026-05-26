// POST /api/admin/events/extract/save
// Body: { events: ExtractedEvent[], source_id?: string, source_name?: string, source_url?: string }
//
// Takes events the operator approved (after AI extraction + manual review)
// and inserts them as status='pending' so they still go through the normal
// approval queue. Source attribution is set so it's clear where they came from.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { ExtractedEvent } from '@/lib/calendar/ai-extractor'
import { fetchOgImage } from '@/lib/calendar/og-image'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'event'
}

interface SaveBody {
  events:      ExtractedEvent[]
  source_id?:  string
  source_name?: string
  source_url?: string
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as SaveBody | null
  if (!body || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: '"events" array is required' }, { status: 400 })
  }

  const supabase  = supabaseAdmin()
  const sourceId  = body.source_id ?? null
  const sourceUrl = body.source_url ?? null
  let sourceName  = body.source_name ?? null

  // If a source_id is provided, pull the canonical name from the source row.
  if (sourceId) {
    const { data: src } = await supabase
      .from('trusted_event_sources')
      .select('name, events_url')
      .eq('id', sourceId)
      .maybeSingle()
    if (src) {
      sourceName = (src as { name?: string }).name ?? sourceName
    }
  }

  const inserted: string[] = []
  const errors:   string[] = []

  for (const ev of body.events) {
    if (!ev.title?.trim() || !ev.start_date?.trim()) {
      errors.push(`Skipped event with missing title or date: ${ev.title ?? '(no title)'}`)
      continue
    }

    const baseSlug = toSlug(ev.title)
    const slug     = `${baseSlug}-${ev.start_date}-${Math.random().toString(36).slice(2, 6)}`

    // Try to pull an OG image from the registration URL or the event's own
    // source URL. Failures are silent.
    let heroImageUrl: string | null = null
    const imageSource = ev.registration_url?.trim() || ev.source_url?.trim()
    if (imageSource) {
      try { heroImageUrl = await fetchOgImage(imageSource) } catch { /* ignore */ }
    }

    const row = {
      title:               ev.title.trim(),
      slug,
      description:         ev.description?.trim() || null,
      start_date:          ev.start_date,
      end_date:            ev.end_date?.trim() || ev.start_date,
      start_time:          ev.start_time?.trim() || null,
      end_time:            ev.end_time?.trim()   || null,
      location_name:       ev.location_name?.trim() || null,
      address:             ev.address?.trim()       || null,
      city:                ev.city?.trim()          || null,
      is_free:             ev.is_free ?? false,
      cost_text:           ev.cost_text?.trim()     || null,
      age_range:           ev.age_range?.trim()     || null,
      registration_url:    ev.registration_url?.trim() || null,
      organizer_name:      ev.organizer_name?.trim()   || sourceName,
      hero_image_url:      heroImageUrl,
      source_type:         'ai-extraction',
      source_name:         sourceName ?? 'AI extraction',
      source_url:          ev.source_url?.trim() || sourceUrl,
      discovery_notes:     ev.confidence_notes?.trim() || null,
      status:              'pending',
    }

    const { error } = await supabase.from('calendar_events').insert(row).select('id').single()
    if (error) {
      errors.push(`${ev.title}: ${error.message}`)
    } else {
      inserted.push(ev.title.trim())
    }
  }

  if (sourceId && inserted.length > 0) {
    await supabase.from('trusted_event_sources').update({
      last_ingested_at:    new Date().toISOString(),
      last_ingested_count: inserted.length,
    }).eq('id', sourceId)
  }

  revalidatePath('/admin/events/pending')
  revalidatePath('/admin/events/sources')

  return NextResponse.json({
    success:   true,
    inserted:  inserted.length,
    skipped:   body.events.length - inserted.length,
    errors,
  })
}
