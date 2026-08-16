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

const BUCKET              = 'article-media'             // public — web variants + thumbs
const BUCKET_HERO_ORIG    = 'article-hero-orig'         // private — saved hero originals for re-crop
const BUCKET_PROFILE_ORIG = 'article-profile-orig'      // private — saved profile-image originals for re-crop
const BUCKET_LISTING_ORIG = 'listing-hero-orig'         // private — saved listing hero originals for re-crop
const MAX_BYTES           = 15 * 1024 * 1024            // 15 MB raw limit (Vercel platform caps at ~4.5 MB; client compresses bigger files first)
const WEB_MAX_WIDTH       = 1600
const THUMB_WIDTH         = 400
const WEB_QUALITY         = 82
const THUMB_QUALITY       = 75
// Fixed hero crop — 16:9, sized for the article detail page hero block.
// CSS letterboxes / object-covers for narrower viewports.
const HERO_CARD_WIDTH     = 1600
const HERO_CARD_HEIGHT    = 900
// Fixed profile crop — 1:1, sized for sidebar circles (typically rendered
// at 80–200px). 800px source supports 4× retina at the largest use.
const PROFILE_CARD_SIZE   = 800
const ALLOWED_TYPES       = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
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
//
// Two contexts opt into the magazine-style re-crop flow:
//   - 'article-hero'    → fixed 16:9 (1600×900) attention crop, original saved
//                         to BUCKET_HERO_ORIG for later re-crop
//   - 'article-profile' → fixed 1:1 (800×800) attention crop, original saved
//                         to BUCKET_PROFILE_ORIG
//
// Both return origPath so the caller can persist it on the article row. The
// 9-compass GravityPicker in HeroImageUpload calls a context-matched
// /recrop-* endpoint to re-process from the saved original.
//
// Other contexts ('article', 'listing', etc.) keep the original natural-aspect
// behavior — gallery photos and listing tiles shouldn't be force-cropped.
async function processAndUpload(args: {
  buffer:        Buffer
  originalName:  string
  context:       string | null
  declaredType?: string | null
}) {
  const { buffer, originalName, context, declaredType } = args
  // 'listing-hero' shares article-hero's 16:9 geometry: the featured listing
  // card and the listing detail hero are both landscape bands, so a business
  // gets the same framing control an article does.
  const isListingHero = context === 'listing-hero'
  const isHero    = context === 'article-hero' || isListingHero
  const isProfile = context === 'article-profile'

  const meta = await sharp(buffer).metadata()
  const origW = meta.width  ?? 0
  const origH = meta.height ?? 0

  // Reject if Sharp can't read the file (not actually an image)
  if (!origW || !origH) {
    throw new Error('Could not parse image — file may be corrupt or not actually an image.')
  }

  // Build the public-facing web variant. For fixed-aspect contexts (hero,
  // profile) Sharp's attention strategy picks the focal point. For everything
  // else, keep natural aspect (clamped to 1600px wide).
  const webPipeline = sharp(buffer).rotate()  // honor EXIF orientation
  if (isHero) {
    webPipeline.resize({
      width:    HERO_CARD_WIDTH,
      height:   HERO_CARD_HEIGHT,
      fit:      'cover',
      position: sharp.strategy.attention,
    })
  } else if (isProfile) {
    webPipeline.resize({
      width:    PROFILE_CARD_SIZE,
      height:   PROFILE_CARD_SIZE,
      fit:      'cover',
      position: sharp.strategy.attention,
    })
  } else if (origW > WEB_MAX_WIDTH) {
    webPipeline.resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
  }
  const webBuffer = await webPipeline.webp({ quality: WEB_QUALITY }).toBuffer({ resolveWithObject: true })
  const webW = webBuffer.info.width
  const webH = webBuffer.info.height

  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()

  const uid       = crypto.randomUUID().slice(0, 8)
  const prefix    = (context === 'listing' || isListingHero) ? 'listings' : 'articles'
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

  // For fixed-aspect uploads (hero, profile), also stash the raw original
  // in a private bucket so an editor can re-crop later without re-uploading.
  // The path is what we hand back to the caller — they persist it on the
  // article row alongside the matching column (hero_image_orig_path or
  // profile_image_orig_path).
  let origPath: string | undefined
  if (isHero || isProfile) {
    const ext         = inferExt(originalName, declaredType ?? null) || 'jpg'
    const origBucket  = isListingHero ? BUCKET_LISTING_ORIG
                      : isHero        ? BUCKET_HERO_ORIG
                      :                 BUCKET_PROFILE_ORIG
    const origPrefix  = isListingHero ? 'listing-hero-orig'
                      : isHero        ? 'hero-orig'
                      :                 'profile-orig'
    const origRelPath = storagePath(origPrefix, `${uid}.${ext}`)
    await supabase.storage.createBucket(origBucket, { public: false }).catch(() => {})
    const origUp = await supabase.storage
      .from(origBucket)
      .upload(origRelPath, buffer, {
        contentType: declaredType?.startsWith('image/') ? declaredType : 'application/octet-stream',
        upsert:      false,
      })
    if (!origUp.error) origPath = origRelPath
    // If the private bucket upload fails we still return the public URL —
    // the re-crop feature just won't be available for this image.
  }

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
        asset_type:       (context === 'listing' || isListingHero) ? 'listing-image' : 'article-image',
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
    origPath,
  }
}

// Best-effort extension picker so the saved original keeps a sane file name
// for re-crop downloads. Falls back to jpg if nothing useful is in the
// filename or MIME type.
function inferExt(name: string, mime: string | null): string | null {
  const fromName = name.match(/\.([a-zA-Z0-9]{2,4})$/)?.[1]?.toLowerCase()
  if (fromName) return fromName
  if (!mime) return null
  if (mime.includes('jpeg')) return 'jpg'
  if (mime.includes('png'))  return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif'))  return 'gif'
  if (mime.includes('avif')) return 'avif'
  return null
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
