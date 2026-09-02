// Where a re-crop reads its pixels from.
//
// The ideal source is the untouched upload kept in a private bucket, saved at
// upload time precisely so a re-crop can re-frame without compounding loss.
// But plenty of images have no such original:
//
//   * The 11 articles created 11-25 May 2026, before the feature existed.
//   * Anything set by pasting a URL that was already in our own storage —
//     that path short-circuits and never establishes an original.
//   * Any upload where the private-bucket write failed; the public URL is
//     still returned, deliberately, so a storage hiccup doesn't lose the image.
//
// Refusing to crop those is the wrong trade. The served variant is already
// 1600px on the long edge, which is more than a 1200x630 hero or an 800x800
// profile needs — so a crop from it is very slightly softer than one from the
// original, and enormously better than telling an editor the button doesn't
// work for their article.
//
// Callers get told which source was used so the response can say so.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface CropSource {
  buffer: Buffer
  /** 'original' = full-resolution upload. 'derived' = the served variant. */
  from:   'original' | 'derived'
}

export async function loadCropSource(args: {
  supabase:    SupabaseClient
  origBucket:  string
  origPath:    string | null | undefined
  /** Public URL of the currently-served image, used when there is no original. */
  fallbackUrl: string | null | undefined
}): Promise<CropSource> {
  const { supabase, origBucket, origPath, fallbackUrl } = args

  if (origPath) {
    const dl = await supabase.storage.from(origBucket).download(origPath)
    if (!dl.error && dl.data) {
      return { buffer: Buffer.from(await dl.data.arrayBuffer()), from: 'original' }
    }
    // Recorded but unreadable — bucket renamed, object pruned. Fall through
    // rather than failing, since the served image is still croppable.
    console.warn('[crop-source] original recorded but unreadable (%s/%s): %s',
      origBucket, origPath, dl.error?.message ?? 'no data')
  }

  if (!fallbackUrl) {
    throw new Error('No image to crop — upload one first.')
  }

  const res = await fetch(fallbackUrl, {
    headers: { Accept: 'image/*' },
    signal:  AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Could not read the current image (HTTP ${res.status}).`)
  return { buffer: Buffer.from(await res.arrayBuffer()), from: 'derived' }
}
