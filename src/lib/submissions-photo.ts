// Photo upload pipeline for public submission forms.
//
// Saves TWO copies for every submission:
//   • print — unmodified original at full resolution. The magazine
//     designer pulls this for the print issue.
//   • web   — Sharp-optimized webp ~1600px wide. Used as the article
//     hero on the website.
//
// Both live in the existing `article-media` bucket under
// `submissions/{submission_type}/`. Returns the public URLs.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET        = 'article-media'
const WEB_MAX_WIDTH = 1600
const WEB_QUALITY   = 82
const MAX_BYTES     = 15 * 1024 * 1024 // 15 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'])

export interface UploadedSubmissionPhoto {
  webImageUrl:   string
  printImageUrl: string
  width:         number
  height:        number
  originalSize:  number
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png'))  return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif'))  return 'gif'
  if (mime.includes('avif')) return 'avif'
  if (mime.includes('heic') || mime.includes('heif')) return 'heic'
  return 'bin'
}

/**
 * Upload a single submission photo. Returns the public URLs for both
 * the web-optimized webp and the print-quality original. Throws on
 * validation or upload errors so the caller can decide whether to
 * reject the submission or proceed without a photo.
 */
export async function uploadSubmissionPhoto({
  file,
  submissionType,
  submitterName,
}: {
  file:           File
  submissionType: string
  submitterName:  string
}): Promise<UploadedSubmissionPhoto> {

  if (file.size === 0)              throw new Error('Empty file')
  if (file.size > MAX_BYTES)        throw new Error(`Photo is too large (max ${MAX_BYTES / 1024 / 1024} MB)`)
  if (!ALLOWED_TYPES.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`)

  // ── Read into buffer once ──────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer()
  const originalBuffer = Buffer.from(arrayBuffer)

  // ── Web version (Sharp-optimized webp) ────────────────────────────────
  const webBuffer = await sharp(originalBuffer)
    .rotate() // honor EXIF orientation
    .resize({ width: WEB_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEB_QUALITY })
    .toBuffer({ resolveWithObject: true })

  // ── Paths ─────────────────────────────────────────────────────────────
  const now    = new Date()
  const yyyy   = now.getFullYear()
  const mm     = String(now.getMonth() + 1).padStart(2, '0')
  const baseId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const nameHint = safeFilename(submitterName) || 'submission'
  const printExt = extFromMime(file.type)

  const printPath = `submissions/${submissionType}/${yyyy}/${mm}/print/${baseId}-${nameHint}.${printExt}`
  const webPath   = `submissions/${submissionType}/${yyyy}/${mm}/web/${baseId}-${nameHint}.webp`

  // ── Upload both ───────────────────────────────────────────────────────
  const supabase = admin()

  const [printResult, webResult] = await Promise.all([
    supabase.storage.from(BUCKET).upload(printPath, originalBuffer, {
      contentType: file.type,
      upsert:      false,
    }),
    supabase.storage.from(BUCKET).upload(webPath, webBuffer.data, {
      contentType: 'image/webp',
      upsert:      false,
    }),
  ])

  if (printResult.error) throw new Error(`Print upload failed: ${printResult.error.message}`)
  if (webResult.error)   throw new Error(`Web upload failed: ${webResult.error.message}`)

  const { data: printUrlData } = supabase.storage.from(BUCKET).getPublicUrl(printPath)
  const { data: webUrlData }   = supabase.storage.from(BUCKET).getPublicUrl(webPath)

  return {
    webImageUrl:   webUrlData.publicUrl,
    printImageUrl: printUrlData.publicUrl,
    width:         webBuffer.info.width,
    height:        webBuffer.info.height,
    originalSize:  file.size,
  }
}
