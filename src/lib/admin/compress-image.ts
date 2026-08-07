// Client-side image compression for upload paths that POST through
// Vercel serverless functions.
//
// Vercel caps API-route request bodies at ~4.5 MB. Phone photos are
// commonly 8-12 MB, and pro headshots can be 3-6 MB even at moderate
// dimensions (e.g. 2400×2400). Without downscaling + iterative quality
// stepping the multipart body returns HTTP 413 before the route handler
// even runs.
//
// Strategy: any file bigger than COMPRESS_TRIGGER_BYTES gets:
//   1. long-edge capped at COMPRESS_MAX_EDGE via createImageBitmap → canvas
//   2. re-encoded to JPEG at descending qualities until it fits under
//      COMPRESS_TARGET_BYTES (0.9 → 0.85 → 0.75 → 0.65 → 0.55)
//
// The server-side Sharp pipeline still resizes to its own 1600px webs +
// 400px thumbs, so the client-side output only needs to be "roughly big
// enough" — 2000px long edge is plenty for the largest use case
// (article hero 1600×900).
//
// Best-effort: any decode/encode failure returns the original file and
// lets the server-side validator respond (typically a friendlier
// per-image error than a generic 413).

export const COMPRESS_TRIGGER_BYTES = 1.0 * 1024 * 1024   // process anything bigger than this
const COMPRESS_TARGET_BYTES  = 3.0 * 1024 * 1024   // aim to land under this (safe under Vercel's ~4.5 MB body cap)
const COMPRESS_MAX_EDGE      = 2000                 // long-edge cap after resize
const QUALITY_LADDER         = [0.9, 0.85, 0.75, 0.65, 0.55] as const

export async function compressIfLarge(file: File): Promise<File> {
  if (file.size <= COMPRESS_TRIGGER_BYTES) return file
  // Canvas can't faithfully re-encode an animated GIF — pass through
  // and let the server respond if it's actually over the platform cap.
  if (file.type === 'image/gif') return file

  try {
    const bitmap = await (typeof createImageBitmap === 'function'
      ? createImageBitmap(file)
      : loadViaImg(file))

    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale    = longEdge > COMPRESS_MAX_EDGE ? COMPRESS_MAX_EDGE / longEdge : 1
    const targetW  = Math.round(bitmap.width  * scale)
    const targetH  = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width  = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

    // Iterate quality down until we're under the target byte size.
    // Fallback: if even the lowest quality still exceeds the target,
    // return that smallest attempt anyway — Vercel would 413 either way,
    // and a lower-quality JPEG at least has a chance.
    let bestBlob: Blob | null = null
    for (const q of QUALITY_LADDER) {
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q))
      if (!blob) continue
      bestBlob = blob
      if (blob.size <= COMPRESS_TARGET_BYTES) break
    }
    if (!bestBlob) return file
    // If the smallest attempt is still bigger than the original (rare —
    // usually happens on tiny files that shouldn't have hit us anyway),
    // keep the original.
    if (bestBlob.size >= file.size) return file

    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg'
    return new File([bestBlob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

function loadViaImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image for compression.'))
    img.src = URL.createObjectURL(file)
  }) as Promise<unknown> as Promise<HTMLImageElement>
}
