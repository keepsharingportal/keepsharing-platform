// POST /api/admin/articles — create a new guide_article
// Uses service role key so RLS never blocks admin writes.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { columnToVerticalRowSlug } from '@/lib/content-taxonomy'
import { slugifyForUrl } from '@/lib/articles/slug'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      title, slug, subtitle, excerpt, body: articleBody,
      hero_image_url, profile_image_url, author_byline, author_name,
      column_slug, guide_slug, editorial_review_status,
      published, published_at, editorial_notes,
      source_issue_month, topics,
    } = body

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    // Force the slug to canonical form on the way in. This is the line of
    // defense against URLs like /articles/The%20Importance%20... — even if
    // a future form bypasses client-side slugification, the server saves a
    // clean slug. Idempotent: a clean slug passes through unchanged.
    const cleanSlug = slugifyForUrl(slug)
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Slug must contain at least one URL-safe character.' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Check slug uniqueness — ignore trashed articles so a trashed slug
    // doesn't block a fresh article. Probes for the deleted_at column first;
    // falls back to a plain check if the migration isn't applied yet.
    const probe = await supabase.from('guide_articles').select('deleted_at').limit(1)
    const hasTrashColumn = !probe.error

    let existingQ = supabase
      .from('guide_articles')
      .select('id')
      .eq('slug', cleanSlug)
    if (hasTrashColumn) existingQ = existingQ.is('deleted_at', null)
    const { data: existing } = await existingQ.maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An article with this slug already exists. Either change the URL slug or move the existing article to Trash first.' }, { status: 409 })
    }

    // author_name has a NOT NULL constraint in the DB. The new-article
    // form only collects one author field (author_byline), so we fan it
    // out into both columns. Final 'Staff' fallback means the insert
    // never fails on this.
    const resolvedByline = author_byline?.trim() || null
    const resolvedName   = author_name?.trim() || resolvedByline || 'Staff'

    const record = {
      title:                   title.trim(),
      slug:                    cleanSlug,
      subtitle:                subtitle?.trim() || null,
      excerpt:                 excerpt?.trim() || null,
      body:                    articleBody || null,
      hero_image_url:          hero_image_url?.trim() || null,
      profile_image_url:       profile_image_url?.trim() || null,
      author_byline:           resolvedByline,
      author_name:             resolvedName,
      column_slug:             column_slug || null,
      guide_slug:              guide_slug || column_slug || 'family-resource-guide',
      vertical_slug:           columnToVerticalRowSlug(column_slug),
      editorial_review_status: editorial_review_status || 'draft',
      published:               published === true,
      published_at:            published_at || null,
      import_status:           'manual',
      imported_at:             null,
      editorial_notes:         editorial_notes?.trim() || null,
      source_issue_month:      source_issue_month || null,
      topics:                  Array.isArray(topics) && topics.length > 0 ? topics : null,
    }

    const { data: created, error } = await supabase
      .from('guide_articles')
      .insert(record)
      .select('id, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (published) {
      revalidatePath('/articles')
      revalidatePath('/')
      revalidatePath('/family-resource-guide')
      if (column_slug === 'school-bits') {
        revalidatePath('/school-bits')
        revalidatePath('/school-zone')
      }
    }

    return NextResponse.json({ id: created.id, slug: created.slug })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
