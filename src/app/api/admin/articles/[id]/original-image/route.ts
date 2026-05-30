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
      .select(column)
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })

    const origPath = (article as Record<string, string | null> | null)?.[column]
    if (!origPath) return NextResponse.json({ error: `No saved original (${type})` }, { status: 404 })

    const dl = await supabase.storage.from(bucket).download(origPath)
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: dl.error?.message ?? 'Download failed' }, { status: 500 })
    }

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
