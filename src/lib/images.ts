// Small helpers for the image pipeline. Used by both server code (the upload
// API) and public-page rendering (deciding whether to let Next.js's runtime
// image optimizer run on an `<Image>` source).

/**
 * True if the URL is hosted on our Supabase Storage. Used to:
 *   - skip re-optimization in /api/admin/upload (already processed)
 *   - allow Next.js's image optimizer in <Image> (vs. external Unsplash/CDN
 *     URLs that we leave `unoptimized` to avoid quota costs)
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    return /supabase\.(co|in)/.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Decide whether to skip Next.js's runtime image optimizer for a given src.
 *
 * Rule of thumb:
 *   - Supabase Storage URL → run the optimizer (Sharp output benefits from
 *     responsive variants + AVIF/WebP per-browser)
 *   - Local /images/... path → run the optimizer (built-in next/image flow)
 *   - Anything else (Unsplash, external CDNs, legacy URLs) → unoptimized,
 *     since those sources usually have their own CDN + we don't want to pay
 *     the bandwidth cost on Vercel.
 */
export function shouldSkipNextOptimizer(src: string | null | undefined): boolean {
  if (!src) return true
  if (src.startsWith('/')) return false                 // local public asset
  if (isSupabaseStorageUrl(src)) return false           // our optimized output
  return true
}
