'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { articleHref } from '@/lib/articles/slug'

interface Article {
  id: string
  title: string
  slug: string
  subtitle?: string | null
  author_byline?: string | null
  source_pdf_filename?: string | null
  source_issue_month?: string | null
  editorial_review_status: string
  editorial_notes?: string | null
  imported_at?: string | null
  published_at?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-portal-amber-lt text-portal-amber ring-1 ring-amber-200',
  needs_edit:'bg-portal-blue-lt text-portal-blue ring-1 ring-portal-blue/30',
  approved:  'bg-green-50 text-green-700 ring-1 ring-green-200',
  rejected:  'bg-red-50 text-red-600 ring-1 ring-red-200',
}

type FilterStatus = 'all' | 'pending' | 'needs_edit' | 'approved' | 'rejected'

function ArticleCard({ article, onAction }: { article: Article; onAction: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notes, setNotes] = useState(article.editorial_notes ?? '')

  async function act(status: string) {
    setActing(true)
    setActionError(null)
    try {
      const res = await fetch('/api/admin/articles/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, status, notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(json.error ?? `Server error ${res.status}`)
        return
      }
      onAction(article.id, status)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setActing(false)
    }
  }

  const issueMonth = article.source_issue_month
    ? new Date(article.source_issue_month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-gray-900 truncate">{article.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[article.editorial_review_status] ?? ''}`}>
              {article.editorial_review_status}
            </span>
          </div>
          {article.subtitle && (
            <p className="text-xs text-gray-500 truncate mb-1">{article.subtitle}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {article.author_byline && <span>{article.author_byline}</span>}
            {issueMonth && <span>{issueMonth}</span>}
            {article.source_pdf_filename && <span className="truncate max-w-[200px]">{article.source_pdf_filename}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={articleHref(article)}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded text-gray-400 hover:text-portal-blue hover:bg-portal-blue-lt transition-colors"
            title="Preview"
          >
            <ExternalLink size={14} />
          </Link>
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href={`/admin/articles/${article.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit Article
            </Link>
          </div>

          {article.editorial_review_status !== 'approved' && (
            <>
              <div className="mb-3">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Editorial notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-y min-h-[56px]"
                  placeholder="Notes for DeAnne or yourself..."
                />
              </div>

              {actionError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  ⚠ Approval failed: {actionError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => act('approved')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check size={13} /> Approve & Publish
                </button>
                <button
                  onClick={() => act('needs_edit')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-portal-navy text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  <AlertCircle size={13} /> Needs Edit
                </button>
                <button
                  onClick={() => act('rejected')}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </>
          )}

          {article.editorial_review_status === 'approved' && (
            <p className="text-xs text-green-700 font-medium">✓ Published at /articles/{article.slug}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ArticleReviewQueue({ articles }: { articles: Article[] }) {
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState(articles)

  function handleAction(id: string, status: string) {
    setItems(prev => prev.map(a => a.id === id ? { ...a, editorial_review_status: status } : a))
  }

  const filtered = items.filter(a => {
    if (filter !== 'all' && a.editorial_review_status !== filter) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    pending:   items.filter(a => a.editorial_review_status === 'pending').length,
    needs_edit: items.filter(a => a.editorial_review_status === 'needs_edit').length,
    approved:  items.filter(a => a.editorial_review_status === 'approved').length,
    rejected:  items.filter(a => a.editorial_review_status === 'rejected').length,
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {(['all', 'pending', 'needs_edit', 'approved', 'rejected'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {f === 'needs_edit' ? 'Needs Edit' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f as keyof typeof counts] > 0 && ` (${counts[f as keyof typeof counts]})`}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search by title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          No articles match this filter.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(article => (
            <ArticleCard key={article.id} article={article} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}
