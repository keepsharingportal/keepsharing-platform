// POST /api/admin/articles/[id]/recrop-profile
//
// Re-crop the profile image from the saved original using a manual gravity.
// Sibling of /recrop-hero — same flow, different bucket + target shape (1:1).
//
// Body: { gravity: 'attention' | 'entropy' | 'north' | ... | 'southeast' }
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

    const body    = await req.json().catch(() => ({}))
    const gravity = body?.gravity as string | undefined
    if (!gravity || !VALID_GRAVITIES.has(gravity)) {
      return NextResponse.json({ error: 'Invalid gravity' }, { status: 400 })
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

    const cardOut = await sharp(buffer)
      .rotate()
      .resize({
        width:    PROFILE_CARD_SIZE,
        height:   PROFILE_CARD_SIZE,
        fit:      'cover',
        position: sharpPosition(gravity),
      })
      .webp({ quality: WEB_QUALITY })
      .toBuffer()

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

    return NextResponse.json({ profile_image_url, gravity })
  } catch (e) {
    console.error('[POST recrop-profile] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
