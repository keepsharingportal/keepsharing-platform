import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArticleReviewQueue } from './ArticleReviewQueue'

export const metadata: Metadata = { title: 'Article Review Queue — Admin' }

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function ArticleReviewPage() {
  const supabase = supabaseAdmin()

  const { data: articles } = await supabase
    .from('guide_articles')
    .select('id, title, slug, subtitle, author_byline, source_pdf_filename, source_issue_month, editorial_review_status, editorial_notes, imported_at, published_at, published')
    .in('editorial_review_status', ['pending', 'needs_edit', 'approved', 'rejected'])
    .order('source_issue_month', { ascending: false, nullsFirst: false })
    .order('imported_at', { ascending: false })
    .limit(200)

  const pending   = (articles ?? []).filter(a => a.editorial_review_status === 'pending')
  const needsEdit = (articles ?? []).filter(a => a.editorial_review_status === 'needs_edit')
  const approved  = (articles ?? []).filter(a => a.editorial_review_status === 'approved')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-portal-text">Article Review Queue</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            {pending.length} pending · {needsEdit.length} needs edit · {approved.length} approved
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/go/articles" className="text-sm text-portal-blue hover:text-portal-blue">
            View live articles ↗
          </Link>
        </div>
      </div>

      <div className="p-6">
        {(articles ?? []).length === 0 ? (
          <div className="bg-white rounded-lg border border-portal-border p-12 text-center">
            <p className="text-portal-sub text-base mb-4">No imported articles yet.</p>
            <p className="text-sm text-portal-muted">Run <code className="bg-portal-row-hover px-2 py-0.5 rounded">npm run import-articles</code> after dropping PDFs in <code className="bg-portal-row-hover px-2 py-0.5 rounded">/imports/magazines/</code></p>
          </div>
        ) : (
          <ArticleReviewQueue articles={articles ?? []} />
        )}
      </div>
    </div>
  )
}
