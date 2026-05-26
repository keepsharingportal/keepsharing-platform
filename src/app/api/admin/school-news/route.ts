// POST /api/admin/school-news
//
// Two intake modes (matches the existing /api/admin/upload pattern):
//
//   1. multipart/form-data
//        image:              File (optional) — direct upload from Quick Add
//        school_id:          string (required)
//        title:              string (required)
//        blurb:              string (required)
//        source_url:         string (optional) — e.g., FB post URL
//        source_type:        string (optional)
//        issue_month:        string (optional, YYYY-MM)
//
//   2. application/json
//        Same fields as above, plus:
//        image_url:          string (optional) — operator pastes an image URL
//                            (often a public CDN link from a Facebook post).
//                            Server downloads it and reprocesses through Sharp.
//
// Both paths produce dual-bucket storage (web WebP + print JPEG) when an
// image is present, and insert a pending school_bit row.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import {
  processAndUpload, fetchImageFromUrl, supabaseAdminForImages, persistBitImages,
  ALLOWED_TYPES, MAX_BYTES, type ProcessedImage,
} from '@/lib/school-news/image-pipeline'

const MAX_IMAGES_PER_BIT = 3

export const runtime  = 'nodejs'
export const maxDuration = 60

const MARKET = 'rrp'
const VALID_SOURCES = ['public_form', 'staff_manual', 'staff_facebook', 'staff_email'] as const

interface ResolvedSchool { id: string; name: string }

