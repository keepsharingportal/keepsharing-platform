// POST /api/admin/articles/[id]/recrop-profile
//
// Re-crop the profile image from the saved original. Two modes:
//
//   1) { gravity: 'attention' | 'entropy' | <compass> }
//      Cover-crop to 1:1 using Sharp's strategy / compass position. Used by
//      the 9-direction GravityPicker for quick nudges.
//
//   2) { region: { x: 0..1, y: 0..1, size: 0..1 } }
//      Extract a user-drawn square from the original, then resize to 800×800.
//      Used by the interactive ArticleCropModal — gives precise zoom + pan
//      so an editor can tightly frame a face that auto-crop missed.
//
// Returns: { profile_image_url }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

const BUCKET              = 'article-media'
const BUCKET_PROFILE_ORIG = 'article-profile-orig'
const PROFILE_CARD_SIZE   = 800
const WEB_QUALITY         = 82

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
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body   = await req.json().catch(() => ({}))
    const region = body?.region as { x?: number; y?: number; size?: number } | undefined
    const gravity = body?.gravity as string | undefined

    // Either region OR gravity must be present — and only one. Region wins
    // when both happen to come in.
    const hasRegion = region && [region.x, region.y, region.size].every(v => typeof v === 'number')
    if (!hasRegion && (!gravity || !VALID_GRAVITIES.has(gravity))) {
      return NextResponse.json({ error: 'Provide region {x, y, size} or a valid gravity' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { data: article, error: lookupErr } = await supabase
      .from('guide_articles')
      .select('profile_image_orig_path, slug, column_slug')
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) {
      return NextResponse.json({ error: lookupErr.message }, { status: 500 })
    }
    const origPath = article?.profile_image_orig_path as string | null | undefined
    if (!origPath) {
      return NextResponse.json({ error: 'No saved original for this profile image — upload a fresh image first.' }, { status: 400 })
    }

    const dl = await supabase.storage.from(BUCKET_PROFILE_ORIG).download(origPath)
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: `Could not read original: ${dl.error?.message ?? 'unknown'}` }, { status: 500 })
    }
    const buffer = Buffer.from(await dl.data.arrayBuffer())

    // Two crop paths:
    //  Region: user drew a precise square — extract it, then resize to 800×800.
    //  Gravity: cover-crop using the named position (legacy compass behavior).
    let cardOut: Buffer
    if (hasRegion) {
      // sharp.rotate() applies EXIF rotation. We need the rotated dimensions
      // before computing pixel coords so the user's crop maps to what they
      // actually saw in the modal (which loaded the file with browser-applied
      // EXIF rotation).
      const rotated  = sharp(buffer).rotate()
      const meta     = await rotated.metadata()
      const W        = meta.width  ?? 0
      const H        = meta.height ?? 0
      const clamp01  = (n: number) => Math.max(0, Math.min(1, n))
      const xPct     = clamp01(region!.x!)
      const yPct     = clamp01(region!.y!)
      const sizePct  = clamp01(region!.size!)

      // Square in absolute pixels. Edge length is sizePct of the SHORTER
      // image edge so the box never exceeds the source.
      const shortest = Math.min(W, H)
      const edge     = Math.max(1, Math.round(sizePct * shortest))
      let left       = Math.round(xPct * W)
      let top        = Math.round(yPct * H)
      // Clamp so the extract stays inside the image
      if (left + edge > W) left = W - edge
      if (top  + edge > H) top  = H - edge
      if (left < 0) left = 0
      if (top  < 0) top  = 0

      cardOut = await sharp(buffer)
        .rotate()
        .extract({ left, top, width: edge, height: edge })
        .resize({ width: PROFILE_CARD_SIZE, height: PROFILE_CARD_SIZE, fit: 'cover' })
        .webp({ quality: WEB_QUALITY })
        .toBuffer()
    } else {
      cardOut = await sharp(buffer)
        .rotate()
        .resize({
          width:    PROFILE_CARD_SIZE,
          height:   PROFILE_CARD_SIZE,
          fit:      'cover',
          position: sharpPosition(gravity!),
        })
        .webp({ quality: WEB_QUALITY })
        .toBuffer()
    }

    const uid     = crypto.randomUUID().slice(0, 8)
    const newPath = storagePath('articles', `${uid}-profile-recrop.webp`)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    const up = await supabase.storage
      .from(BUCKET)
      .upload(newPath, cardOut, { contentType: 'image/webp', upsert: false })
    if (up.error) {
      return NextResponse.json({ error: `Re-crop upload failed: ${up.error.message}` }, { status: 500 })
    }

    const { data: { publicUrl: profile_image_url } } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

    const { error: updateErr } = await supabase
      .from('guide_articles')
      .update({ profile_image_url })
      .eq('id', id)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

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

    return NextResponse.json({ profile_image_url, mode: hasRegion ? 'region' : 'gravity' })
  } catch (e) {
    console.error('[POST recrop-profile] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
