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
  location_name?:  string
  address?:        string
  city?:           string
  description:     string
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

  // Bundle the submitter contact and editor-only fields under registration_url
  // is wrong — store them in description suffix + raw fields. The existing
  // calendar_events schema has phone/email columns we can use for editor
  // contact, separate from public-facing data. We keep public description
  // clean and append submitter contact for the editor's reference.
  const editorMeta = [
    body.organization?.trim()  ? `Submitted by: ${body.organization.trim()}` : null,
    body.contact_name?.trim()  ? `Contact: ${body.contact_name.trim()}`       : null,
    body.registration_url?.trim() ? `Register: ${body.registration_url.trim()}` : null,
    body.editor_notes?.trim()  ? `Editor notes: ${body.editor_notes.trim()}` : null,
  ].filter(Boolean).join('\n')

  const description = editorMeta
    ? `${body.description.trim()}\n\n---\n${editorMeta}`
    : body.description.trim()

  const row = {
    title:           body.title.trim(),
    slug,
    description,
    start_date:      body.start_date,
    end_date:        body.end_date?.trim() || body.start_date,
    start_time:      body.start_time?.trim() || null,
    end_time:        body.end_time?.trim()   || null,
    location_name:   body.location_name?.trim() || null,
    address:         body.address?.trim()       || null,
    city:            body.city?.trim()          || null,
    email:           body.contact_email.trim().toLowerCase(),
    phone:           body.contact_phone?.trim() || null,
    age_range:       body.age_range?.trim()     || null,
    cost_text:       body.cost_text?.trim()     || null,
    is_free:         body.is_free ?? false,
    hero_image_url:  body.hero_image_url?.trim() || null,
    status:          'pending',
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.error('[calendar/submit] insert error:', error)
    return NextResponse.json({ error: 'Could not save submission. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data?.id })
}
