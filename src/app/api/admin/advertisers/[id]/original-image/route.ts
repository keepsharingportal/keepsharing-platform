// GET /api/admin/advertisers/[id]/original-image
//
// Streams the saved listing-hero original from the private listing-hero-orig
// bucket so the crop modal can render it as the source for an interactive crop
// box. Mirrors the article route of the same name.
//
// The cropper needs the ACTUAL original (3000+px) to display, so that a
// user-drawn crop box maps to real pixels in Sharp — not the already-cropped
// 1600×900 public variant, which has thrown that source detail away.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/auth'
import { isAllowedImageHost } from '@/lib/images/crop-source'

const BUCKET_LISTING_ORIG = 'listing-hero-orig'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing advertiser id' }, { status: 400 })

    const supabase = supabaseAdmin()
    const { data: acct, error: lookupErr } = await supabase
      .from('advertiser_accounts')
      .select('hero_photo_orig_path, hero_photo_url')
      .eq('id', id)
      .maybeSingle()

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 })

    // Same three-way source as the article version: the saved original, then
    // whatever the editor has picked but not saved yet, then the served image.
    // Cropping has to work on the image in front of them, not only on one the
    // row already knows about.
    const clientOrigPath = req.nextUrl.searchParams.get('origPath')
    const clientSrc      = req.nextUrl.searchParams.get('src')
    const origPath = (acct?.hero_photo_orig_path as string | null | undefined) ?? clientOrigPath

    if (!origPath) {
      const url = [clientSrc, acct?.hero_photo_url as string | null | undefined]
        .find(u => u && isAllowedImageHost(u))
      if (!url) return NextResponse.json({ error: 'No image to crop' }, { status: 404 })
      const res = await fetch(url, { headers: { Accept: 'image/*' } })
      if (!res.ok) return NextResponse.json({ error: `Could not read image (HTTP ${res.status})` }, { status: 502 })
      return new NextResponse(await res.blob(), {
        status: 200,
        headers: { 'Content-Type': res.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'private, max-age=300' },
      })
    }

    const dl = await supabase.storage.from(BUCKET_LISTING_ORIG).download(origPath)
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: dl.error?.message ?? 'Download failed' }, { status: 500 })
    }

    // Cache-Control private — an unpublished business photo must never sit on
    // a shared CDN tier.
    return new NextResponse(dl.data, {
      status: 200,
      headers: {
        'Content-Type':  dl.data.type || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e) {
    console.error('[GET advertisers/original-image] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