async function resolveSchool(supabase: ReturnType<typeof supabaseAdminForImages>, schoolId: string | null, schoolName: string | null): Promise<ResolvedSchool | { error: string; status: number }> {
  if (schoolId) {
    const { data } = await supabase.from('schools').select('id, name').eq('id', schoolId).maybeSingle()
    if (!data) return { error: 'school_id not found', status: 404 }
    return data as ResolvedSchool
  }
  if (schoolName) {
    const { data } = await supabase.from('schools').select('id, name')
      .eq('market', MARKET).ilike('name', schoolName).maybeSingle()
    if (data) return data as ResolvedSchool
    // Fallback: return the typed name only — no row to link to. Snapshot-only.
    return { id: '', name: schoolName }
  }
  return { error: 'school_id or school_name is required', status: 400 }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  // Parse into a single normalized shape regardless of intake mode
  let payload: {
    school_id?:          string
    school_name?:        string
    title?:              string
    blurb?:              string
    source_url?:         string
    source_type?:        string
    submitted_by_name?:  string
    submitted_by_email?: string
    issue_month?:        string
    // Backfill helpers — operator can backdate so the bit sorts in time order
    published_at?:       string
    // Status: 'pending' (default — needs moderation) or 'approved' (staff
    // publishing directly, skipping the queue). The public submission form
    // always lands as 'pending'; the admin Quick Add defaults to 'approved'
    // since staff IS the moderator.
    status?:             string
    // Image inputs — up to 3 photos. Multipart path accepts files; JSON
    // path accepts URLs (operator pasted Facebook image links). Mix not
    // supported in a single call.
    imageFiles?:         File[]
    imageUrls?:          string[]
  } = {}

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const imageFiles: File[] = []
      for (const key of ['image', 'image2', 'image3']) {
        const f = form.get(key) as File | null
        if (f && f.size > 0) imageFiles.push(f)
      }
      payload = {
        school_id:          (form.get('school_id')          as string | null)?.trim() ?? undefined,
        school_name:        (form.get('school_name')        as string | null)?.trim() ?? undefined,
        title:              (form.get('title')              as string | null)?.trim() ?? undefined,
        blurb:              (form.get('blurb')              as string | null)?.trim() ?? undefined,
        source_url:         (form.get('source_url')         as string | null)?.trim() ?? undefined,
        source_type:        (form.get('source_type')        as string | null)?.trim() ?? undefined,
        submitted_by_name:  (form.get('submitted_by_name')  as string | null)?.trim() ?? undefined,
        submitted_by_email: (form.get('submitted_by_email') as string | null)?.trim() ?? undefined,
        issue_month:        (form.get('issue_month')        as string | null)?.trim() ?? undefined,
        published_at:       (form.get('published_at')       as string | null)?.trim() ?? undefined,
        status:             (form.get('status')             as string | null)?.trim() ?? undefined,
        imageFiles,
      }
    } else {
      const body = await req.json().catch(() => null) as Record<string, unknown> | null
      if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      // JSON path accepts either `image_url` (single) or `image_urls` (array)
      const urls: string[] = []
      if (typeof body.image_url === 'string' && body.image_url.trim()) urls.push(body.image_url.trim())
      if (Array.isArray(body.image_urls)) {
        for (const u of body.image_urls) {
          if (typeof u === 'string' && u.trim()) urls.push(u.trim())
        }
      }
      payload = {
        school_id:          typeof body.school_id          === 'string' ? body.school_id.trim()          : undefined,
        school_name:        typeof body.school_name        === 'string' ? body.school_name.trim()        : undefined,
        title:              typeof body.title              === 'string' ? body.title.trim()              : undefined,
        blurb:              typeof body.blurb              === 'string' ? body.blurb.trim()              : undefined,
        source_url:         typeof body.source_url         === 'string' ? body.source_url.trim()         : undefined,
        source_type:        typeof body.source_type        === 'string' ? body.source_type.trim()        : undefined,
        submitted_by_name:  typeof body.submitted_by_name  === 'string' ? body.submitted_by_name.trim()  : undefined,
        submitted_by_email: typeof body.submitted_by_email === 'string' ? body.submitted_by_email.trim() : undefined,
        issue_month:        typeof body.issue_month        === 'string' ? body.issue_month.trim()        : undefined,
        published_at:       typeof body.published_at       === 'string' ? body.published_at.trim()       : undefined,
        status:             typeof body.status             === 'string' ? body.status.trim()             : undefined,
        imageUrls:          urls,
      }
    }
  } catch (e) {
    return NextResponse.json({ error: `Could not parse request: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 })
  }

  if (!payload.title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (!payload.blurb) return NextResponse.json({ error: 'blurb is required' }, { status: 400 })
  if (payload.issue_month && !/^\d{4}-\d{2}$/.test(payload.issue_month)) {
    return NextResponse.json({ error: 'issue_month must be YYYY-MM' }, { status: 400 })
  }
  // published_at accepts YYYY-MM-DD or full ISO. Parse it to validate;
  // we trust postgres to coerce on insert.
  let publishedAtIso: string | null = null
  if (payload.published_at) {
    const d = new Date(payload.published_at)
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: 'published_at must be a valid date (YYYY-MM-DD or ISO)' }, { status: 400 })
    }
    publishedAtIso = d.toISOString()
  }

  const supabase = supabaseAdminForImages()

  const school = await resolveSchool(supabase, payload.school_id ?? null, payload.school_name ?? null)
  if ('error' in school) return NextResponse.json({ error: school.error }, { status: school.status })
  if (!school.id && !school.name) {
    return NextResponse.json({ error: 'school_id or school_name is required' }, { status: 400 })
  }

  // ── Image processing (optional, up to 3 images) ──────────────────────────
  // Multipart path: imageFiles is the source. JSON path: imageUrls is the
  // source. They're mutually exclusive — multipart wins if both present.
  let processedImages: ProcessedImage[] = []
  const imageFiles = payload.imageFiles ?? []
  const imageUrls  = payload.imageUrls  ?? []
  const total = (imageFiles.length || imageUrls.length)
  if (total > MAX_IMAGES_PER_BIT) {
    return NextResponse.json({ error: `Too many images (max ${MAX_IMAGES_PER_BIT} per bit)` }, { status: 400 })
  }
  try {
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (!ALLOWED_TYPES.has(file.type)) {
          return NextResponse.json({ error: `Unsupported image type: ${file.type}. Use JPEG, PNG, WebP, HEIC, GIF, or AVIF.` }, { status: 400 })
        }
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: `One image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 25 MB per image.` }, { status: 400 })
        }
      }
      processedImages = await Promise.all(imageFiles.map(async f => {
        const buffer = Buffer.from(await f.arrayBuffer())
        return processAndUpload({ supabase, buffer, schoolName: school.name })
      }))
    } else if (imageUrls.length > 0) {
      processedImages = await Promise.all(imageUrls.map(async url => {
        const { buffer } = await fetchImageFromUrl(url)
        return processAndUpload({ supabase, buffer, schoolName: school.name })
      }))
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
  const hero = processedImages[0] ?? null

  // ── Insert row ─────────────────────────────────────────────────────────────
  const sourceType = (VALID_SOURCES as readonly string[]).includes(payload.source_type ?? '')
    ? payload.source_type
    : (payload.source_url ? 'staff_facebook' : 'staff_manual')

  // Status — staff Quick Add sends 'approved' to skip the queue. Public
  // form submissions and email/Facebook intake stay at the default 'pending'
  // so a human still reviews them before they're live.
  const requestedStatus = payload.status === 'approved' ? 'approved' : 'pending'
  const nowIso          = new Date().toISOString()
  // If publishing directly, stamp published_at now unless the operator
  // already backdated it. If staying pending, preserve any backdate but
  // don't auto-stamp — that happens at approval.
  const effectivePublishedAt = requestedStatus === 'approved'
    ? (publishedAtIso ?? nowIso)
    : publishedAtIso
  const effectiveReviewedAt  = requestedStatus === 'approved' ? nowIso : null

  const { data: bit, error: insertErr } = await supabase
    .from('school_bits')
    .insert({
      market:             MARKET,
      school_id:          school.id || null,
      school_name:        school.name,
      title:              payload.title,
      blurb:              payload.blurb,
      image_web_url:      hero?.image_card_url   ?? null,  // card-cropped for feeds
      image_orig_path:    hero?.image_orig_path  ?? null,
      image_width:        hero?.image_width      ?? null,
      image_height:       hero?.image_height     ?? null,
      source_type:        sourceType,
      source_url:         payload.source_url         ?? null,
      submitted_by_name:  payload.submitted_by_name  ?? null,
      submitted_by_email: payload.submitted_by_email ?? null,
      issue_month:        payload.issue_month        ?? null,
      published_at:       effectivePublishedAt,
      reviewed_at:        effectiveReviewedAt,
      status:             requestedStatus,
    })
    .select('id, image_web_url')
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Persist all images (including hero) into school_bit_images so the
  // lightbox + print export pick them up
  if (processedImages.length > 0) {
    await persistBitImages(supabase, (bit as { id: string }).id, processedImages)
  }

  revalidatePath('/admin/school-news')
  if (requestedStatus === 'approved') {
    revalidatePath('/family-resource-guide')
    revalidatePath('/school-zone')
    revalidatePath('/school-bits')
  }
  return NextResponse.json({ bit, status: requestedStatus })
}
