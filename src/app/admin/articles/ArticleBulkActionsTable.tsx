'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, ImageOff, CheckCircle, RefreshCw, Archive, FileText } from 'lucide-react'
import { editorialStatusInfo, columnLabel, guideLabel } from '@/lib/content-taxonomy'

export interface ArticleRow {
  id: string
  title: string
  slug: string
  published: boolean
  editorial_review_status: string | null
  import_status: string | null
  column_slug: string | null
  guide_slug: string | null
  hero_image_url: string | null
  published_at: string | null
  source_issue_month: string | null
}

interface Props {
  articles: ArticleRow[]
}

type BulkAction = 'approve' | 'archive' | 'draft'

const BULK_LABELS: Record<BulkAction, string> = {
  approve: 'Approve & Publish',
  archive: 'Archive',
  draft:   'Move to Draft',
}

export function ArticleBulkActionsTable({ articles }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [acting,     setActing]      = useState(false)
  const [resultMsg,  setResultMsg]   = useState<{ text: string; ok: boolean } | null>(null)

  // ── Selection ──────────────────────────────────────────────────────────

  const allIds     = articles.map(a => a.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = selected.size > 0 && !allChecked

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(allIds))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Bulk action ────────────────────────────────────────────────────────

  async function runBulkAction(ids: string[], action: BulkAction) {
    setActing(true)
    setResultMsg(null)
    try {
      const res  = await fetch('/api/admin/articles/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ articleIds: ids, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResultMsg({ text: json.error ?? `Error ${res.status}`, ok: false })
        return
      }
      const label = BULK_LABELS[action]
      setResultMsg({ text: `✓ ${ids.length} article${ids.length !== 1 ? 's' : ''} — ${label}`, ok: true })
      setSelected(new Set())
      startTransition(() => router.refresh())
    } catch (e) {
      setResultMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setActing(false)
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm mb-3">No articles in this view.</p>
        <Link href="/admin/articles/new" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          Write your first article →
        </Link>
      </div>
    )
  }

  const busy = acting || isPending

  return (
    <div>
      {/* Result banner */}
      {resultMsg && (
        <div className={`mb-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
          resultMsg.ok
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {resultMsg.text}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-800 mr-1">
            {selected.size} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-blue-500 hover:text-blue-700 underline underline-offset-2"
          >
            Deselect All
          </button>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runBulkAction([...selected], 'approve')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve & Publish
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'draft')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors border border-gray-200"
            >
              <FileText size={12} />
              Move to Draft
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'archive')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors border border-gray-200"
            >
              <Archive size={12} />
              Archive
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mb-3 px-1">{articles.length} article{articles.length !== 1 ? 's' : ''}</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1.5rem_1fr_auto_auto_auto_auto] gap-x-3 items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allChecked}
              ref={el => { if (el) el.indeterminate = someChecked }}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              aria-label="Select all articles"
            />
          </div>
          <div className="w-5" />
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Title</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:block">Status</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:block">Section</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:block">Date</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {articles.map(a => {
            const isSelected = selected.has(a.id)
            const st   = editorialStatusInfo(a.editorial_review_status)
            const sec  = columnLabel(a.column_slug) !== '—'
              ? columnLabel(a.column_slug)
              : guideLabel(a.guide_slug)
            const date = a.published_at
              ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
              : a.source_issue_month
                ? new Date(a.source_issue_month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                : '—'

            const statusLabel = a.published ? 'Published' : st.label
            const statusColor = a.published ? 'bg-emerald-100 text-emerald-700' : st.color

            return (
              <div
                key={a.id}
                className={`grid grid-cols-[2rem_1.5rem_1fr_auto_auto_auto_auto] gap-x-3 items-center px-4 py-3 transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(a.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    aria-label={`Select ${a.title}`}
                  />
                </div>

                {/* Image indicator */}
                <div className="w-5 flex items-center justify-center">
                  {a.hero_image_url
                    ? <div className="w-2 h-2 rounded-full bg-green-400" title="Has hero image" />
                    : <span title="Missing hero image"><ImageOff size={12} className="text-red-300" /></span>
                  }
                </div>

                {/* Title + slug */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.title}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">/{a.slug}</p>
                </div>

                {/* Status */}
                <div className="hidden md:block">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Section */}
                <div className="hidden lg:block">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{sec}</span>
                </div>

                {/* Date */}
                <div className="hidden xl:block">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{date}</span>
                </div>

                {/* Row actions */}
                <div className="flex items-center gap-1">
                  {!a.published && (
                    <button
                      onClick={() => runBulkAction([a.id], 'approve')}
                      disabled={busy}
                      className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  <Link
                    href={`/admin/articles/${a.id}/edit`}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Edit
                  </Link>
                  {a.published && (
                    <Link
                      href={`/articles/${a.slug}`}
                      target="_blank"
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      title="View live article"
                    >
                      <Eye size={13} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
