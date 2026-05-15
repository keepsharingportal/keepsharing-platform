// PATCH /api/admin/bloggers/[slug] — update blogger profile fields
// DELETE — set is_active=false (soft delete); posts authored by this blogger
// retain their author_blogger_id reference.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ALLOWED = new Set([
  'display_name', 'tagline', 'profile_image_url', 'family_image_url',
  'bio', 'quick_takes', 'is_active', 'display_order',
  'email',
])

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
  const { error } = await supabase.from('bloggers').update(updates).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/mom-knows-best')
  revalidatePath(`/mom-knows-best/${slug}`)
  revalidatePath('/')
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const supabase = createAdminClient()
  const { error } = await supabase.from('bloggers').update({ is_active: false }).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath('/mom-knows-best')
  return NextResponse.json({ success: true })
}
