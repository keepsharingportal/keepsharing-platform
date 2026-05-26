// GET /api/school-bits/[id]/images   (PUBLIC)
//
// Returns every image attached to the bit (1-3 photos, with the hero first).
// Used by the lightbox/gallery modal when a reader clicks a card. Each image
// returns its natural-aspect web URL so vertical photos stay vertical and
// horizontal photos stay horizontal.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = supabaseAdmin()

  // Probe — graceful fallback if migration 086 isn't applied
  const probe = await supabase.from('school_bit_images').select('id').limit(1)
  if (probe.error) {
    // Pre-multi-image bit: fall back to the snapshot on school_bits
    const { data: bit } = await supabase
      .from('school_bits')
      .select('image_web_url, image_width, image_height')
      .eq('id', id)
      .maybeSingle()
    if (!bit) return NextResponse.json({ images: [] })
    const b = bit as { image_web_url: string | null; image_width: number | null; image_height: number | null }
    if (!b.image_web_url) return NextResponse.json({ images: [] })
    return NextResponse.json({
      images: [{ position: 0, is_hero: true, web_url: b.image_web_url, card_url: b.image_web_url, width: b.image_width, height: b.image_height }],
    })
  }

  const { data, error } = await supabase
    .from('school_bit_images')
    .select('position, is_hero, web_url, card_url, width, height')
    .eq('bit_id', id)
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ images: [], error: error.message }, { status: 500 })
  return NextResponse.json({ images: data ?? [] })
}
