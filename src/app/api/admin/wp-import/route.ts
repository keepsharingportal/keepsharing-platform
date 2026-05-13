// src/app/api/admin/wp-import/route.ts
// Receives pre-parsed WordPress article records from the browser import UI
// and bulk-inserts them into guide_articles.
// Deduplication: existing records matched by slug are skipped (not overwritten).
// Send in chunks of 20 from the client — each POST call is one chunk.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ArticleImportRow } from '@/lib/import/wp-xml-parser'

export type WpImportResult = {
  inserted:   number
  skipped:    number
  errors:     string[]
  rowResults: { slug: string; title: string; status: 'ok' | 'skipped' | 'error'; message?: string }[]
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const { rows }: { rows: ArticleImportRow[] } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }
    if (rows.length > 50) {
      return NextResponse.json({ error: 'Max 50 rows per request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const result: WpImportResult = { inserted: 0, skipped: 0, errors: [], rowResults: [] }

    // Load existing slugs for deduplication
    const slugsToCheck = rows.map(r => r.slug)
    const { data: existing } = await supabase
      .from('guide_articles')
      .select('slug')
      .in('slug', slugsToCheck)

    const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))

    for (const row of rows) {
      try {
        if (existingSlugs.has(row.slug)) {
          result.skipped++
          result.rowResults.push({ slug: row.slug, title: row.title, status: 'skipped', message: 'Slug already exists' })
          continue
        }

        // Derive guide_slug — DB column has NOT NULL constraint.
        // Priority: explicit value → column_slug mapping → safe default.
        const guideSlug =
          row.guide_slug?.trim() ||
          (row.column_slug === 'school-bits'    ? 'school-bits' :
           row.column_slug === 'summer-content' ? 'summer-fun'  :
           'family-resource-guide')

        const record = {
          title:                   row.title,
          slug:                    row.slug,
          subtitle:                row.subtitle,
          excerpt:                 row.excerpt,
          body:                    row.body_content,
          hero_image_url:          row.hero_image_url,
          author_byline:           row.author_byline,
          author_name:             row.author_name,
          column_slug:             row.column_slug,
          guide_slug:              guideSlug,
          source_pdf_filename:     row.source_pdf_filename,
          source_issue_month:      row.source_issue_month,
          published:               false,
          editorial_review_status: 'pending',
          import_status:           'imported',
          published_at:            null,
          imported_at:             new Date().toISOString(),
          editorial_notes:         row.wp_post_id ? `Imported from WordPress post ID ${row.wp_post_id}` : null,
        }

        const { error } = await supabase.from('guide_articles').insert(record)

        if (error) {
          const msg = `Insert failed: ${error.message}`
          result.errors.push(`${row.slug}: ${msg}`)
          result.rowResults.push({ slug: row.slug, title: row.title, status: 'error', message: msg })
        } else {
          existingSlugs.add(row.slug)
          result.inserted++
          result.rowResults.push({ slug: row.slug, title: row.title, status: 'ok' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        result.errors.push(`${row.slug}: ${msg}`)
        result.rowResults.push({ slug: row.slug, title: row.title, status: 'error', message: msg })
      }
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
