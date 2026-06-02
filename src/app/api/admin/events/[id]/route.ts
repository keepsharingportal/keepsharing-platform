// PATCH /api/admin/events/[id]
//
// Action-based mutations from /admin/events. Mirrors the school-news API so
// the two admin surfaces feel identical to operators.
//
// JSON modes:
//   { action: 'approve' }                → status='published', stamps reviewed_at
//   { action: 'reject'  }                → status='rejected'
//   { action: 'cancel'  }                → status='cancelled' (hidden from public)
//   { action: 'reopen'  }                → status='pending' (back to review queue)
//   { action: 'edit', ...fields }        → patch allowed fields in place
//   { action: 're-crop', gravity: '…' }  → re-run hero crop from saved
//                                          original using a manual gravity
//                                          (one of 9 compass points or
//                                          'attention' / 'entropy' to re-run
//                                          auto-strategies).
//
// Multipart mode:
//   action=replace-image, image=<File>   → Calendar image pipeline (Sharp
//                                          attention crop) → storage → updates
//                                          hero_image_url + image_orig_path
//                                          + image_width + image_height.
//                                          Old objects are not garbage-collected
//                                          (matches school-news behaviour).
//
// DELETE soft-deletes: sets deleted_at + status='archived'. ?permanent=true
// hard-deletes (mostly for the trash UI later).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, type AdminContext } from '@/lib/admin/auth'
import {
  ALLOWED_TYPES, MAX_BYTES,
  processAndUpload, recropFromOriginal, isValidGravity,
  supabaseAdminForImages,
} from '@/lib/calendar/image-pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 60

const RICH_COLS = [
  'registration_url','organizer_name','organizer_email','tags',
  'is_featured','featured_until','source_type','source_name','source_url',
  'discovery_notes','recurrence_rule','reviewed_at','reviewed_by',
]

const ALLOWED_EDIT_FIELDS = new Set([
  'title','description','start_date','end_date','start_time','end_time',
  'location_name','address','city','email','phone','age_range','cost_text',
  'is_free','hero_image_url','category',
  // Rich
  'registration_url','organizer_name','organizer_email','tags','is_featured',
  'featured_until',
  'source_name','source_url','discovery_notes','recurrence_rule',
  'display_time_override',
])

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// Look up the event's market and reject if the caller can't act on it.
// Super-admins bypass. Returns null when the row is missing.
async function assertEventMarketAccess(id: string, ctx: AdminContext): Promise<NextResponse | null> {
  if (ctx.role === 'super') return null
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('market')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    // Market column missing — fail open (pre-migration safety) so the admin
    // can still operate on legacy events. Once migration 090 is applied this
    // branch stops being reachable.
    if (/column "market" does not exist/i.test(error.message)) return null
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  const market = (data as { market?: string }).market
  if (!market) return null // pre-migration row with NULL market
  if (!ctx.allowedMarkets.includes(market)) {
    return NextResponse.json(
      { error: `No access to market "${market}"` },
      { status: 403 },
    )
  }
  return null
}

interface JsonBody {
  action?: 'approve' | 'reject' | 'cancel' | 'reopen' | 'edit' | 're-crop'
  [k: string]: unknown
}

export async function PATCH(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let admin: AdminContext
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Reject before any work happens if the caller can't touch this event.
  const denial = await assertEventMarketAccess(id, admin)
  if (denial) return denial

  const contentType = req.headers.get('content-type') ?? ''

  // Multipart: replace-image
  if (contentType.includes('multipart/form-data')) {
    return handleReplaceImage(req, id)
  }

  const body = await req.json().catch(() => null) as JsonBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  // Manual re-crop reads the saved original and replaces just the hero —
  // no other DB columns change, so handle it before the generic patch path.
  if (body.action === 're-crop') {
    return handleRecrop(id, typeof body.gravity === 'string' ? body.gravity : undefined)
  }

  const supabase = supabaseAdmin()
  const now = new Date().toISOString()

  let patch: Record<string, unknown> = {}
  switch (body.action) {
    case 'approve':
      patch = { status: 'published', reviewed_at: now }
      break
    case 'reject':
      patch = { status: 'rejected', reviewed_at: now }
      break
    case 'cancel':
      patch = { status: 'cancelled', reviewed_at: now }
      break
    case 'reopen':
      patch = { status: 'pending', reviewed_at: null }
      break
    case 'edit': {
      for (const [k, v] of Object.entries(body)) {
        if (k === 'action') continue
        if (ALLOWED_EDIT_FIELDS.has(k)) patch[k] = v
      }
      // Clearing featured_until: '' means "indefinite", normalize to null
      // so the DB doesn't choke on an empty string in a TIMESTAMPTZ column.
      if (patch.featured_until === '') patch.featured_until = null
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
      }
      break
    }
    default:
      return NextResponse.json({ error: 'action must be approve | reject | cancel | reopen | edit | re-crop' }, { status: 400 })
  }

  let { error } = await supabase.from('calendar_events').update(patch).eq('id', id)
  if (error && /column .* does not exist/i.test(error.message)) {
    const fallback = { ...patch }
    for (const k of RICH_COLS) delete fallback[k]
    ;({ error } = await supabase.from('calendar_events').update(fallback).eq('id', id))
  }

  if (error) {
    console.error('[admin/events PATCH] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin/events/pending')
  revalidatePath('/calendar')
  revalidatePath('/')
  return NextResponse.json({ success: true, action: body.action })
}

