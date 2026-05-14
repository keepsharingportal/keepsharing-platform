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

  const supabase = supabaseAdmin()
  const { error } = await supabase.from('calendar_events').update(updates).eq('id', id)
  if (error) {
    console.error('[admin/calendar-events] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Public pages cache events for 15 min — refresh now when status flips
  if ('status' in updates) {
    revalidatePath('/calendar')
    revalidatePath('/')
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
