// POST /api/admin/events/upload
//
// Two intake modes — matches the school-bits Quick Add pattern so operators
// have the same muscle memory:
//
//   1. multipart/form-data { image: File, title?: string }
//        Direct file upload. Runs the calendar image pipeline and returns
//        the URL + original path so the QuickAdd form can store all four
//        image columns when it finally POSTs the event row.
//
//   2. application/json    { url: string, title?: string }
//        URL paste. Server fetches the remote image (with a hard timeout
//        + size limit), reprocesses it through the same pipeline. Lets
//        editors paste an organizer's OG image without first downloading
//        it locally.
//
// Returns: { hero_image_url, image_orig_path, image_width, image_height }
//
// The fields match what /api/admin/events POST and PATCH expect for image
// columns, so callers persist them as-is.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import {
  ALLOWED_TYPES, MAX_BYTES,
  fetchImageFromUrl, processAndUpload, supabaseAdminForImages,
} from '@/lib/calendar/image-pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 60

interface UrlBody {
  url?:   string
  title?: string
}

export async function POST(req: NextRequest) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const contentType = req.headers.get('content-type') ?? ''
  const supabase    = supabaseAdminForImages()

  try {
    // ── URL paste ─────────────────────────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null) as UrlBody | null
      const rawUrl = body?.url?.trim()
      const title  = body?.title?.trim() || 'event'
      if (!rawUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

      const { buffer, declaredType } = await fetchImageFromUrl(rawUrl)
      if (declaredType && !ALLOWED_TYPES.has(declaredType)) {
        return NextResponse.json({ error: `Unsupported image type: ${declaredType}` }, { status: 400 })
      }
      const result = await processAndUpload({ supabase, buffer, title })
      return NextResponse.json(result)
    }

    // ── File upload ───────────────────────────────────────────────────────
    const form  = await req.formData()
    const file  = form.get('image') as File | null
    const title = (form.get('title') as string | null)?.trim() || 'event'
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_BYTES / 1024 / 1024} MB.` },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processAndUpload({ supabase, buffer, title })
    return NextResponse.json(result)

  } catch (e) {
    console.error('[admin/events/upload] error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
