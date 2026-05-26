// PATCH /api/admin/school-news/[id]
//
// Two intake modes:
//   1. application/json  — action-based mutations
//        { action: 'approve' | 'reject' | 'edit' | 'reopen',
//          title?, blurb?, reviewer_notes?, issue_month?, published_at? }
//
//        approve → status='approved' + published_at preserved or stamped now
//        reject  → status='rejected' + reviewer_notes
//        edit    → updates title/blurb/issue_month/published_at in place
//                  (no status change). Works on any status, so an editor can
//                  fix a typo on a published bit without re-approving.
//        reopen  → status='pending' (move an approved/rejected bit back to
//                  the review queue, e.g. to re-evaluate)
//
//   2. multipart/form-data — replace-image action
//        action=replace-image, image=<File>
//        Re-runs the Sharp pipeline (with the attention crop the original
//        bit may have missed) and points the bit at the new images. Old
//        storage objects stay; no cleanup. school_bit_images rows are
//        replaced so the lightbox/print picks up the new set.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
  processAndUpload, supabaseAdminForImages, persistBitImages,
  recropFromOriginal, isValidGravity,
  ALLOWED_TYPES, MAX_BYTES,
} from '@/lib/school-news/image-pipeline'

export const runtime  = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface JsonBody {
  action?:         'approve' | 'reject' | 'edit' | 'reopen' | 're-crop'
  title?:          string
  blurb?:          string
  reviewer_notes?: string
  issue_month?:    string | null
  // Backfill + scheduling support on edit. ISO string or YYYY-MM-DD.
  published_at?:   string | null
  // re-crop only: one of the 9 compass positions, or 'attention'/'entropy'
  // to re-run the auto strategies. Validated via isValidGravity().
  gravity?:        string
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const contentType = req.headers.get('content-type') ?? ''

  // ── Multipart: replace-image flow ──────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    return handleReplaceImage(req, id)
  }

  const body = await req.json().catch(() => null) as JsonBody | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  // Manual focal-point re-crop. Doesn't touch the row apart from
  // image_web_url, so handle it before the generic patch builder.
  if (body.action === 're-crop') {
    return handleRecrop(id, body.gravity)
  }

  const supabase = supabaseAdmin()
  const now = new Date().toISOString()

  let patch: Record<string, unknown> = {}
  switch (body.action) {
    case 'approve': {
      // Preserve a backdated published_at if the operator already set one
      // at Quick-Add time (backfill workflow). Otherwise stamp it now.
      const { data: existing } = await supabase
        .from('school_bits')
        .select('published_at')
        .eq('id', id)
        .maybeSingle()
      const existingPublishedAt = (existing as { published_at: string | null } | null)?.published_at
      patch = {
        status:       'approved',
        reviewed_at:  now,
        published_at: existingPublishedAt ?? now,
      }
      if (body.reviewer_notes !== undefined) patch.reviewer_notes = body.reviewer_notes
      break
    }
    case 'reject':
      patch = { status: 'rejected', reviewed_at: now, reviewer_notes: body.reviewer_notes ?? null }
      break
    case 'reopen':
      // Move back to pending — useful when an approved or rejected bit
      // needs another look. Doesn't touch published_at; that survives the
      // round-trip so a re-approval keeps the original publish time.
      patch = { status: 'pending', reviewed_at: null, reviewer_notes: null }
      break
    case 'edit':
      if (body.title !== undefined)       patch.title        = body.title.trim()
      if (body.blurb !== undefined)       patch.blurb        = body.blurb.trim()
      if (body.issue_month !== undefined) patch.issue_month  = body.issue_month
      // published_at: '' means "clear it"; otherwise parse + validate.
      if (body.published_at !== undefined) {
        if (body.published_at === null || body.published_at === '') {
          patch.published_at = null
        } else {
          const d = new Date(body.published_at)
          if (isNaN(d.getTime())) {
            return NextResponse.json({ error: 'published_at must be a valid date (YYYY-MM-DD or ISO)' }, { status: 400 })
          }
          patch.published_at = d.toISOString()
        }
      }
      if (Object.keys(patch).length === 0)  return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
      break
    default:
      return NextResponse.json({ error: 'action must be approve | reject | edit | reopen | re-crop' }, { status: 400 })
  }

  const { error } = await supabase
    .from('school_bits')
    .update(patch)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/school-news')
  revalidatePath('/family-resource-guide')
  revalidatePath('/school-zone')
  return NextResponse.json({ success: true, action: body.action })
}

