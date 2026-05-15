// PATCH /api/admin/verticals/[slug] — edit a vertical's identity fields.
// Writes go through the service-role admin client so RLS doesn't block.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ALLOWED = new Set([
  'display_name', 'subtitle', 'description',
  'hero_image_url', 'homepage_image_url', 'brand_color',
  'primary_cta_label', 'primary_cta_url',
  'sponsor_label',
  'is_active', 'display_order',
])

const PUBLIC_PATHS: Record<string, string> = {
  'school-zone':    '/school-zone',
  'mom-knows-best': '/mom-knows-best',
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) updates[k] = v === '' ? null : v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('verticals').update(updates).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Public page caches for 10min; bust now so the editor sees the change
  if (PUBLIC_PATHS[slug]) revalidatePath(PUBLIC_PATHS[slug])
  revalidatePath('/')

  return NextResponse.json({ success: true })
}
