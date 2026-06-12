// Admin hero-slot management for the 50+ template.
//
//   GET    /api/admin/hero-slots?brand_slug=rr50plus
//     → { slots: [{ slot_number, article: { id, title, slug, hero_image_url, column_slug, published, ends_at } }, …] }
//     Returns ALL three slots (2, 3, 4) — slots with no article come back
//     as { slot_number, article: null } so the admin grid renders empties.
//
//   POST   /api/admin/hero-slots   body: { brand_slug, slot_number, article_id }
//     Assign an article to a slot. If the slot already has an article, the
//     response includes the displaced one so the admin can confirm the
//     swap. Use force=true in the body to skip the confirmation.
//
//   DELETE /api/admin/hero-slots   body: { brand_slug, slot_number }
//     Remove an article from a slot. Idempotent — removing an empty slot
//     is a no-op 200.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLOT_NUMBERS = [2, 3, 4] as const

function isFiftyPlusBrand(slug: string): boolean {
  return MARKETS.find(m => m.slug === slug)?.family === 'fifty-plus'
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const brandSlug = req.nextUrl.searchParams.get('brand_slug')
  if (!brandSlug) {
    return NextResponse.json({ error: 'brand_slug required' }, { status: 400 })
  }
  if (!isFiftyPlusBrand(brandSlug)) {
    return NextResponse.json({ error: 'hero slots are only available for fifty-plus brands' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data, error } = await sb.from('article_hero_slots')
    .select(`
      slot_number, added_at,
      article:guide_articles ( id, title, slug, hero_image_url, column_slug, published, ends_at, brand_slug )
    `)
    .eq('brand_slug', brandSlug)
    .order('slot_number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Materialize all three slots — empties come back as { slot_number, article: null }
  // so the admin grid always renders three boxes.
  type Row = {
    slot_number: number
    added_at:    string
    article:     { id: string; title: string; slug: string; hero_image_url: string | null; column_slug: string | null; published: boolean; ends_at: string | null; brand_slug: string } | null
  }
  // Supabase's typed-FK join returns the related row as an array (even
  // for an outbound FK where there's only one). Cast through unknown so
  // our Row type wins downstream.
  const rows = (data ?? []) as unknown as Row[]
  const slots = SLOT_NUMBERS.map(n => {
    const found = rows.find(r => r.slot_number === n)
    return found ?? { slot_number: n, added_at: '', article: null }
  })
  return NextResponse.json({ slots })
}

export async function POST(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({})) as { brand_slug?: string; slot_number?: number; article_id?: string; force?: boolean }
  const { brand_slug, slot_number, article_id, force } = body
  if (!brand_slug || typeof slot_number !== 'number' || !article_id) {
    return NextResponse.json({ error: 'brand_slug, slot_number, article_id required' }, { status: 400 })
  }
  if (!SLOT_NUMBERS.includes(slot_number as 2 | 3 | 4)) {
    return NextResponse.json({ error: 'slot_number must be 2, 3, or 4' }, { status: 400 })
  }
  if (!isFiftyPlusBrand(brand_slug)) {
    return NextResponse.json({ error: 'hero slots are only available for fifty-plus brands' }, { status: 400 })
  }

  const sb = createAdminClient()

  // Sanity: article exists, is published, and belongs to (or syndicates to) this brand.
  const { data: article, error: aErr } = await sb.from('guide_articles')
    .select('id, title, brand_slug, syndicated_to_brands, published')
    .eq('id', article_id).maybeSingle()
  if (aErr)    return NextResponse.json({ error: aErr.message }, { status: 500 })
  if (!article) return NextResponse.json({ error: 'article not found' }, { status: 404 })
  const reachable = article.brand_slug === brand_slug
    || (Array.isArray(article.syndicated_to_brands) && article.syndicated_to_brands.includes(brand_slug))
  if (!reachable) {
    return NextResponse.json({ error: `article does not belong to or syndicate to ${brand_slug}` }, { status: 400 })
  }
  if (!article.published) {
    return NextResponse.json({ error: 'article is not published — cannot feature in hero' }, { status: 400 })
  }

  // If the slot is occupied and force isn't set, surface the displacement.
  const { data: existing } = await sb.from('article_hero_slots')
    .select('article_id, article:guide_articles(id, title)')
    .eq('brand_slug', brand_slug)
    .eq('slot_number', slot_number).maybeSingle()
  if (existing && existing.article_id !== article_id && !force) {
    return NextResponse.json({
      error:  'slot_occupied',
      currentArticle: existing.article,
      hint:   're-submit with { force: true } to replace',
    }, { status: 409 })
  }

  const { error: upErr } = await sb.from('article_hero_slots').upsert({
    brand_slug,
    slot_number,
    article_id,
    added_at: new Date().toISOString(),
    added_by: ctx.adminId,
  }, { onConflict: 'brand_slug,slot_number' })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'hero_slot.assigned',
    target_table: 'article_hero_slots',
    target_id:    `${brand_slug}/${slot_number}`,
    after:        { brand_slug, slot_number, article_id, article_title: article.title },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const ctx  = await requireAdmin()
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const body = await req.json().catch(() => ({})) as { brand_slug?: string; slot_number?: number; article_id?: string }
  const { brand_slug, slot_number, article_id } = body
  if (!brand_slug) return NextResponse.json({ error: 'brand_slug required' }, { status: 400 })

  const sb = createAdminClient()
  let query = sb.from('article_hero_slots').delete().eq('brand_slug', brand_slug)
  if (typeof slot_number === 'number') query = query.eq('slot_number', slot_number)
  if (article_id) query = query.eq('article_id', article_id)
  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'hero_slot.removed',
    target_table: 'article_hero_slots',
    target_id:    `${brand_slug}/${slot_number ?? 'all'}`,
    after:        { brand_slug, slot_number, article_id },
  })
  return NextResponse.json({ ok: true })
}
