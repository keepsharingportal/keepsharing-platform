// PATCH /api/admin/guides/[slug]
// Updates a guide's editable fields. Writes spread across two tables:
//   - guide_types     : display_name, pitch (subtitle), editorial_intro,
//                       short_description, hero_image_url
//   - guide_configs   : print_cover_url, issuu_url, homepage_image_url,
//                       primary_cta_label, primary_cta_url, is_active
//
// The slug is the guide_types.slug (e.g. 'summer-fun', 'newcomer').

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// Fields editable on guide_types
const TYPE_FIELDS = new Set([
  'display_name', 'pitch', 'editorial_intro', 'short_description', 'hero_image_url',
])

// Fields editable on guide_configs
const CONFIG_FIELDS = new Set([
  'print_cover_url', 'issuu_url', 'homepage_image_url', 'fallback_image_url',
  'primary_cta_label', 'primary_cta_url', 'sponsor_label', 'is_active',
])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  const typeUpdates:   Record<string, unknown> = {}
  const configUpdates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (TYPE_FIELDS.has(k))   typeUpdates[k]   = v === '' ? null : v
    if (CONFIG_FIELDS.has(k)) configUpdates[k] = v === '' ? null : v
  }

  if (Object.keys(typeUpdates).length === 0 && Object.keys(configUpdates).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // ── 1. Resolve the guide ─────────────────────────────────────────────────
  const { data: guide } = await supabase
    .from('guide_types')
    .select('slug, url_slug, display_name')
    .eq('slug', slug)
    .maybeSingle()

  if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

  // ── 2. Patch guide_types ─────────────────────────────────────────────────
  if (Object.keys(typeUpdates).length > 0) {
    const { error } = await supabase.from('guide_types').update(typeUpdates).eq('slug', slug)
    if (error) {
      console.error('[admin/guides] guide_types update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── 3. Upsert guide_configs ──────────────────────────────────────────────
  // A row should exist (migration 066 backfills), but upsert defensively.
  if (Object.keys(configUpdates).length > 0) {
    const { error } = await supabase
      .from('guide_configs')
      .upsert(
        {
          guide_type_slug: slug,
          title:           (typeUpdates.display_name as string | undefined) ?? guide.display_name,
          ...configUpdates,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'guide_type_slug' },
      )
    if (error) {
      console.error('[admin/guides] guide_configs upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // ── 4. Revalidate ────────────────────────────────────────────────────────
  // Public guide pages cache for an hour; refresh now so the editor sees their
  // changes immediately.
  if (guide.url_slug) {
    revalidatePath(`/${guide.url_slug}`)
    revalidatePath('/')
  }

  return NextResponse.json({ success: true })
}
