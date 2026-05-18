// PATCH /api/admin/articles/[id]   — update fields
// DELETE /api/admin/articles/[id]  — soft delete (move to trash) by default,
//                                    or permanent delete with ?permanent=true
// POST /api/admin/articles/[id]    — body { action: 'restore' } un-trashes
//
// All variants use the service role key (bypasses RLS).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { columnToVerticalRowSlug } from '@/lib/content-taxonomy'

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
      'hero_image_url', 'profile_image_url', 'author_byline', 'author_name',
      'author_blogger_id',
      'column_slug', 'guide_slug', 'vertical_slug',
      'editorial_review_status', 'published', 'published_at',
      'editorial_notes', 'source_issue_month',
    ]

    const update: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) update[key] = body[key]
    }

    // Auto-derive vertical_slug from column_slug if the column changed but
    // the caller didn't set vertical_slug explicitly. Keeps article ↔ vertical
    // links in sync without forcing every form to know the mapping.
    if ('column_slug' in update && !('vertical_slug' in update)) {
      update.vertical_slug = columnToVerticalRowSlug(update.column_slug as string | null)
    }

    // Defensive: author_name has a NOT NULL constraint. If the client
    // tries to clear it, fall back to whatever they sent for author_byline,
    // then 'Staff'. Prevents 'null value violates not-null constraint' on
    // forms that only collect a single author field.
    if ('author_name' in update && (update.author_name === null || update.author_name === '')) {
      const byline = (update.author_byline as string | null | undefined) ?? null
      update.author_name = (typeof byline === 'string' && byline.trim()) ? byline : 'Staff'
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

    // Revalidate public surfaces on every save so image/text/date changes are
    // visible immediately. Previously this only fired on publish/unpublish,
    // which meant a hero or profile-image swap could sit behind the 10-min
    // ISR cache before readers saw it.
    const slug       = body.slug as string | undefined
    const columnSlug = (body.column_slug as string | undefined) ?? (update.column_slug as string | undefined)
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath('/school-bits')
    revalidatePath('/school-zone')
    if (slug) {
      revalidatePath(`/articles/${slug}`)
      if (columnSlug) {
        // Column route uses the slug without the column prefix.
        const bareSlug = slug.replace(new RegExp(`^${columnSlug}-`), '')
        revalidatePath(`/columns/${columnSlug}/${bareSlug}`)
        revalidatePath(`/columns/${columnSlug}/${slug}`)
        revalidatePath(`/columns/${columnSlug}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[PATCH article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── DELETE — soft delete (trash) or permanent delete ─────────────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const url        = new URL(req.url)
    const permanent  = url.searchParams.get('permanent') === 'true'
    const supabase   = supabaseAdmin()

    // Pull the article so we can also revalidate its public routes.
    const { data: existing } = await supabase
      .from('guide_articles')
      .select('slug, column_slug')
      .eq('id', id)
      .maybeSingle()

    if (permanent) {
      const { error } = await supabase.from('guide_articles').delete().eq('id', id)
      if (error) {
        console.error('[DELETE article permanent]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('guide_articles')
        .update({ deleted_at: new Date().toISOString(), published: false })
        .eq('id', id)
      if (error) {
        console.error('[DELETE article soft]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Bust the public-page cache so a trashed/deleted article disappears now.
    revalidatePath('/')
    revalidatePath('/articles')
    if (existing?.slug) {
      const slug       = existing.slug as string
      const columnSlug = existing.column_slug as string | null
      revalidatePath(`/articles/${slug}`)
      if (columnSlug) {
        const bareSlug = slug.replace(new RegExp(`^${columnSlug}-`), '')
        revalidatePath(`/columns/${columnSlug}/${bareSlug}`)
        revalidatePath(`/columns/${columnSlug}/${slug}`)
        revalidatePath(`/columns/${columnSlug}`)
      }
    }

    return NextResponse.json({ success: true, permanent })
  } catch (e) {
    console.error('[DELETE article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST — restore a trashed article ─────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing article id' }, { status: 400 })

    const body   = await req.json().catch(() => ({}))
    const action = body?.action as string | undefined
    if (action !== 'restore') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { error } = await supabase
      .from('guide_articles')
      .update({ deleted_at: null })
      .eq('id', id)

    if (error) {
      console.error('[POST article restore]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    revalidatePath('/articles')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[POST article] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
