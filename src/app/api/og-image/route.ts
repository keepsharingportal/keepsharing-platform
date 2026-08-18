// GET /api/og-image?src=<absolute image url>
//
// Returns a 1200×630 JPEG for use as og:image / twitter:image.
//
// Why this exists. Our upload pipeline outputs WebP, which is right for the
// site and wrong for social scrapers: Facebook's og:image support for WebP is
// inconsistent and is one of the reasons a link renders as the small
// side-thumbnail card instead of the big one. On top of that, buildPageMetadata
// declared og:image:width=1200 / height=630 on every page regardless of the
// real file — the Play Ball hero is actually 1600×900 — and a scraper that
// measures the image and finds it disagrees with the declared size will fall
// back to the small layout.
//
// Converting here fixes both at once and needs no backfill: every existing
// article gets a correct card immediately, and the declared dimensions become
// true because we produce exactly 1200×630.
//
// Scrapers hit this once per URL and then cache for weeks, so the conversion
// cost is negligible; the response is cached hard at the CDN regardless.

import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 30

const OG_WIDTH  = 1200
const OG_HEIGHT = 630
const QUALITY   = 85

// Only our own storage and site. Without this the route is an open image proxy
// anyone could point at arbitrary hosts, which is both an SSRF vector and a
// way to burn our bandwidth on someone else's images.
function isAllowed(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return (
    host.endsWith('.supabase.co') ||
    host === 'riverregionparents.com' ||
    host.endsWith('.riverregionparents.com')
  )
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get('src')
  if (!src) return NextResponse.json({ error: 'src required' }, { status: 400 })

  let target: URL
  try { target = new URL(src) } catch { return NextResponse.json({ error: 'src must be an absolute URL' }, { status: 400 }) }
  if (!isAllowed(target)) return NextResponse.json({ error: 'host not allowed' }, { status: 403 })

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Accept: 'image/*' },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!upstream.ok) {
      return NextResponse.json({ error: `source returned ${upstream.status}` }, { status: 502 })
    }

    const input = Buffer.from(await upstream.arrayBuffer())
    const jpeg  = await sharp(input)
      .rotate()
      // `cover` with the attention strategy keeps the subject when the source
      // isn't already 1.91:1 — the same strategy the hero pipeline uses.
      .resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: 'cover', position: sharp.strategy.attention })
      // Social cards render on white surfaces; flattening stops a transparent
      // PNG turning into a black rectangle in the feed.
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: QUALITY, progressive: true })
      .toBuffer()

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type':  'image/jpeg',
        'Content-Length': String(jpeg.length),
        // Immutable in practice: a new upload gets a new src, so the derived
        // URL changes with it.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[og-image] failed for %s: %s', src, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
