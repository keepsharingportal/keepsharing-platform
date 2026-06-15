// ── /admin/seo/bulk ───────────────────────────────────────────────────────
//
// Bulk SEO operations across the article corpus. Filter by column /
// score / has-focus-keyword, multi-select, apply: find-and-replace
// in SEO titles or descriptions, set focus keyword for a batch, or
// trigger a re-score.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BulkClient } from './BulkClient'
import { ArrowLeft, ListChecks } from 'lucide-react'

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
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(500)
  const rows = (data ?? []) as ArticleRow[]

  // Distinct columns for the filter dropdown.
  const columns = Array.from(new Set(rows.map(r => r.column_slug).filter(Boolean))) as string[]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <ListChecks size={16} className="inline -translate-y-0.5 mr-1" /> Bulk SEO
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Filter, multi-select, and apply changes across many articles at once. Edits write straight to guide_articles
          and re-score the affected rows.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <BulkClient initialRows={rows} columns={columns} />
        </div>
      </div>
    </div>
  )
}
