// POST /api/blogger/posts — create a new post owned by the logged-in blogger
//
// Uses the SSR client to read the session cookie, then resolves the
// blogger row, then writes via service role (so we control the exact
// fields written and can stamp column_slug/vertical_slug correctly).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function slugify(text: string) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: blogger } = await admin
    .from('bloggers')
    .select('id, slug, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!blogger) return NextResponse.json({ error: 'Blogger profile not linked' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  const title = (body.title as string | undefined)?.trim()
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const baseSlug = `mom-knows-best-${slugify(title)}`
  // Ensure slug uniqueness by appending a short timestamp suffix on collision.
  const { data: collision } = await admin
    .from('guide_articles')
    .select('id')
    .eq('slug', baseSlug)
    .maybeSingle()
  const slug = collision ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug

  const published    = body.published === true
  const published_at = published ? new Date().toISOString() : null

  const record = {
    title,
    slug,
    subtitle:           (body.subtitle as string | null) ?? null,
    excerpt:            (body.excerpt  as string | null) ?? null,
    body:               (body.body     as string | null) ?? null,
    body_format:        'html',
    hero_image_url:     (body.hero_image_url as string | null) ?? null,
    column_slug:        'mom-knows-best',
    guide_slug:         'mom-knows-best',
    vertical_slug:      'mom-knows-best',
    author_blogger_id:  blogger.id,
    author_name:        blogger.display_name,
    author_byline:      blogger.display_name,
    editorial_review_status: published ? 'approved' : 'draft',
    published,
    published_at,
    import_status:      'manual',
  }

  const { data: created, error } = await admin
    .from('guide_articles')
    .insert(record)
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (published) {
    revalidatePath('/mom-knows-best')
    revalidatePath(`/mom-knows-best/${blogger.slug}`)
    revalidatePath('/')
  }

  return NextResponse.json({ id: created.id, slug: created.slug })
}
