// PATCH /api/blogger/posts/[id] — update a post owned by the logged-in blogger
//
// Strictly enforces author_blogger_id ownership before applying any
// field change. Server-side gate, not RLS-only: we want the API to
// return a clean 403 if the wrong blogger calls it.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ALLOWED = new Set([
  'title', 'subtitle', 'excerpt', 'body', 'hero_image_url', 'published',
])

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing post id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const admin = createAdminClient()
  const { data: blogger } = await admin
    .from('bloggers')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!blogger) return NextResponse.json({ error: 'Blogger profile not linked' }, { status: 403 })

  const { data: existing } = await admin
    .from('guide_articles')
    .select('id, author_blogger_id, published, slug')
    .eq('id', id)
    .maybeSingle()

  if (!existing)                                  return NextResponse.json({ error: 'Post not found' },     { status: 404 })
  if (existing.author_blogger_id !== blogger.id)  return NextResponse.json({ error: 'Not your post' },      { status: 403 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) update[k] = v === '' ? null : v
  }

  // Stamp published_at the first time published flips true. Don't move it
  // backwards on re-publish.
  if ('published' in update) {
    if (update.published === true && !existing.published) {
      update.published_at            = new Date().toISOString()
      update.editorial_review_status = 'approved'
    } else if (update.published === false) {
      update.editorial_review_status = 'draft'
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 })
  }

  const { error } = await admin.from('guide_articles').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Revalidate touched paths
  revalidatePath('/mom-knows-best')
  revalidatePath(`/mom-knows-best/${blogger.slug}`)
  if (existing.slug) revalidatePath(`/articles/${existing.slug}`)
  if ('published' in update) revalidatePath('/')

  return NextResponse.json({ success: true })
}
