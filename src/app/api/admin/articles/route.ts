// POST /api/admin/articles — create a new guide_article
// Uses service role key so RLS never blocks admin writes.

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      title, slug, subtitle, excerpt, body: articleBody,
      hero_image_url, profile_image_url, author_byline, author_name,
      column_slug, guide_slug, editorial_review_status,
      published, published_at, editorial_notes,
      source_issue_month,
    } = body

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('guide_articles')
      .select('id')
      .eq('slug', slug.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'A article with this slug already exists. Change the URL slug.' }, { status: 409 })
    }

    // author_name has a NOT NULL constraint in the DB. The new-article
    // form only collects one author field (author_byline), so we fan it
    // out into both columns. Final 'Staff' fallback means the insert
    // never fails on this.
    const resolvedByline = author_byline?.trim() || null
    const resolvedName   = author_name?.trim() || resolvedByline || 'Staff'

    const record = {
      title:                   title.trim(),
      slug:                    slug.trim(),
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
