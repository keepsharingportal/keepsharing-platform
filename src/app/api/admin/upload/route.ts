// POST /api/admin/upload
// Accepts: multipart/form-data  { file: File, context?: string }
// - Validates file type and size
// - Optimises with Sharp: resizes to max 1600px, converts to WebP
// - Generates thumbnail variant at 400px wide
// - Uploads both to Supabase Storage bucket 'article-media'
// - Saves metadata to media_assets table (soft-fail if table missing)
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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file    = form.get('file')    as File   | null
    const context = form.get('context') as string | null  // 'article' | 'listing' | 'asset'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type: ${file.type}. Use JPEG, PNG, WebP, GIF, or AVIF.` }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.` }, { status: 400 })
    }

    // ── Optimise with Sharp ───────────────────────────────────────────────────

    const inputBuffer = Buffer.from(await file.arrayBuffer())
    const image       = sharp(inputBuffer)
    const meta        = await image.metadata()
    const origW       = meta.width  ?? 0
    const origH       = meta.height ?? 0

    // Web version — cap width, convert to WebP
    const webPipeline = sharp(inputBuffer)
    if (origW > WEB_MAX_WIDTH) webPipeline.resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
    const webBuffer  = await webPipeline.webp({ quality: WEB_QUALITY }).toBuffer({ resolveWithObject: true })
    const webW = webBuffer.info.width
    const webH = webBuffer.info.height

    // Thumbnail — 400px wide WebP
    const thumbBuffer = await sharp(inputBuffer)
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer()

    // ── Upload to Supabase Storage ────────────────────────────────────────────

    const uid        = crypto.randomUUID().slice(0, 8)
    const prefix     = context === 'listing' ? 'listings' : 'articles'
    const webPath    = storagePath(prefix, `${uid}.webp`)
    const thumbPath  = storagePath(prefix, `${uid}-thumb.webp`)

    const supabase = supabaseAdmin()

    // Ensure bucket exists (no-op if already present)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

    const [webUp, thumbUp] = await Promise.all([
      supabase.storage.from(BUCKET).upload(webPath,   webBuffer.data,   { contentType: 'image/webp', upsert: false }),
      supabase.storage.from(BUCKET).upload(thumbPath, thumbBuffer,       { contentType: 'image/webp', upsert: false }),
    ])

    if (webUp.error) {
      console.error('[upload] storage error:', webUp.error)
      return NextResponse.json({ error: webUp.error.message }, { status: 500 })
    }

    const { data: { publicUrl: url } }          = supabase.storage.from(BUCKET).getPublicUrl(webPath)
    const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from(BUCKET).getPublicUrl(thumbPath)

    // ── Save to media_assets (soft-fail) ─────────────────────────────────────

    let assetId: string | undefined
    try {
      const { data: asset } = await supabase
        .from('media_assets')
        .insert({
          filename:         webPath.split('/').pop(),
          original_filename: file.name,
          storage_url:      url,
          thumbnail_url:    thumbnailUrl,
          asset_type:       context === 'listing' ? 'listing-image' : 'article-image',
          upload_source:    'editor-upload',
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
    } catch {
      // media_assets table missing or schema mismatch — not fatal
    }

    return NextResponse.json({
      url,
      thumbnailUrl,
      width:    webW,
      height:   webH,
      size:     webBuffer.data.length,
      original: { width: origW, height: origH, size: file.size },
      id:       assetId,
    })
  } catch (e) {
    console.error('[upload] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
