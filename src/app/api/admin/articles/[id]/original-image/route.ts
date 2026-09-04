// GET /api/admin/articles/[id]/original-image?type=hero|profile
//
// Streams the saved original from the private article-hero-orig /
// article-profile-orig bucket so the admin cropper modal can render it as
// the source for an interactive crop box.
//
// The cropper needs the ACTUAL original (3000+px) to display so that a
// user-drawn crop box maps to real pixels in Sharp — not the already-cropped
// 1600×900 / 800×800 public variant which has thrown away source detail.
//
// Auth: the admin form already protects access to this route via the
// session check on /admin/* layouts. We trust the request and use the
// service-role client to download.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAllowedImageHost } from '@/lib/images/crop-source'

const BUCKET_HERO_ORIG    = 'article-hero-orig'
const BUCKET_PROFILE_ORIG = 'article-profile-orig'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const type = req.nextUrl.searchParams.get('type')
    if (type !== 'hero' && type !== 'profile') {
      return NextResponse.json({ error: 'type must be hero or profile' }, { status: 400 })
    }

    const column = type === 'hero' ? 'hero_image_orig_path' : 'profile_image_orig_path'
    const bucket = type === 'hero' ? BUCKET_HERO_ORIG       : BUCKET_PROFILE_ORIG

    const supabase = supabaseAdmin()
    const { data: article, error: lookupErr } = await supabase
      .from('guide_articles')
      .select(`${column}, ${type === 'hero' ? 'hero_image_url' : 'profile_image_url'}`)
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })

    // Falls back to the served image when there is no saved original, so the
    // zoom-and-adjust modal still opens. Same reasoning as the recrop routes —
    // see lib/images/crop-source. Without this the modal showed a broken image
    // for any article predating the original-saving feature.
    const row      = article as Record<string, string | null> | null
    const origPath = row?.[column]
    const fallback = row?.[type === 'hero' ? 'hero_image_url' : 'profile_image_url']

    // The editor may be cropping an image they just picked but have not saved,
    // in which case the row still holds NULL and only the client knows the
    // source. That is the common case — you choose a photo, then immediately
    // want to frame it. Host-allowlisted, since this runs as service role.
    const clientOrigPath = req.nextUrl.searchParams.get('origPath')
    const clientSrc      = req.nextUrl.searchParams.get('src')

    let bytes: Blob | null = null
    for (const p of [origPath, clientOrigPath]) {
      if (!p || bytes) continue
      const orig = await supabase.storage.from(bucket).download(p)
      if (!orig.error && orig.data) bytes = orig.data
    }
    if (!bytes) {
      const url = [clientSrc, fallback].find(u => u && isAllowedImageHost(u))
      if (!url) return NextResponse.json({ error: `No image to crop (${type})` }, { status: 404 })
      const res = await fetch(url, { headers: { Accept: 'image/*' } })
      if (!res.ok) return NextResponse.json({ error: `Could not read image (HTTP ${res.status})` }, { status: 502 })
      bytes = await res.blob()
    }
    const dl = { data: bytes }

    // Stream the bytes back. Browser caches in-tab for the cropper session.
    // Cache-Control: private — never let a CDN tier hold onto it.
    return new NextResponse(dl.data, {
      status: 200,
      headers: {
        'Content-Type':  dl.data.type || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e) {
    console.error('[GET original-image] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
