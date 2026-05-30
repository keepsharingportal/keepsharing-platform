// POST /api/admin/articles/[id]/recrop-hero
//
// Re-crop the hero from the saved original. Two modes:
//
//   1) { gravity: 'attention' | 'entropy' | <compass> }
//      Cover-crop to 16:9 using Sharp's strategy / compass position.
//
//   2) { region: { x: 0..1, y: 0..1, w: 0..1, h: 0..1 } }
//      Extract a user-drawn 16:9 rectangle from the original, then resize
//      to 1600×900. From the ArticleCropModal for precision framing.
//
// Returns: { hero_image_url } so the client can swap its preview + form
// state in one shot.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

const BUCKET            = 'article-media'
const BUCKET_HERO_ORIG  = 'article-hero-orig'
const HERO_CARD_WIDTH   = 1600
const HERO_CARD_HEIGHT  = 900
const WEB_QUALITY       = 82

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
  const now  = new Date()
  return `${prefix}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${suffix}`
}

// Map a string gravity to sharp's accepted position/strategy values.
function sharpPosition(g: string) {
  if (g === 'attention') return sharp.strategy.attention
  if (g === 'entropy')   return sharp.strategy.entropy
  return g
}

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body    = await req.json().catch(() => ({}))
    const gravity = body?.gravity as string | undefined
    const region  = body?.region as { x?: number; y?: number; w?: number; h?: number } | undefined

    const hasRegion = region && [region.x, region.y, region.w, region.h].every(v => typeof v === 'number')
    if (!hasRegion && (!gravity || !VALID_GRAVITIES.has(gravity))) {
      return NextResponse.json({ error: 'Provide region {x, y, w, h} or a valid gravity' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Look up the article so we know where the saved original lives. If the
    // article was uploaded before migration 100 there's no origPath and
    // re-crop isn't possible.
    const { data: article, error: lookupErr } = await supabase
      .from('guide_articles')
      .select('hero_image_orig_path, slug, column_slug')
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 })
    }
    const origPath = article?.hero_image_orig_path as string | null | undefined
    if (!origPath) {
      return NextResponse.json({ error: 'No saved original for this hero — upload a fresh image first.' }, { status: 400 })
    }

    // Download the original from the private bucket.
    const dl = await supabase.storage.from(BUCKET_HERO_ORIG).download(origPath)
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: `Could not read original: ${dl.error?.message ?? 'unknown'}` }, { status: 500 })
    }
    const buffer = Buffer.from(await dl.data.arrayBuffer())

    // Re-process. Same shape + quality as the original article-hero pipeline.
    // Region path: extract a user-drawn 16:9 rect, then resize to 1600×900.
    // Gravity path: cover-crop using the named strategy / compass position.
    let cardOut: Buffer
    if (hasRegion) {
      const rotated = sharp(buffer).rotate()
      const meta    = await rotated.metadata()
      const W       = meta.width  ?? 0
      const H       = meta.height ?? 0
      const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
      const xPct    = clamp01(region!.x!)
      const yPct    = clamp01(region!.y!)
      const wPct    = clamp01(region!.w!)
      const hPct    = clamp01(region!.h!)

      let left   = Math.round(xPct * W)
      let top    = Math.round(yPct * H)
      let width  = Math.max(1, Math.round(wPct * W))
      let height = Math.max(1, Math.round(hPct * H))
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

    // Upload as a new object so any cached copies of the previous URL keep
    // working until the row update propagates.
    const uid     = crypto.randomUUID().slice(0, 8)
    const newPath = storagePath('articles', `${uid}-recrop.webp`)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    const up = await supabase.storage
      .from(BUCKET)
      .upload(newPath, cardOut, { contentType: 'image/webp', upsert: false })
    if (up.error) {
      return NextResponse.json({ error: `Re-crop upload failed: ${up.error.message}` }, { status: 500 })
    }

    const { data: { publicUrl: hero_image_url } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

    // Persist the new hero on the article. We deliberately don't touch
    // hero_image_orig_path — the same original remains the re-crop source.
    const { error: updateErr } = await supabase
      .from('guide_articles')
      .update({ hero_image_url })
      .eq('id', id)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Bust the public-page cache so readers see the new crop immediately.
    revalidatePath('/')
    revalidatePath('/articles')
    if (article?.slug) {
      const slug       = article.slug as string
      const columnSlug = article.column_slug as string | null
      revalidatePath(`/articles/${slug}`)
      if (columnSlug) {
        const bareSlug = slug.replace(new RegExp(`^${columnSlug}-`), '')
        revalidatePath(`/columns/${columnSlug}/${bareSlug}`)
        revalidatePath(`/columns/${columnSlug}/${slug}`)
        revalidatePath(`/columns/${columnSlug}`)
      }
    }

    return NextResponse.json({ hero_image_url, mode: hasRegion ? 'region' : 'gravity' })
  } catch (e) {
    console.error('[POST recrop-hero] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