// ── Re-crop handler ───────────────────────────────────────────────────────────
// Re-runs the card crop from the saved original with a manually-chosen
// gravity. No new upload — uses the file we already have in BUCKET_ORIG.
// Only the card variant (16:10 feed image) changes; the natural-aspect web
// variant and the print JPEG don't depend on gravity.
async function handleRecrop(id: string, gravity?: string) {
  if (!gravity || !isValidGravity(gravity)) {
    return NextResponse.json({ error: 'gravity must be one of north|northeast|east|southeast|south|southwest|west|northwest|center|attention|entropy' }, { status: 400 })
  }
  const supabase = supabaseAdminForImages()

  const { data: bit } = await supabase
    .from('school_bits')
    .select('id, school_name, image_orig_path')
    .eq('id', id)
    .maybeSingle()
  if (!bit) return NextResponse.json({ error: 'bit not found' }, { status: 404 })
  const row = bit as { school_name: string; image_orig_path: string | null }
  if (!row.image_orig_path) {
    return NextResponse.json({ error: 'this bit has no saved original to re-crop' }, { status: 400 })
  }

  try {
    const { image_card_url } = await recropFromOriginal({
      supabase,
      origPath:   row.image_orig_path,
      schoolName: row.school_name,
      gravity,
    })

    // Update the row's card URL. The hero row in school_bit_images also
    // tracks card_url for the lightbox thumbnails — keep it in sync if
    // the table exists.
    const { error: updErr } = await supabase
      .from('school_bits')
      .update({ image_web_url: image_card_url })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Best-effort sync of the hero row in school_bit_images
    await supabase
      .from('school_bit_images')
      .update({ card_url: image_card_url })
      .eq('bit_id', id)
      .eq('is_hero', true)

    revalidatePath('/admin/school-news')
    revalidatePath('/family-resource-guide')
    revalidatePath('/school-zone')
    revalidatePath('/school-bits')
    return NextResponse.json({ success: true, image_web_url: image_card_url, gravity })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// ── Replace-image handler ─────────────────────────────────────────────────────
// Multipart with a single `image` file. Re-runs the Sharp pipeline (attention
// crop) and points the bit at the new image. Used to fix bits whose original
// crop misses the subject — the locker-photo problem.
async function handleReplaceImage(req: NextRequest, id: string) {
  const supabase = supabaseAdminForImages()

  // Need the school_name so the storage path matches the original convention.
  const { data: bit } = await supabase
    .from('school_bits')
    .select('id, school_name')
    .eq('id', id)
    .maybeSingle()
  if (!bit) return NextResponse.json({ error: 'bit not found' }, { status: 404 })

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
    const buffer = Buffer.from(await file.arrayBuffer())
    const processed = await processAndUpload({
      supabase,
      buffer,
      schoolName: (bit as { school_name: string }).school_name,
    })

    // Point the row at the new image
    const { error: updErr } = await supabase
      .from('school_bits')
      .update({
        image_web_url:   processed.image_card_url,
        image_orig_path: processed.image_orig_path,
        image_width:     processed.image_width,
        image_height:    processed.image_height,
      })
      .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Replace the school_bit_images set so the lightbox + print export
    // pick up the new image instead of layering it onto the old gallery.
    await supabase.from('school_bit_images').delete().eq('bit_id', id)
    await persistBitImages(supabase, id, [processed])

    revalidatePath('/admin/school-news')
    revalidatePath('/family-resource-guide')
    revalidatePath('/school-zone')
    return NextResponse.json({ success: true, image_web_url: processed.image_card_url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  const { error } = await supabase.from('school_bits').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin/school-news')
  return NextResponse.json({ success: true })
}
