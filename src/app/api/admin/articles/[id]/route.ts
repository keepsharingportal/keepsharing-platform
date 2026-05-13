// PATCH /api/admin/articles/[id]
// Updates article fields via service role key (bypasses RLS).
// Caller passes exactly the fields to change; undefined keys are ignored.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body = await req.json()

    // Only allow known columns to prevent mass-assignment
    const ALLOWED = [
      'title', 'slug', 'subtitle', 'excerpt', 'body', 'body_format',
      'hero_image_url', 'author_byline', 'author_name',
      'column_slug', 'guide_slug',
      'editorial_review_status', 'published', 'published_at',
      'editorial_notes', 'source_issue_month',
    ]

    const update: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { error } = await supabase.from('guide_articles').update(update).eq('id', id)

    if (error) {
      console.error('[PATCH article] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate public pages if the article is being published or unpublished
    if ('published' in update || 'editorial_review_status' in update) {
      const slug = body.slug as string | undefined
      revalidatePath('/')
      revalidatePath('/articles')
      revalidatePath('/school-bits')
      revalidatePath('/school-zone')
      if (slug) revalidatePath(`/articles/${slug}`)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[PATCH article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
