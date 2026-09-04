// Where a re-crop reads its pixels from.
//
// Four candidates, best first:
//
//   1. origPath recorded on the row — the untouched upload in a private
//      bucket, saved precisely so a re-crop can re-frame without compounding
//      loss.
//   2. origPath supplied by the client — the editor has uploaded an image in
//      this session but has NOT saved the record yet, so the path exists only
//      in form state. Without this, cropping is impossible until you save,
//      which is exactly when an editor wants to crop.
//   3. src supplied by the client — same situation, but the image was pasted
//      as a URL rather than uploaded, so there is no original at all.
//   4. The URL stored on the row — for images predating the original-saving
//      feature, or where the private-bucket write failed.
//
// Refusing when there is no saved original was the wrong trade. The served
// variant is 1600px on the long edge, comfortably above the 1600x900 hero and
// 800x800 profile these produce, so cropping from it is marginally softer at
// worst and enormously better than a dead button.
//
// Client-supplied values are host-allowlisted: this runs with the service role,
// so an unchecked URL would make it an SSRF proxy.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface CropSource {
  buffer: Buffer
  /** 'original' = full-resolution upload. 'derived' = the served variant. */
  from:   'original' | 'derived'
}

/** Our own storage and site only. */
export function isAllowedImageHost(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return h.endsWith('.supabase.co') || h.endsWith('.supabase.in')
        || h === 'riverregionparents.com' || h.endsWith('.riverregionparents.com')
  } catch { return false }
}

async function download(supabase: SupabaseClient, bucket: string, path: string): Promise<Buffer | null> {
  const dl = await supabase.storage.from(bucket).download(path)
  if (dl.error || !dl.data) {
    console.warn('[crop-source] could not read %s/%s: %s', bucket, path, dl.error?.message ?? 'no data')
    return null
  }
  return Buffer.from(await dl.data.arrayBuffer())
}

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { Accept: 'image/*' }, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Could not read the image (HTTP ${res.status}).`)
  return Buffer.from(await res.arrayBuffer())
}

export async function loadCropSource(args: {
  supabase:    SupabaseClient
  origBucket:  string
  /** Path recorded on the row. */
  origPath:    string | null | undefined
  /** Public URL recorded on the row. */
  fallbackUrl: string | null | undefined
  /** Path from unsaved editor state — image uploaded but record not saved. */
  clientOrigPath?: string | null
  /** URL from unsaved editor state. */
  clientSrc?:      string | null
}): Promise<CropSource> {
  const { supabase, origBucket, origPath, fallbackUrl, clientOrigPath, clientSrc } = args

  for (const p of [origPath, clientOrigPath]) {
    if (!p) continue
    const buf = await download(supabase, origBucket, p)
    if (buf) return { buffer: buf, from: 'original' }
  }

  // Unsaved paste beats the stored URL: it is the image the editor is looking
  // at, which is the one they mean to crop.
  for (const u of [clientSrc, fallbackUrl]) {
    if (!u) continue
    if (!isAllowedImageHost(u)) {
      console.warn('[crop-source] refusing off-site image host: %s', u.slice(0, 120))
      continue
    }
    return { buffer: await fetchImage(u), from: 'derived' }
  }

  throw new Error('No image to crop — add an image first, then save.')
}
