// ── Per-platform social image cropper ─────────────────────────────────
//
// Given a source image URL + a platform, returns a CDN-hosted URL of
// the correctly-cropped variant for that platform. Uses Sharp's
// attention-based crop strategy to find the most important subject
// in the source and keep it centered in the output.
//
// Output is cached in Supabase Storage so repeat requests are free.
// Cache key: hash of (source URL + platform) so re-cropping the same
// source for the same platform is idempotent.
//
// Platforms supported:
//   - facebook    : 1200×630  (1.91:1) — OG card
//   - instagram   : 1080×1080 (1:1)   — feed post
//   - instagram-story : 1080×1920 (9:16) — story
//   - twitter     : 1200×675  (16:9)  — large card
//   - pinterest   : 1000×1500 (2:3)   — pin

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import crypto from 'node:crypto'

export type SocialPlatform = 'facebook' | 'instagram' | 'instagram-story' | 'twitter' | 'pinterest'

const PLATFORM_DIMS: Record<SocialPlatform, { width: number; height: number; ratio: string }> = {
  'facebook':         { width: 1200, height: 630,  ratio: '1.91:1' },
  'instagram':        { width: 1080, height: 1080, ratio: '1:1' },
  'instagram-story':  { width: 1080, height: 1920, ratio: '9:16' },
  'twitter':          { width: 1200, height: 675,  ratio: '16:9' },
  'pinterest':        { width: 1000, height: 1500, ratio: '2:3' },
}

const BUCKET = 'social-crops'

function sbAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Returns a CDN-hosted URL of the cropped variant for the requested
 *  platform. Caches in social-crops bucket so subsequent calls for the
 *  same source+platform are O(1) lookups. */
export async function getOrCreateSocialCrop(
  sourceUrl: string,
  platform:  SocialPlatform,
): Promise<{ url: string; width: number; height: number; cached: boolean }> {
  const dims    = PLATFORM_DIMS[platform]
  const cacheKey = makeCacheKey(sourceUrl, platform)
  const storagePath = `${platform}/${cacheKey}.webp`

  const sb = sbAdmin()

  // Cache check — does the file already exist?
  const { data: existing } = await sb.storage.from(BUCKET).list(platform, {
    limit:  1,
    search: `${cacheKey}.webp`,
  })
  if (existing && existing.length > 0 && existing.some(f => f.name === `${cacheKey}.webp`)) {
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath)
    return { url: pub.publicUrl, width: dims.width, height: dims.height, cached: true }
  }

  // Fetch source, crop, upload.
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`Failed to fetch source image: ${res.status}`)
  const sourceBuffer = Buffer.from(await res.arrayBuffer())

  const cropped = await sharp(sourceBuffer)
    .resize({
      width:    dims.width,
      height:   dims.height,
      fit:      'cover',
      position: sharp.strategy.attention,
    })
    .webp({ quality: 85 })
    .toBuffer()

  const { error: uploadErr } = await sb.storage.from(BUCKET).upload(storagePath, cropped, {
    contentType: 'image/webp',
    upsert:      true,
    cacheControl: '31536000',  // 1 year
  })
  if (uploadErr) throw new Error(`Social crop upload failed: ${uploadErr.message}`)

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath)
  return { url: pub.publicUrl, width: dims.width, height: dims.height, cached: false }
}

/** Pre-generate crops for ALL relevant platforms in one pass. Used by
 *  the social queue dispatcher so each queue item ships with platform-
 *  appropriate images ready to send. */
export async function generateAllPlatformCrops(
  sourceUrl: string,
  platforms: SocialPlatform[],
): Promise<Record<SocialPlatform, string>> {
  const results: Partial<Record<SocialPlatform, string>> = {}
  for (const platform of platforms) {
    try {
      const { url } = await getOrCreateSocialCrop(sourceUrl, platform)
      results[platform] = url
    } catch (e) {
      console.error(`[social-crops] ${platform} failed:`, e instanceof Error ? e.message : e)
      // Fall back to source URL when the platform crop fails — partial
      // success is better than the whole queue item bouncing.
      results[platform] = sourceUrl
    }
  }
  return results as Record<SocialPlatform, string>
}

function makeCacheKey(sourceUrl: string, platform: SocialPlatform): string {
  const hash = crypto.createHash('sha256').update(`${sourceUrl}::${platform}`).digest('hex').slice(0, 24)
  return hash
}
