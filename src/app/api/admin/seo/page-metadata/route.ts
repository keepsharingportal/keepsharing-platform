// POST /api/admin/seo/page-metadata — upsert per-route override

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await requireSettingsAccess()
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.route_path !== 'string') {
    return NextResponse.json({ error: 'route_path required' }, { status: 400 })
  }

  const sb = createAdminClient()
  const row = {
    route_path:           (body.route_path as string).replace(/\/$/, '') || '/',
    brand_slug:           (body.brand_slug as string | null) ?? null,
    og_title:             (body.og_title as string | null) ?? null,
    og_description:       (body.og_description as string | null) ?? null,
    og_image_url:         (body.og_image_url as string | null) ?? null,
    twitter_card_type:    (body.twitter_card_type as string | null) ?? null,
    twitter_title:        (body.twitter_title as string | null) ?? null,
    twitter_description:  (body.twitter_description as string | null) ?? null,
    twitter_image_url:    (body.twitter_image_url as string | null) ?? null,
    pinterest_image_url:  (body.pinterest_image_url as string | null) ?? null,
    pinterest_description:(body.pinterest_description as string | null) ?? null,
    noindex:              !!body.noindex,
    canonical_override:   (body.canonical_override as string | null) ?? null,
    last_edited_at:       new Date().toISOString(),
    last_edited_by:       ctx.email ?? null,
  }

  // Upsert by (route_path, brand_slug) — Postgres unique index treats
  // NULL brand as distinct so we delete-then-insert when global.
  const isGlobal = row.brand_slug === null
  if (isGlobal) {
    await sb.from('page_metadata_overrides')
      .delete()
      .ilike('route_path', row.route_path)
      .is('brand_slug', null)
    const { error } = await sb.from('page_metadata_overrides').insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await sb.from('page_metadata_overrides').upsert(row, {
      onConflict: 'route_path,brand_slug',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
