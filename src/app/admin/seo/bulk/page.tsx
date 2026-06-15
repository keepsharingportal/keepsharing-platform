// ── /admin/seo/bulk ───────────────────────────────────────────────────────
//
// Bulk SEO operations across the article corpus. Filter by column /
// score / has-focus-keyword, multi-select, apply: find-and-replace
// in SEO titles or descriptions, set focus keyword for a batch, or
// trigger a re-score.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BulkClient } from './BulkClient'

export const metadata: Metadata = { title: 'Bulk SEO — Admin' }
export const dynamic = 'force-dynamic'

interface ArticleRow {
  id:                string
  title:             string
  slug:              string
  column_slug:       string | null
  seo_title:         string | null
  seo_description:   string | null
  seo_focus_keyword: string | null
  seo_score:         number | null
  published_at:      string | null
}

export default async function BulkSeoPage() {
  await requireAdmin()
  const sb = createAdminClient()
  const { data } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, seo_title, seo_description, seo_focus_keyword, seo_score, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(500)
  const rows = (data ?? []) as ArticleRow[]

  // Distinct columns for the filter dropdown.
  const columns = Array.from(new Set(rows.map(r => r.column_slug).filter(Boolean))) as string[]

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">Bulk SEO</h1>
          <div className="text-muted text-sm">
            Filter, multi-select, and apply changes across many articles at once. Edits write straight to guide_articles
            and re-score the affected rows.
          </div>
        </div>
      </div>
      <div className="content-body overflow-y-auto">
        <BulkClient initialRows={rows} columns={columns} />
      </div>
    </div>
  )
}
