// Client-side image compression for upload paths that POST through
// Vercel serverless functions.
//
// Vercel caps API-route request bodies at ~4.5 MB. Phone photos are
// commonly 8–12 MB (and a single school-bits / events form can attach
// up to 3 of them), so without compression the multipart body returns
// HTTP 413 before the route handler even runs.
//
// We downscale any file bigger than COMPRESS_TRIGGER_BYTES on the
// browser side using createImageBitmap → canvas → JPEG. The result is
// still big enough (long edge up to COMPRESS_MAX_EDGE) that the
// server-side Sharp pipeline can produce its 1600×900 / 1200×675 final
// outputs without quality loss visible at card sizes.
//
// Best-effort: any decode/encode failure returns the original file and
// lets the server-side validator respond (typically a friendlier
// per-image error than a generic 413).

export const COMPRESS_TRIGGER_BYTES = 3.5 * 1024 * 1024   // resize files bigger than this
const COMPRESS_MAX_EDGE      = 3000                 // long-edge cap after resize
const COMPRESS_QUALITY       = 0.9                  // JPEG quality

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

    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', COMPRESS_QUALITY))
    if (!blob) return file
    // If the compressed version is somehow larger (rare; very small or
    // already-tight files), keep the original — no point uploading bloat.
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
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
