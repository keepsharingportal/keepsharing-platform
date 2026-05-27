// Calendar-events image pipeline. Direct sibling of school-news/image-pipeline.ts
// — same attention-crop strategy, same 9-point manual gravity escape hatch,
// same dual-bucket layout (public web variant + private high-res original
// kept around for re-crop). Centralized so the QuickAdd image upload, the
// inline editor's "Replace image" button, and the manual re-crop all run the
// exact same code.
//
// Each uploaded photo produces TWO outputs (we don't ship a print variant
// like school-bits because event images aren't headed to InDesign):
//   - WEB WebP at 16:10 attention-cropped (1200x750, q82, public bucket
//     `calendar-events-web`) — the hero image on the public detail page +
//     the card thumb on the calendar grid.
//   - ORIGINAL JPEG at full size (sRGB, q92, private bucket
//     `calendar-events-orig`) — kept ONLY so re-crop has something to
//     re-process when the attention strategy misses.
//
// Why 16:10 for the hero (instead of natural aspect like school bits):
// calendar cards and the detail page hero both want a wide aspect ratio for
// layout consistency; event photos are noisier than school bits photos and a
// uniform crop makes the grid feel curated. School-bits keeps natural aspect
// because the lightbox is the primary view there.

import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const MAX_BYTES        = 15 * 1024 * 1024
export const HERO_WIDTH       = 1200
export const HERO_HEIGHT      = 750   // 16:10 — matches calendar card frames
export const HERO_QUALITY     = 82
export const ORIG_MAX_WIDE    = 2400
export const ORIG_QUALITY     = 92
export const ALLOWED_TYPES    = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'image/avif', 'image/heic', 'image/heif',
])

export const BUCKET_WEB  = 'calendar-events-web'   // public
export const BUCKET_ORIG = 'calendar-events-orig'  // private — re-crop source

const URL_FETCH_TIMEOUT_MS = 12_000

export interface ProcessedEventImage {
  /** Public URL of the 16:10 attention-cropped hero. */
  hero_image_url:  string
  /** Storage path of the high-res original (private bucket). */
  image_orig_path: string
  /** Hero variant dimensions — useful for next/image sizing + CLS prevention. */
  image_width:     number
  image_height:    number
}

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'event'
}

function storagePath(suffix: string): string {
  const now  = new Date()
  const yyyy = now.getFullYear()
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  return `${yyyy}/${mm}/${suffix}`
}

export async function fetchImageFromUrl(rawUrl: string): Promise<{ buffer: Buffer; declaredType: string }> {
  let parsed: URL
  try { parsed = new URL(rawUrl) }
  catch { throw new Error('Invalid URL') }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must be http or https')
  }
  const abort = AbortSignal.timeout(URL_FETCH_TIMEOUT_MS)
  const res = await fetch(rawUrl, {
    headers: { 'User-Agent': 'RiverRegionParents/1.0 (calendar-image-fetch)' },
    signal:  abort,
  }).catch((e: Error) => { throw new Error(`Couldn't fetch the URL — ${e.message}`) })
  if (!res.ok) throw new Error(`Remote returned ${res.status}`)
  const declaredType = res.headers.get('content-type') ?? ''
  if (declaredType && !declaredType.startsWith('image/')) {
    throw new Error(`Remote returned ${declaredType}, not an image`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`Remote image too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Max is 15 MB.`)
  }
  return { buffer, declaredType }
}

/**
 * Run a raw image buffer through Sharp + upload both variants. Returns the
 * fields the caller writes to calendar_events.
 */
