// Shared image-processing pipeline for School Bits. Used by:
//   - /api/school-bits/submit (public form, multipart file upload)
//   - /api/admin/school-news  (admin Quick Add, file OR URL paste)
//
// Each uploaded photo produces THREE outputs:
//   - Web WebP at natural aspect (max ~1200px wide, q82) → public bucket
//     `school-bits-web` (used in the lightbox / gallery / detail view —
//     preserves vertical photos as vertical)
//   - Card WebP at 16:10 (~800x500, q82, attention-cropped) → public bucket
//     `school-bits-web` (used in feed cards; attention strategy auto-finds
//     the most visually-interesting region so faces stay in frame instead
//     of getting cropped off)
//   - Print JPEG at high-res (~2400px max edge, q92, sRGB w/ EXIF) →
//     private bucket `school-bits-orig` (for InDesign print export)
//
// Buckets are auto-created on first call (idempotent).

import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const MAX_BYTES        = 25 * 1024 * 1024
export const WEB_MAX_WIDTH    = 1200
export const WEB_QUALITY      = 82
export const CARD_WIDTH       = 800
export const CARD_HEIGHT      = 500   // 16:10 aspect — matches all feed-card frames
export const PRINT_MAX_WIDE   = 2400
export const PRINT_QUALITY    = 92
export const ALLOWED_TYPES    = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'image/avif', 'image/heic', 'image/heif',
])

export const BUCKET_WEB  = 'school-bits-web'   // public
export const BUCKET_ORIG = 'school-bits-orig'  // private

const URL_FETCH_TIMEOUT_MS = 12_000

export interface ProcessedImage {
  /** Public URL of the natural-aspect WebP (lightbox / gallery / detail). */
  image_web_url:   string
  /** Public URL of the 16:10 attention-cropped WebP (feed cards). */
  image_card_url:  string
  /** Storage path of the high-res print JPEG (private bucket). */
  image_orig_path: string
  /** Natural-aspect dimensions (matches image_web_url). */
  image_width:     number
  image_height:    number
}

export function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function storagePath(suffix: string): string {
  const now  = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  return `${yyyy}/${mm}/${suffix}`
}

