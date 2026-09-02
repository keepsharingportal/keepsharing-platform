// POST /api/admin/advertisers/[id]/recrop-hero
//
// Re-crop a listing hero from the saved original. Same two modes and the same
// 16:9 output as the article version — the featured listing card and the
// listing detail hero are landscape bands like an article hero, so a business
// gets identical framing control:
//
//   1) { gravity: 'attention' | 'entropy' | <compass> }
//   2) { region: { x, y, w, h } }   — normalised 0..1, from ArticleCropModal
//
// Returns { hero_photo_url } so the client can swap preview + form state.
//
// Why a separate route rather than reusing the article one: the source of
// truth is a different table and column (advertiser_accounts.hero_photo_url /
// .hero_photo_orig_path), the original lives in a different private bucket,
// and the cache-busting targets guide pages rather than article pages.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin/auth'
import { loadCropSource } from '@/lib/images/crop-source'

const BUCKET             = 'article-media'        // public — shared media bucket
const BUCKET_LISTING_ORIG = 'listing-hero-orig'   // private — saved originals
const HERO_CARD_WIDTH    = 1600
const HERO_CARD_HEIGHT   = 900
const WEB_QUALITY        = 82

export const runtime     = 'nodejs'
export const maxDuration = 60

const VALID_GRAVITIES = new Set([
  'attention', 'entropy', 'center',
  'north',     'south',   'east',     'west',
  'northeast', 'northwest', 'southeast', 'southwest',
])

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function storagePath(prefix: string, suffix: string) {
  const now = new Date()
  return `${prefix}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${suffix}`
}

function sharpPosition(g: string) {
  if (g === 'attention') return sharp.strategy.attention
  if (g === 'entropy')   return sharp.strategy.entropy
  return g
}

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing advertiser id' }, { status: 400 })

    const body    = await req.json().catch(() => ({}))
    const gravity = body?.gravity as string | undefined
    const region  = body?.region as { x?: number; y?: number; w?: number; h?: number } | undefined

    const hasRegion = region && [region.x, region.y, region.w, region.h].every(v => typeof v === 'number')
    if (!hasRegion && (!gravity || !VALID_GRAVITIES.has(gravity))) {
      return NextResponse.json({ error: 'Provide region {x, y, w, h} or a valid gravity' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: acct, error: lookupErr } = await supabase
      .from('advertiser_accounts')
      .select('hero_photo_orig_path, hero_photo_url, slug')
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })

    // Untouched upload when we have one, the served image otherwise. Heroes
    // pasted in as a URL and anything predating migration 227 have no saved
    // original, and refusing to crop those left the editor with a dead button
    // and no way forward. See lib/images/crop-source.
    let buffer: Buffer, sourceKind: 'original' | 'derived'
    try {
      const src = await loadCropSource({
        supabase,
        origBucket:  BUCKET_LISTING_ORIG,
        origPath:    acct?.hero_photo_orig_path as string | null | undefined,
        fallbackUrl: acct?.hero_photo_url as string | null | undefined,
      })
      buffer = src.buffer
      sourceKind = src.from
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the image' }, { status: 400 })
    }

    let cardOut: Buffer
    if (hasRegion) {
      const rotated = sharp(buffer).rotate()
      const meta    = await rotated.metadata()
      const W       = meta.width  ?? 0
      const H       = meta.height ?? 0
      const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

      let left   = Math.round(clamp01(region!.x!) * W)
      let top    = Math.round(clamp01(region!.y!) * H)
      let width  = Math.max(1, Math.round(clamp01(region!.w!) * W))
      let height = Math.max(1, Math.round(clamp01(region!.h!) * H))
      if (left + width  > W) left = W - width
      if (top  + height > H) top  = H - height
      if (left < 0) left = 0
      if (top  < 0) top  = 0

      cardOut = await sharp(buffer)
        .rotate()
        .extract({ left, top, width, height })
        .resize({ width: HERO_CARD_WIDTH, height: HERO_CARD_HEIGHT, fit: 'cover' })
        .webp({ quality: WEB_QUALITY })
        .toBuffer()
    } else {
      cardOut = await sharp(buffer)
        .rotate()
        .resize({
          width:    HERO_CARD_WIDTH,
          height:   HERO_CARD_HEIGHT,
          fit:      'cover',
          position: sharpPosition(gravity!),
        })
        .webp({ quality: WEB_QUALITY })
        .toBuffer()
    }

    // New object each time so cached copies of the old URL keep working until
    // the row update propagates.
    const uid     = crypto.randomUUID().slice(0, 8)
    const newPath = storagePath('listings', `${uid}-recrop.webp`)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    const up = await supabase.storage
      .from(BUCKET)
      .upload(newPath, cardOut, { contentType: 'image/webp', upsert: false })
    if (up.error) {
      return NextResponse.json({ error: `Re-crop upload failed: ${up.error.message}` }, { status: 500 })
    }

    const { data: { publicUrl: hero_photo_url } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

    // hero_photo_orig_path is deliberately untouched — the same original stays
    // the re-crop source, so the editor can keep re-framing indefinitely.
    const { error: updateErr } = await supabase
      .from('advertiser_accounts')
      .update({ hero_photo_url, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // The hero shows on the listing detail page and on featured cards across
    // every guide this advertiser appears in, so bust those too rather than
    // just the one page.
    const { data: guideRows } = await supabase
      .from('guide_listings')
      .select('guide_types ( url_slug )')
      .eq('advertiser_account_id', id)
      .eq('is_published', true)

    const urlSlugs = [...new Set(
      ((guideRows ?? []) as Array<{ guide_types?: { url_slug?: string } }>)
        .map(r => r.guide_types?.url_slug)
        .filter((s): s is string => Boolean(s)),
    )]
    for (const urlSlug of urlSlugs) {
      revalidatePath(`/${urlSlug}`)
      if (acct?.slug) revalidatePath(`/${urlSlug}/listings/${acct.slug}`)
    }

    return NextResponse.json({ hero_photo_url, mode: hasRegion ? 'region' : 'gravity', source: sourceKind, revalidated: urlSlugs })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[advertisers/recrop-hero] failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
