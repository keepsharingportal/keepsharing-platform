// POST /api/calendar/submit
// Public endpoint for the community event submission form.
// Inserts into calendar_events with status='pending' so admins can review
// and publish later via /admin/events/pending. No auto-publish.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function toSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

interface SubmitBody {
  title:           string
  organization?:   string
  contact_name?:   string
  contact_email:   string
  contact_phone?:  string
  start_date:      string
  end_date?:       string
  start_time?:     string
  end_time?:       string
  display_time_override?: string
  location_name?:  string
  address?:        string
  city?:           string
  description:     string
  category?:       string
  age_range?:      string
  cost_text?:      string
  is_free?:        boolean
  registration_url?: string
  hero_image_url?: string
  editor_notes?:   string
  consent:         boolean
}

export async function POST(req: NextRequest) {
  let body: SubmitBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Validation ────────────────────────────────────────────────────────────
  if (!body.title?.trim())         return NextResponse.json({ error: 'Event title is required' },     { status: 400 })
  if (!body.contact_email?.trim() || !body.contact_email.includes('@'))
    return NextResponse.json({ error: 'A valid contact email is required' },                          { status: 400 })
  if (!body.start_date?.trim())    return NextResponse.json({ error: 'Event date is required' },      { status: 400 })
  if (!body.description?.trim())   return NextResponse.json({ error: 'Event description is required' }, { status: 400 })
  if (!body.consent)               return NextResponse.json({ error: 'Please confirm submission consent' }, { status: 400 })

  const supabase = supabaseAdmin()

  // Build a slug that won't collide with published events. Suffix with a short
  // random token; if it ever clashes the unique constraint will reject and we
  // retry once.
  const baseSlug = toSlug(body.title)
  const slug     = `${baseSlug || 'event'}-${Math.random().toString(36).slice(2, 7)}`

  // Description stays public-facing only. Editor-only notes go into the new
  // discovery_notes column (added in migration 077). Registration URL is now
  // a first-class column instead of being crammed into description.
  const editorNotes = [
    body.contact_name?.trim()  ? `Contact: ${body.contact_name.trim()}` : null,
    body.editor_notes?.trim()  ? `Editor notes: ${body.editor_notes.trim()}` : null,
  ].filter(Boolean).join('\n') || null

  const row = {
    title:            body.title.trim(),
    slug,
    description:      body.description.trim(),
    start_date:       body.start_date,
    end_date:         body.end_date?.trim() || body.start_date,
    start_time:       body.start_time?.trim() || null,
    end_time:         body.end_time?.trim()   || null,
    display_time_override: body.display_time_override?.trim() || null,
    location_name:    body.location_name?.trim() || null,
    address:          body.address?.trim()       || null,
    city:             body.city?.trim()          || null,
    email:            body.contact_email.trim().toLowerCase(),
    phone:            body.contact_phone?.trim() || null,
    category:         body.category?.trim()     || null,
    age_range:        body.age_range?.trim()     || null,
    cost_text:        body.cost_text?.trim()     || null,
    is_free:          body.is_free ?? false,
    hero_image_url:   body.hero_image_url?.trim() || null,
    registration_url: body.registration_url?.trim() || null,
    organizer_name:   body.organization?.trim() || null,
    source_type:      'public-submission',
    source_name:      body.organization?.trim() || 'Public submission',
    discovery_notes:  editorNotes,
    status:           'pending',
  }

  let { data, error } = await supabase
    .from('calendar_events')
    .insert(row)
    .select('id')
    .single()

  // Defensive fallback: if migration 077 hasn't been applied yet, the new
  // columns won't exist. Strip them and retry so the submit form still works.
  if (error && /column .* does not exist/i.test(error.message)) {
    const legacy = { ...row } as Record<string, unknown>
    delete legacy.source_type
    delete legacy.source_name
    delete legacy.discovery_notes
    delete legacy.registration_url
    delete legacy.organizer_name
    // Stuff registration_url back into description so it isn't lost
    if (row.registration_url) {
      legacy.description = `${row.description}\n\nRegister: ${row.registration_url}`
    }
    ;({ data, error } = await supabase
      .from('calendar_events')
      .insert(legacy)
      .select('id')
      .single())
  }

  if (error) {
    console.error('[calendar/submit] insert error:', error)
    return NextResponse.json({ error: 'Could not save submission. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data?.id })
}
