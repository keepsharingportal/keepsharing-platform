// /admin/distribution-log/print-queue — articles queued for print, grouped by issue.
//
// Designers pull from here to feed InDesign / their layout tool. Each row
// links to the print-friendly view + an export-as-text helper.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Newspaper, ExternalLink } from 'lucide-react'

export const metadata: Metadata = { title: 'Print Queue — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ArticleRow {
  id:                 string
  title:              string
  slug:               string
  brand_slug:         string
  author_name:        string | null
  print_issue_month:  string | null
  print_queued_at:    string | null
  published_at:       string | null
  excerpt:            string | null
}

export default async function PrintQueuePage() {
  const sb = supabaseAdmin()

  let migrated = true
  let articles: ArticleRow[] = []
  try {
    const probe = await sb.from('guide_articles').select('queue_for_print').limit(1)
    if (probe.error && /column .* does not exist/i.test(probe.error.message)) migrated = false
    else if (!probe.error) {
      const { data } = await sb
        .from('guide_articles')
        .select('id, title, slug, brand_slug, author_name, print_issue_month, print_queued_at, published_at, excerpt')
        .eq('queue_for_print', true)
        .eq('published', true)
        .order('print_issue_month', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .limit(200)
      articles = (data ?? []) as ArticleRow[]
    }
  } catch { /* ignore */ }

  // Group by issue.
  const byIssue = new Map<string, ArticleRow[]>()
  for (const a of articles) {
    const key = a.print_issue_month ?? '(no issue assigned)'
    if (!byIssue.has(key)) byIssue.set(key, [])
    byIssue.get(key)!.push(a)
  }
  const issues = Array.from(byIssue.keys()).sort((a, b) => {
    // Descending: most recent / future first; '(no issue assigned)' last.
    if (a === '(no issue assigned)') return 1
    if (b === '(no issue assigned)') return -1
    return b.localeCompare(a)
  })

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/distribution-log" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Distribution Log
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Newspaper size={16} className="text-portal-blue" />
          <h1 className="portal-page-title">Print Queue</h1>
        </div>
        <p className="portal-page-subtitle">
          Articles queued for the print issue, grouped by month. Each row links to a print-friendly view designers can copy from.
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 167 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/167_article_print_distribution.sql</code> to enable the print channel.
          </div>
        )}

        {migrated && articles.length === 0 && (
          <div className="bg-white border border-portal-border rounded-lg p-8 text-center text-sm text-portal-muted">
            Nothing queued for print. Toggle &quot;Queue for print on publish&quot; in the article editor to populate this list.
          </div>
        )}

        {migrated && issues.map(issue => {
          const rows = byIssue.get(issue) ?? []
          return (
            <section key={issue} className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-portal-border bg-portal-bg flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-portal-text">
                  {issue === '(no issue assigned)' ? issue : formatIssue(issue)}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-white border border-portal-border px-1.5 py-0.5 rounded-full">
                  {rows.length} {rows.length === 1 ? 'article' : 'articles'}
                </span>
              </div>
              <ul className="divide-y divide-portal-border">
                {rows.map(a => (
                  <li key={a.id} className="px-5 py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">{a.brand_slug}</span>
                        {a.author_name && <span className="text-[10px] text-portal-muted">{a.author_name}</span>}
                        {a.print_queued_at && <span className="text-[10px] text-portal-muted">Queued {new Date(a.print_queued_at).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-sm font-bold text-portal-text">{a.title}</p>
                      {a.excerpt && <p className="text-[11px] text-portal-muted mt-0.5 line-clamp-2">{a.excerpt}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/articles/${a.slug}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-portal-blue hover:text-portal-blue-dk text-xs font-bold inline-flex items-center gap-1"
                      >
                        Print view <ExternalLink size={9} />
                      </a>
                      <Link href={`/admin/articles/${a.id}/edit`} className="text-portal-sub hover:text-portal-text text-xs">
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function formatIssue(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number)
  if (!y || !m) return monthStr
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
