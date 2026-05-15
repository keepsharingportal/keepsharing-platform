// POST /api/admin/bloggers — create a new blogger
// GET  /api/admin/bloggers — list (admin queue; small response)

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function toSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bloggers')
    .select('id, slug, display_name, tagline, profile_image_url, is_active, display_order, created_at')
    .order('display_order', { ascending: true })
    .order('display_name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bloggers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    display_name?: string; slug?: string; tagline?: string
  }
  if (!body.display_name?.trim()) {
    return NextResponse.json({ error: 'display_name required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Slug: use provided, else derive from display_name. Suffix if collides.
  let slug = body.slug?.trim() || toSlug(body.display_name)
  for (let i = 2; i < 50; i++) {
    const { data: clash } = await supabase
      .from('bloggers').select('id').eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${toSlug(body.display_name)}-${i}`
  }

  const { data, error } = await supabase
    .from('bloggers')
    .insert({
      slug,
      display_name: body.display_name.trim(),
      tagline:      body.tagline?.trim() || null,
      is_active:    true,
    })
    .select('id, slug')
    .single()

  if (error) {
    console.error('[admin/bloggers] create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/mom-knows-best')

  return NextResponse.json({ success: true, id: data.id, slug: data.slug })
}