export async function processAndUpload(opts: {
  supabase: SupabaseClient
  buffer:   Buffer
  title:    string   // used to slugify storage filenames; doesn't affect output
}): Promise<ProcessedEventImage> {
  const meta = await sharp(opts.buffer).metadata()
  const origW = meta.width  ?? 0
  const origH = meta.height ?? 0
  if (!origW || !origH) {
    throw new Error('Could not parse image — file may be corrupt or not actually an image.')
  }

  // ── Hero (16:10, attention crop, WebP) ─────────────────────────────────────
  const heroOut = await sharp(opts.buffer)
    .rotate()                              // honor EXIF orientation
    .resize({
      width:    HERO_WIDTH,
      height:   HERO_HEIGHT,
      fit:      'cover',
      position: sharp.strategy.attention,  // auto-find subject
    })
    .webp({ quality: HERO_QUALITY })
    .toBuffer({ resolveWithObject: true })

  // ── Original (high-res JPEG, sRGB) for future re-crops ─────────────────────
  const origPipeline = sharp(opts.buffer).rotate().withMetadata().toColorspace('srgb')
  if (origW > ORIG_MAX_WIDE) origPipeline.resize({ width: ORIG_MAX_WIDE, withoutEnlargement: true })
  const origBuffer = await origPipeline.jpeg({ quality: ORIG_QUALITY, chromaSubsampling: '4:4:4' }).toBuffer()

  const uid      = crypto.randomUUID().slice(0, 8)
  const slug     = slugify(opts.title)
  const heroPath = storagePath(`${slug}-${uid}.webp`)
  const origPath = storagePath(`${slug}-${uid}-orig.jpg`)

  await opts.supabase.storage.createBucket(BUCKET_WEB,  { public: true  }).catch(() => {})
  await opts.supabase.storage.createBucket(BUCKET_ORIG, { public: false }).catch(() => {})

  const [heroUp, origUp] = await Promise.all([
    opts.supabase.storage.from(BUCKET_WEB ).upload(heroPath, heroOut.data, { contentType: 'image/webp', upsert: false }),
    opts.supabase.storage.from(BUCKET_ORIG).upload(origPath, origBuffer,   { contentType: 'image/jpeg', upsert: false }),
  ])
  if (heroUp.error) throw new Error(`Hero upload failed: ${heroUp.error.message}`)
  if (origUp.error) throw new Error(`Original upload failed: ${origUp.error.message}`)

  const hero_image_url = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(heroPath).data.publicUrl

  return {
    hero_image_url,
    image_orig_path: origPath,
    image_width:     heroOut.info.width,
    image_height:    heroOut.info.height,
  }
}

// ── Manual re-crop ───────────────────────────────────────────────────────────
// Same 9-point compass + 2 strategies as school-bits.

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

function sharpPosition(g: CropGravity) {
  if (g === 'attention') return sharp.strategy.attention
  if (g === 'entropy')   return sharp.strategy.entropy
  return g
}

/**
 * Regenerate the hero crop from the saved original using the supplied
 * gravity. Returns the new public hero URL — caller updates
 * calendar_events.hero_image_url.
 */
export async function recropFromOriginal(opts: {
  supabase: SupabaseClient
  origPath: string
  title:    string
  gravity:  CropGravity
}): Promise<{ hero_image_url: string }> {
  const dl = await opts.supabase.storage.from(BUCKET_ORIG).download(opts.origPath)
  if (dl.error || !dl.data) {
    throw new Error(`Could not read original image: ${dl.error?.message ?? 'unknown error'}`)
  }
  const buffer = Buffer.from(await dl.data.arrayBuffer())

  const heroOut = await sharp(buffer)
    .rotate()
    .resize({
      width:    HERO_WIDTH,
      height:   HERO_HEIGHT,
      fit:      'cover',
      position: sharpPosition(opts.gravity),
    })
    .webp({ quality: HERO_QUALITY })
    .toBuffer()

  const uid      = crypto.randomUUID().slice(0, 8)
  const slug     = slugify(opts.title)
  const heroPath = storagePath(`${slug}-${uid}.webp`)

  await opts.supabase.storage.createBucket(BUCKET_WEB, { public: true }).catch(() => {})
  const up = await opts.supabase.storage.from(BUCKET_WEB)
    .upload(heroPath, heroOut, { contentType: 'image/webp', upsert: false })
  if (up.error) throw new Error(`Hero upload failed: ${up.error.message}`)

  const hero_image_url = opts.supabase.storage.from(BUCKET_WEB).getPublicUrl(heroPath).data.publicUrl
  return { hero_image_url }
}

export function supabaseAdminForImages(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}
