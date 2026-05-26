// POST /api/school-bits/submit
//
// Public endpoint used by /school-bits/submit (the school-news submission form
// that lives on the public site for schools/parents to post their own news).
//
// Multipart body:
//   image:              File (required)         — the photo
//   school_id:          string (required)       — which school the bit is for
//   title:              string (required)       — headline
//   blurb:              string (required)       — body text
//   submitted_by_name:  string (required)       — submitter name
//   submitted_by_email: string (required)       — submitter email (so we can follow up)
//   source_url:         string (optional)       — FB post URL if pasted from social
//   source_type:        string (optional)       — defaults to 'public_form'
//   issue_month:        string (optional)       — YYYY-MM target print issue
//
// Image processing is shared with the admin Quick Add path; both routes call
// into src/lib/school-news/image-pipeline.ts. The pipeline produces a web
// WebP (~1200px) in the public bucket + a high-res JPEG (~2400px, sRGB w/
// EXIF) in the private bucket for InDesign print export.

import { NextRequest, NextResponse } from 'next/server'
import {
  processAndUpload, supabaseAdminForImages, persistBitImages,
  ALLOWED_TYPES, MAX_BYTES, type ProcessedImage,
} from '@/lib/school-news/image-pipeline'

const MAX_IMAGES_PER_BIT = 3

export const runtime  = 'nodejs'
export const maxDuration = 60

const MARKET = 'rrp'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    // Up to 3 images — image (hero), image2, image3. Hero is required.
    const files: File[] = []
    for (const key of ['image', 'image2', 'image3']) {
      const f = form.get(key) as File | null
      if (f && f.size > 0) files.push(f)
    }
    const schoolId          = (form.get('school_id')          as string | null)?.trim() ?? ''
    const title             = (form.get('title')              as string | null)?.trim() ?? ''
    const blurb             = (form.get('blurb')              as string | null)?.trim() ?? ''
    const submittedByName   = (form.get('submitted_by_name')  as string | null)?.trim() ?? ''
    const submittedByEmail  = (form.get('submitted_by_email') as string | null)?.trim() ?? ''
    const sourceUrl         = (form.get('source_url')         as string | null)?.trim() || null
    const sourceType        = (form.get('source_type')        as string | null)?.trim() || 'public_form'
    const issueMonth        = (form.get('issue_month')        as string | null)?.trim() || null

    if (!schoolId) return NextResponse.json({ error: 'school_id is required' }, { status: 400 })
    if (!title)    return NextResponse.json({ error: 'title is required'     }, { status: 400 })
    if (!blurb)    return NextResponse.json({ error: 'blurb is required'     }, { status: 400 })
    if (!submittedByName)  return NextResponse.json({ error: 'submitted_by_name is required'  }, { status: 400 })
    if (!submittedByEmail) return NextResponse.json({ error: 'submitted_by_email is required' }, { status: 400 })
    if (issueMonth && !/^\d{4}-\d{2}$/.test(issueMonth)) {
      return NextResponse.json({ error: 'issue_month must be YYYY-MM' }, { status: 400 })
    }

    const supabase = supabaseAdminForImages()

    // Resolve the school so we can snapshot its name onto the bit
    const { data: schoolRow, error: schoolErr } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .maybeSingle()
    if (schoolErr || !schoolRow) {
      return NextResponse.json({ error: 'school_id not found' }, { status: 404 })
    }
    const schoolName = (schoolRow as { name: string }).name

    // Image processing — public form requires at least one image
    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one photo is required for public submissions' }, { status: 400 })
    }
    if (files.length > MAX_IMAGES_PER_BIT) {
      return NextResponse.json({ error: `Too many photos (max ${MAX_IMAGES_PER_BIT} per bit)` }, { status: 400 })
    }
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: `Unsupported image type: ${file.type}. Use JPEG, PNG, WebP, HEIC, GIF, or AVIF.` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `One of your images is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB per image.` }, { status: 400 })
      }
    }

    // Process all images in parallel — Sharp pipelines are CPU-bound but each
    // call is independent so we save real wall-clock time on multi-image bits.
    let processed: ProcessedImage[]
    try {
      processed = await Promise.all(files.map(async file => {
        const buffer = Buffer.from(await file.arrayBuffer())
        return processAndUpload({ supabase, buffer, schoolName })
      }))
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
    }

    // Insert the pending bit (image_web_url + image_orig_path snapshot the hero
    // so existing read paths keep working; persistBitImages fills the rest)
    const hero = processed[0]
    const { data: bit, error: insertErr } = await supabase
      .from('school_bits')
      .insert({
        market:             MARKET,
        school_id:          schoolId,
        school_name:        schoolName,
        title,
        blurb,
        image_web_url:      hero.image_card_url,    // card-cropped for feeds
        image_orig_path:    hero.image_orig_path,
        image_width:        hero.image_width,
        image_height:       hero.image_height,
        source_type:        sourceType,
        source_url:         sourceUrl,
        submitted_by_name:  submittedByName,
        submitted_by_email: submittedByEmail,
        issue_month:        issueMonth,
        status:             'pending',
      })
      .select('id')
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Persist every image (including the hero) into school_bit_images for the
    // lightbox/gallery + print export to pick up
    await persistBitImages(supabase, (bit as { id: string }).id, processed)

    // Fire-and-forget notification webhook (don't block submission on it)
    fireSubmissionNotification({
      bit_id:           (bit as { id: string }).id,
      school_name:      schoolName,
      title,
      submitted_by:     submittedByName,
      submitter_email:  submittedByEmail,
    }).catch(e => console.warn('[school-bits submit] notify failed:', e))

    return NextResponse.json({ success: true, bit_id: (bit as { id: string }).id })
  } catch (e) {
    console.error('[school-bits submit] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// ── Notification (Slack/GHL webhook OR email) ───────────────────────────────
// Sends a thin notification so the editor knows to review the queue. NEVER
// attaches the image — files stay in Supabase Storage, editor clicks through
// to /admin/school-news to view and decide.

async function fireSubmissionNotification(payload: {
  bit_id:          string
  school_name:     string
  title:           string
  submitted_by:    string
  submitter_email: string
}) {
  const url = process.env.SCHOOL_BITS_NOTIFICATION_WEBHOOK_URL
            || process.env.GHL_NEWSLETTER_WEBHOOK_URL
  if (!url) return // configured-optional — silently no-op so dev/local doesn't error

  const adminLink = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com')
                  + '/admin/school-news'

  await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event:           'school_bit.submitted',
      bit_id:          payload.bit_id,
      school_name:     payload.school_name,
      title:           payload.title,
      submitted_by:    payload.submitted_by,
      submitter_email: payload.submitter_email,
      admin_review_url: adminLink,
      message:         `📣 New School Bit from ${payload.school_name}: "${payload.title}" — submitted by ${payload.submitted_by} (${payload.submitter_email}). Review: ${adminLink}`,
    }),
  })
}