// Fetch a remote URL into a buffer. Used for the URL-paste path on admin Quick
// Add (operator copies a Facebook image link, we download + reprocess).
export async function fetchImageFromUrl(rawUrl: string): Promise<{ buffer: Buffer; declaredType: string }> {
  let parsed: URL
  try { parsed = new URL(rawUrl) }
  catch { throw new Error('Invalid URL') }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must be http or https')
  }

  const abort = AbortSignal.timeout(URL_FETCH_TIMEOUT_MS)
  const res = await fetch(rawUrl, {
    headers: { 'User-Agent': 'RiverRegionParents/1.0 (school-bits-image-fetch)' },
    signal:  abort,
  }).catch((e: Error) => { throw new Error(`Couldn't fetch the URL — ${e.message}`) })

  if (!res.ok) throw new Error(`Remote returned ${res.status}`)
  const declaredType = res.headers.get('content-type') ?? ''
  if (declaredType && !declaredType.startsWith('image/')) {
    throw new Error(`Remote returned ${declaredType}, not an image`)
  }
  const contentLen = Number(res.headers.get('content-length') ?? '0')
  if (contentLen > MAX_BYTES) {
    throw new Error(`Remote image too large (${(contentLen / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`Remote image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Max is 25 MB.`)
  }
  return { buffer, declaredType }
}

// Process a raw image buffer through Sharp and upload all three variants.
// Returns the new URLs + private path that the caller persists into the DB.
export async function processAndUpload(opts: {
  supabase:    SupabaseClient
  buffer:      Buffer
  schoolName:  string
}): Promise<ProcessedImage> {
  const meta = await sharp(opts.buffer).metadata()
  const origW = meta.width  ?? 0
  const origH = meta.height ?? 0
  if (!origW || !origH) {
    throw new Error('Could not parse image — file may be corrupt or not actually an image.')
  }

  // ── Variant 1: WEB (natural aspect, max 1200px wide) ─────────────────────
  // Used by the lightbox/gallery so vertical photos stay vertical and
  // horizontal photos stay horizontal.
  const webPipeline = sharp(opts.buffer).rotate()  // honor EXIF orientation
  if (origW > WEB_MAX_WIDTH) webPipeline.resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
  const webOut = await webPipeline.webp({ quality: WEB_QUALITY }).toBuffer({ resolveWithObject: true })

  // ── Variant 2: CARD (16:10 attention-cropped) ────────────────────────────
  // Sharp's attention strategy finds the region of highest visual interest
  // (faces, eyes, edges, saturated colors) and crops around it. This is
  // what keeps faces in frame on cards instead of getting decapitated by
  // a center-crop on a group photo.
  const cardOut = await sharp(opts.buffer)
    .rotate()
    .resize({
      width:    CARD_WIDTH,
      height:   CARD_HEIGHT,
      fit:      'cover',
      position: sharp.strategy.attention,
    })
    .webp({ quality: WEB_QUALITY })
    .toBuffer()

  // ── Variant 3: PRINT (high-res JPEG, sRGB, preserves EXIF for InDesign) ──
  const printPipeline = sharp(opts.buffer).rotate().withMetadata().toColorspace('srgb')
  if (origW > PRINT_MAX_WIDE) printPipeline.resize({ width: PRINT_MAX_WIDE, withoutEnlargement: true })
  const printBuffer = await printPipeline.jpeg({ quality: PRINT_QUALITY, chromaSubsampling: '4:4:4' }).toBuffer()

  // ── Upload all three to Supabase Storage ─────────────────────────────────
  const uid       = crypto.randomUUID().slice(0, 8)
  const slug      = slugify(opts.schoolName)
  const webPath   = storagePath(`${slug}-${uid}.webp`)
  const cardPath  = storagePath(`${slug}-${uid}-card.webp`)
  const origPath  = storagePath(`${slug}-${uid}-orig.jpg`)

  await opts.supabase.storage.createBucket(BUCKET_WEB,  { public: true  }).catch(() => {})
  await opts.supabase.storage.createBucket(BUCKET_ORIG, { public: false }).catch(() => {})

  const [webUp, cardUp, origUp] = await Promise.all([
    opts.supabase.storage.from(BUCKET_WEB).upload(webPath,   webOut.data,  { contentType: 'image/webp', upsert: false }),
    opts.supabase.storage.from(BUCKET_WEB).upload(cardPath,  cardOut,      { contentType: 'image/webp', upsert: false }),
    opts.supabase.storage.from(BUCKET_ORIG).upload(origPath, printBuffer,  { contentType: 'image/jpeg', upsert: false }),
  ])
  if (webUp.error)  throw new Error(`Web image upload failed: ${webUp.error.message}`)
  if (cardUp.error) throw new Error(`Card image upload failed: ${cardUp.error.message}`)
  if (origUp.error) throw new Error(`Print image upload failed: ${origUp.error.message}`)

  const imageWebUrl  = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(webPath).data.publicUrl
  const imageCardUrl = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(cardPath).data.publicUrl

  return {
    image_web_url:   imageWebUrl,
    image_card_url:  imageCardUrl,
    image_orig_path: origPath,
    image_width:     webOut.info.width,
    image_height:    webOut.info.height,
  }
}

export function supabaseAdminForImages(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// ── Manual re-crop ─────────────────────────────────────────────────────────
// Sharp's attention strategy is heuristic — it usually puts the subject in
// the right place but sometimes misses (high-contrast lockers behind a
// person, busy backgrounds, etc.). This lets an editor pick the crop
// gravity manually after the fact, using the saved original so no
// re-upload is needed.
//
// 9 compass positions cover the typical cases (subject in any corner /
// edge / center). 'attention' and 'entropy' are escape hatches that re-run
// the auto strategies if the editor wants to try them again.

export type CropGravity =
  | 'north' | 'northeast' | 'east' | 'southeast'
  | 'south' | 'southwest' | 'west' | 'northwest'
  | 'center' | 'attention' | 'entropy'

const VALID_GRAVITIES: ReadonlySet<CropGravity> = new Set<CropGravity>([
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest',
  'center', 'attention', 'entropy',
])

export function isValidGravity(s: string): s is CropGravity {
  return VALID_GRAVITIES.has(s as CropGravity)
}

// Map a CropGravity to sharp's position value. Sharp accepts strings for
// the 9 compass positions + 'center', and exposes strategies via the
// sharp.strategy.* enum for auto-detection modes.
function sharpPosition(g: CropGravity) {
  if (g === 'attention') return sharp.strategy.attention
  if (g === 'entropy')   return sharp.strategy.entropy
  return g  // 'north' | 'south' | ... | 'center' — sharp accepts these as strings
}

/**
 * Regenerate ONLY the 16:10 feed-card crop from the saved original, using
 * the supplied gravity. The natural-aspect web variant and the print JPEG
 * don't depend on gravity, so we leave them alone.
 *
 * Returns the new public card URL. Caller updates school_bits.image_web_url
 * (which by convention points at the card crop — see persistBitImages) and
 * the hero row in school_bit_images.
 */
export async function recropFromOriginal(opts: {
  supabase:   SupabaseClient
  origPath:   string                       // path inside BUCKET_ORIG
  schoolName: string
  gravity:    CropGravity
}): Promise<{ image_card_url: string }> {
  // Download the saved original. The bucket is private — admin client can
  // .download() directly without a signed URL.
  const dl = await opts.supabase.storage.from(BUCKET_ORIG).download(opts.origPath)
  if (dl.error || !dl.data) {
    throw new Error(`Could not read original image: ${dl.error?.message ?? 'unknown error'}`)
  }
  const arrayBuf = await dl.data.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  // Re-process JUST the card variant. Same dimensions + quality as the
  // original processAndUpload — only the gravity changes.
  const cardOut = await sharp(buffer)
    .rotate()
    .resize({
      width:    CARD_WIDTH,
      height:   CARD_HEIGHT,
      fit:      'cover',
      position: sharpPosition(opts.gravity),
    })
    .webp({ quality: WEB_QUALITY })
    .toBuffer()

  // Upload as a new object so the old URL (which may still be cached by
  // CDNs / Image transforms) keeps working until the row is updated. New
  // uid in the filename so we don't collide with the prior card.
  const uid      = crypto.randomUUID().slice(0, 8)
  const slug     = slugify(opts.schoolName)
  const cardPath = storagePath(`${slug}-${uid}-card.webp`)

  await opts.supabase.storage.createBucket(BUCKET_WEB, { public: true }).catch(() => {})
  const up = await opts.supabase.storage.from(BUCKET_WEB)
    .upload(cardPath, cardOut, { contentType: 'image/webp', upsert: false })
  if (up.error) throw new Error(`Card upload failed: ${up.error.message}`)

  const image_card_url = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(cardPath).data.publicUrl
  return { image_card_url }
}

/**
 * Re-crop the saved original using a manually-drawn rectangle (normalized
 * 0..1 coordinates relative to the original image dimensions, EXIF-rotated).
 * Extracts the rectangle, then resizes to the 16:10 feed-card variant. The
 * caller (admin manual-crop API) supplies the rectangle; aspect enforcement
 * happens client-side in the UI.
 */
export async function manualCropFromOriginal(opts: {
  supabase:   SupabaseClient
  origPath:   string                       // path inside BUCKET_ORIG
  schoolName: string
  crop:       { x: number; y: number; width: number; height: number }  // normalized 0..1
}): Promise<{ image_card_url: string }> {
  const { x, y, width, height } = opts.crop
  if (
    !Number.isFinite(x) || !Number.isFinite(y) ||
    !Number.isFinite(width) || !Number.isFinite(height) ||
    x < 0 || y < 0 || width <= 0 || height <= 0 ||
    x + width > 1.0001 || y + height > 1.0001
  ) {
    throw new Error('crop rectangle out of bounds')
  }

  const dl = await opts.supabase.storage.from(BUCKET_ORIG).download(opts.origPath)
  if (dl.error || !dl.data) {
    throw new Error(`Could not read original image: ${dl.error?.message ?? 'unknown error'}`)
  }
  const buffer = Buffer.from(await dl.data.arrayBuffer())

  // Rotate first so the source dimensions match what the operator drew on
  // (EXIF orientation already applied). Then convert normalized → pixels and
  // round inward so we never exceed the source.
  const rotated = await sharp(buffer).rotate().toBuffer({ resolveWithObject: true })
  const srcW = rotated.info.width
  const srcH = rotated.info.height
  const left   = Math.max(0, Math.floor(x * srcW))
  const top    = Math.max(0, Math.floor(y * srcH))
  const cropW  = Math.min(srcW - left, Math.floor(width  * srcW))
  const cropH  = Math.min(srcH - top,  Math.floor(height * srcH))

  const cardOut = await sharp(rotated.data)
    .extract({ left, top, width: cropW, height: cropH })
    .resize({ width: CARD_WIDTH, height: CARD_HEIGHT, fit: 'fill' })
    .webp({ quality: WEB_QUALITY })
    .toBuffer()

  const uid      = crypto.randomUUID().slice(0, 8)
  const slug     = slugify(opts.schoolName)
  const cardPath = storagePath(`${slug}-${uid}-card.webp`)

  await opts.supabase.storage.createBucket(BUCKET_WEB, { public: true }).catch(() => {})
  const up = await opts.supabase.storage.from(BUCKET_WEB)
    .upload(cardPath, cardOut, { contentType: 'image/webp', upsert: false })
  if (up.error) throw new Error(`Card upload failed: ${up.error.message}`)

  const image_card_url = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(cardPath).data.publicUrl
  return { image_card_url }
}

// Return the EXIF-rotated dimensions of the saved original. The manual crop
// UI uses these to set up react-easy-crop with the right source size.
export async function origDimensions(opts: {
  supabase: SupabaseClient
  origPath: string
}): Promise<{ width: number; height: number }> {
  const dl = await opts.supabase.storage.from(BUCKET_ORIG).download(opts.origPath)
  if (dl.error || !dl.data) {
    throw new Error(`Could not read original image: ${dl.error?.message ?? 'unknown error'}`)
  }
  const buffer = Buffer.from(await dl.data.arrayBuffer())
  const meta = await sharp(buffer).rotate().metadata()
  return { width: meta.width ?? 0, height: meta.height ?? 0 }
}

// ── Persisting images to school_bit_images ─────────────────────────────────
// After processing, callers want to (a) snapshot the hero onto school_bits
// and (b) insert one row per image into school_bit_images. This helper
// handles the DB writes so the routes stay focused on validation/dispatch.

export async function persistBitImages(
  supabase:        SupabaseClient,
  bitId:           string,
  processedImages: ProcessedImage[],   // first item is the hero by convention
): Promise<void> {
  if (processedImages.length === 0) return

  // 1. Snapshot the hero on school_bits — image_web_url is the CARD-cropped
  //    variant so the existing card renders pick it up automatically; the
  //    natural-aspect web URL is reachable via the school_bit_images table.
  const hero = processedImages[0]
  await supabase
    .from('school_bits')
    .update({
      image_web_url:   hero.image_card_url,    // feed cards use this — attention-cropped
      image_orig_path: hero.image_orig_path,
      image_width:     hero.image_width,
      image_height:    hero.image_height,
    })
    .eq('id', bitId)

  // 2. Insert one row per image. Skip the table if migration 086 isn't
  //    applied yet — the hero snapshot on school_bits still works in that case.
  const probe = await supabase.from('school_bit_images').select('id').limit(1)
  if (probe.error) return

  const rows = processedImages.map((p, i) => ({
    bit_id:    bitId,
    position:  i,
    is_hero:   i === 0,
    web_url:   p.image_web_url,
    card_url:  p.image_card_url,
    orig_path: p.image_orig_path,
    width:     p.image_width,
    height:    p.image_height,
  }))
  await supabase.from('school_bit_images').insert(rows)
}
