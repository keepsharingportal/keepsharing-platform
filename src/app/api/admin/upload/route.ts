// POST /api/admin/upload
//
// Two intake modes:
//
//   1. multipart/form-data { file: File, context?: string }
//        Direct file upload from the admin (HeroImageUpload).
//
//   2. application/json    { url: string, context?: string }
//        Pasted-URL optimization. Server fetches the URL, runs it through
//        the same Sharp pipeline, and stores the optimized copy. Returns the
//        new Supabase Storage URL — caller saves THAT into the DB, not the
//        original URL. Keeps the public site from serving bloated remote
//        JPEGs when an editor pastes a random link.
//
// Either path:
//   - Validates type + size
//   - Sharp resizes to max 1600px, encodes WebP @ q82
//   - Generates a 400px thumbnail
//   - Uploads both to Supabase Storage (article-media bucket)
//   - Soft-records in media_assets if the table exists
//
// Returns: { url, thumbnailUrl, width, height, size, id? }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET          = 'article-media'
const MAX_BYTES       = 15 * 1024 * 1024   // 15 MB raw limit
const WEB_MAX_WIDTH   = 1600
const THUMB_WIDTH     = 400
const WEB_QUALITY     = 82
const THUMB_QUALITY   = 75
const ALLOWED_TYPES   = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const URL_FETCH_TIMEOUT_MS = 12_000

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function storagePath(prefix: string, suffix: string) {
  const now  = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  return `${prefix}/${yyyy}/${mm}/${suffix}`
}

// Skip the optimizer entirely when the URL is already on our Supabase Storage
// — it was processed at original upload, no need to re-encode.
function isSupabaseStorageUrl(url: string): boolean {
  try { return /supabase\.(co|in)/.test(new URL(url).hostname) }
  catch { return false }
}

// Shared pipeline: takes a raw image buffer + original filename + context,
// returns the optimized URLs.
async function processAndUpload(args: {
  buffer:        Buffer
  originalName:  string
  context:       string | null
  declaredType?: string | null
}) {
  const { buffer, originalName, context, declaredType } = args

  const meta = await sharp(buffer).metadata()
  const origW = meta.width  ?? 0
  const origH = meta.height ?? 0

  // Reject if Sharp can't read the file (not actually an image)
  if (!origW || !origH) {
    throw new Error('Could not parse image — file may be corrupt or not actually an image.')
  }

  const webPipeline = sharp(buffer)
  if (origW > WEB_MAX_WIDTH) webPipeline.resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
  const webBuffer = await webPipeline.webp({ quality: WEB_QUALITY }).toBuffer({ resolveWithObject: true })
  const webW = webBuffer.info.width
  const webH = webBuffer.info.height

  const thumbBuffer = await sharp(buffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()

  const uid       = crypto.randomUUID().slice(0, 8)
  const prefix    = context === 'listing' ? 'listings' : 'articles'
  const webPath   = storagePath(prefix, `${uid}.webp`)
  const thumbPath = storagePath(prefix, `${uid}-thumb.webp`)

  const supabase = supabaseAdmin()
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const [webUp] = await Promise.all([
    supabase.storage.from(BUCKET).upload(webPath,   webBuffer.data, { contentType: 'image/webp', upsert: false }),
    supabase.storage.from(BUCKET).upload(thumbPath, thumbBuffer,    { contentType: 'image/webp', upsert: false }),
  ])

  if (webUp.error) throw new Error(webUp.error.message)

  const { data: { publicUrl: url } }          = supabase.storage.from(BUCKET).getPublicUrl(webPath)
  const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath)

  // Soft-record (table may not exist on every env)
  let assetId: string | undefined
  try {
    const { data: asset } = await supabase
      .from('media_assets')
      .insert({
        filename:         webPath.split('/').pop(),
        original_filename: originalName,
        storage_url:      url,
        thumbnail_url:    thumbnailUrl,
        asset_type:       context === 'listing' ? 'listing-image' : 'article-image',
        upload_source:    declaredType?.startsWith('url:') ? 'editor-url-import' : 'editor-upload',
        file_size_bytes:  webBuffer.data.length,
        width_px:         webW,
        height_px:        webH,
        status:           'active',
        used_in_article:  context !== 'listing',
        used_in_guide:    context === 'listing',
      })
      .select('id')
      .single()
    assetId = asset?.id
  } catch { /* table missing — non-fatal */ }

  return {
    url,
    thumbnailUrl,
    width:    webW,
    height:   webH,
    size:     webBuffer.data.length,
    original: { width: origW, height: origH, size: buffer.byteLength },
    id:       assetId,
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''

  try {
    // ── Mode 1: JSON body with a URL ─────────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body    = await req.json().catch(() => ({})) as { url?: string; context?: string }
      const rawUrl  = body.url?.trim()
      const context = body.context ?? null

      if (!rawUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

      // Validate URL shape
      let parsed: URL
      try { parsed = new URL(rawUrl) }
      catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
      }

      // Already on Supabase Storage → caller can just save it; no need to
      // re-download + re-encode. Return the URL unchanged.
      if (isSupabaseStorageUrl(rawUrl)) {
        return NextResponse.json({
          url:          rawUrl,
          thumbnailUrl: rawUrl,
          alreadyOptimized: true,
        })
      }

      // Fetch the remote image with a hard timeout so a bad URL can't hang
      // the request.
      const abort = AbortSignal.timeout(URL_FETCH_TIMEOUT_MS)
      const res = await fetch(rawUrl, {
        headers: { 'User-Agent': 'RiverRegionParents/1.0 (image-optimizer)' },
        signal:  abort,
      }).catch((e: Error) => {
        throw new Error(`Couldn't fetch the URL — ${e.message}`)
      })

      if (!res.ok) {
        return NextResponse.json({ error: `Remote returned ${res.status}` }, { status: 400 })
      }
      const declaredType = res.headers.get('content-type') ?? ''
      const contentLen   = Number(res.headers.get('content-length') ?? '0')
      if (contentLen > MAX_BYTES) {
        return NextResponse.json({ error: `Remote image too large (${(contentLen / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.` }, { status: 400 })
      }
      if (declaredType && !declaredType.startsWith('image/')) {
        return NextResponse.json({ error: `Remote returned ${declaredType}, not an image` }, { status: 400 })
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: `Remote image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.` }, { status: 400 })
      }

      const result = await processAndUpload({
        buffer,
        originalName: parsed.pathname.split('/').pop() ?? 'imported.webp',
        context,
        declaredType: 'url:' + declaredType,
      })
      return NextResponse.json(result)
    }

    // ── Mode 2: multipart/form-data file upload (existing path) ──────────────
    const form    = await req.formData()
    const file    = form.get('file')    as File   | null
    const context = form.get('context') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, GIF, or AVIF.` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.` }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processAndUpload({
      buffer,
      originalName: file.name,
      context,
      declaredType: file.type,
    })
    return NextResponse.json(result)

  } catch (e) {
    console.error('[upload] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