// ── Replace-image handler ───────────────────────────────────────────────────
// One image per event. Runs the full calendar image pipeline so the saved
// original is available for future re-crops, and the hero gets the same
// attention-crop the QuickAdd path uses.
async function handleReplaceImage(req: NextRequest, id: string) {
  const supabase = supabaseAdminForImages()

  // Need the title so storage filenames stay legible.
  const titleRow = await supabase
    .from('calendar_events')
    .select('title')
    .eq('id', id)
    .maybeSingle()
  if (titleRow.error || !titleRow.data) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }
  const title = (titleRow.data as { title: string }).title

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Could not parse form data' }, { status: 400 })

  const file = form.get('image') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'image file is required' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Image too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 400 })
  }

  try {
    const buffer    = Buffer.from(await file.arrayBuffer())
    const processed = await processAndUpload({ supabase, buffer, title })

    // Persist all four image columns. If the schema doesn't have the new
    // ones yet (migration 092 not applied), retry with hero_image_url only.
    let upd = await supabase
      .from('calendar_events')
      .update({
        hero_image_url:  processed.hero_image_url,
        image_orig_path: processed.image_orig_path,
        image_width:     processed.image_width,
        image_height:    processed.image_height,
      })
      .eq('id', id)

    if (upd.error && /column .* does not exist/i.test(upd.error.message)) {
      upd = await supabase
        .from('calendar_events')
        .update({ hero_image_url: processed.hero_image_url })
        .eq('id', id)
    }

    if (upd.error) {
      console.error('[admin/events replace-image] update error:', upd.error)
      return NextResponse.json({ error: upd.error.message }, { status: 500 })
    }

    revalidatePath('/admin/events')
    revalidatePath('/calendar')
    return NextResponse.json({
      success:         true,
      hero_image_url:  processed.hero_image_url,
      image_orig_path: processed.image_orig_path,
      image_width:     processed.image_width,
      image_height:    processed.image_height,
    })
  } catch (e) {
    console.error('[admin/events replace-image] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// ── Manual re-crop handler ──────────────────────────────────────────────────
// Only the hero changes — the saved original stays put, image_width/height
// are unchanged because the hero variant is always 1200×750.
async function handleRecrop(id: string, gravity: string | undefined) {
  if (!gravity || !isValidGravity(gravity)) {
    return NextResponse.json(
      { error: 'gravity must be one of north|northeast|east|southeast|south|southwest|west|northwest|center|attention|entropy' },
      { status: 400 },
    )
  }
  const supabase = supabaseAdminForImages()

  const row = await supabase
    .from('calendar_events')
    .select('title, image_orig_path')
    .eq('id', id)
    .maybeSingle()
  if (row.error || !row.data) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 })
  }
  const { title, image_orig_path } = row.data as { title: string; image_orig_path: string | null }
  if (!image_orig_path) {
    return NextResponse.json(
      { error: 'No saved original — re-upload the image to enable re-crop on this event.' },
      { status: 400 },
    )
  }

  try {
    const { hero_image_url } = await recropFromOriginal({
      supabase,
      origPath: image_orig_path,
      title,
      gravity,
    })
    const { error } = await supabase
      .from('calendar_events')
      .update({ hero_image_url })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    revalidatePath('/admin/events')
    revalidatePath('/calendar')
    return NextResponse.json({ success: true, hero_image_url, gravity })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, routeCtx: { params: Promise<{ id: string }> }) {
  let admin: AdminContext
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const { id } = await routeCtx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const denial = await assertEventMarketAccess(id, admin)
  if (denial) return denial

  const url       = new URL(req.url)
  const permanent = url.searchParams.get('permanent') === 'true'
  const supabase  = supabaseAdmin()

  if (permanent) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Soft delete; fall back to hard delete if deleted_at column missing.
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

  revalidatePath('/admin/events')
  revalidatePath('/calendar')
  return NextResponse.json({ success: true, permanent })
}
