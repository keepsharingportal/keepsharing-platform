// PATCH /api/admin/calendar-events/[id]
// Approve, reject, or edit a calendar event submission.
// Used by /admin/events/pending review queue.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

const ALLOWED_FIELDS = new Set([
  'title', 'description', 'start_date', 'end_date', 'start_time', 'end_time',
  'location_name', 'address', 'city', 'email', 'phone', 'age_range',
  'cost_text', 'is_free', 'hero_image_url', 'category', 'status',
  // Added in migration 077 — first-class fields that used to live in description
  'registration_url', 'organizer_name', 'organizer_email', 'tags',
  'is_featured', 'featured_until',
  // Reviewer audit
  'reviewed_by', 'reviewed_at',
])

const ALLOWED_STATUSES = new Set(['pending', 'published', 'rejected', 'archived'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) updates[k] = v
  }
  if ('status' in updates && !ALLOWED_STATUSES.has(updates.status as string)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 })
  }

  // Auto-stamp reviewed_at if status is changing (and reviewer isn't already set in the payload)
  if ('status' in updates && !('reviewed_at' in updates)) {
    updates.reviewed_at = new Date().toISOString()
  }

  const supabase = supabaseAdmin()

  // Defensive: migration 077 introduced several new columns. If it hasn't
  // been applied, strip the new fields and retry once so the queue still works.
  let { error } = await supabase.from('calendar_events').update(updates).eq('id', id)
  if (error && /column .* does not exist/i.test(error.message)) {
    const fallback = { ...updates }
    for (const k of ['registration_url','organizer_name','organizer_email','tags','is_featured','featured_until','reviewed_by','reviewed_at']) {
      delete fallback[k]
    }
    ;({ error } = await supabase.from('calendar_events').update(fallback).eq('id', id))
  }

  if (error) {
    console.error('[admin/calendar-events] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Public pages cache events — refresh now on any save so edits go live.
  revalidatePath('/calendar')
  revalidatePath('/')

  return NextResponse.json({ success: true })
}

// DELETE — soft delete (move to trash) by default, ?permanent=true hard-deletes.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const url       = new URL(req.url)
  const permanent = url.searchParams.get('permanent') === 'true'
  const supabase  = supabaseAdmin()

  if (permanent) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Try soft delete; fall back to hard delete if deleted_at column missing.
    const { error } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id)
    if (error && /column .* does not exist/i.test(error.message)) {
      const { error: e2 } = await supabase.from('calendar_events').delete().eq('id', id)
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  revalidatePath('/calendar')
  revalidatePath('/')
  return NextResponse.json({ success: true, permanent })
}
