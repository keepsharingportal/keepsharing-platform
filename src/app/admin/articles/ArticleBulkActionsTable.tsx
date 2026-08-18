'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye, ImageOff, CheckCircle, RefreshCw, Archive, FileText, Trash2,
  ChevronUp, ChevronDown, ArrowUpDown, BarChart3,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { editorialStatusInfo, columnLabel, guideLabel } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import { marketShort, publicUrl } from '@/lib/markets'

export type SortKey = 'newest' | 'oldest' | 'views' | 'title'

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
  view_count: number | null
  brand_slug: string | null
  syndicated_to_brands: string[] | null
}

interface Props {
  articles:     ArticleRow[]
  total:        number
  page:         number
  pageSize:     number
  totalPages:   number
  activeSort:   SortKey
  activeFilter: string
}

type BulkAction = 'approve' | 'archive' | 'draft' | 'trash'

const BULK_LABELS: Record<BulkAction, string> = {
  approve: 'Approve & Publish',
  archive: 'Archive',
  draft:   'Move to Draft',
  trash:   'Moved to Trash',
}

function fmtViews(n: number | null): string {
  if (!n || n <= 0) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return n.toString()
}

function buildQuery(opts: { filter: string; sort: SortKey; page: number }) {
  const params = new URLSearchParams()
  if (opts.filter !== 'all') params.set('filter', opts.filter)
  if (opts.sort   !== 'newest') params.set('sort', opts.sort)
  if (opts.page   !== 1)      params.set('page', String(opts.page))
  const qs = params.toString()
  return qs ? `/admin/articles?${qs}` : '/admin/articles'
}

export function ArticleBulkActionsTable({
  articles, total, page, pageSize, totalPages, activeSort, activeFilter,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [acting,    setActing]    = useState(false)
  const [resultMsg, setResultMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // ── Selection ──────────────────────────────────────────────────────────

  const allIds      = articles.map(a => a.id)
  const allChecked  = allIds.length > 0 && allIds.every(id => selected.has(id))
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
    if (action === 'trash') {
      const noun = ids.length === 1 ? 'article' : `${ids.length} articles`
      if (!confirm(`Move ${noun} to Trash? You can restore from /admin/articles/trash.`)) return
    }
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

  // ── Sort helpers ───────────────────────────────────────────────────────
  // Top-views filter locks the sort, so we hide the indicator there.
  const sortLocked = activeFilter === 'top-views'

  function sortHref(next: SortKey) {
    return buildQuery({ filter: activeFilter, sort: next, page: 1 })
  }

  // Click "Date" toggles newest ↔ oldest. Click "Views" sets views. Title toggles in.
  const dateNextSort: SortKey = activeSort === 'newest' ? 'oldest' : 'newest'
  const showDateIndicator = activeSort === 'newest' || activeSort === 'oldest'
  const showViewsIndicator = activeSort === 'views'
  const showTitleIndicator = activeSort === 'title'

  // ── Empty state ────────────────────────────────────────────────────────

  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-portal-border p-12 text-center">
        <p className="text-portal-sub text-sm mb-3">No articles in this view.</p>
        <Link href="/admin/articles/new" className="text-sm font-semibold text-portal-blue hover:text-portal-blue">
          Write your first article →
        </Link>
      </div>
    )
  }

  const busy = acting || isPending
  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, total)

  return (
    <div>
      {/* Result banner */}
      {resultMsg && (
        <div className={`mb-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
          resultMsg.ok
            ? 'bg-portal-green-lt border border-portal-green/30 text-portal-green'
            : 'bg-portal-red-lt border border-portal-red/30 text-portal-red'
        }`}>
          {resultMsg.text}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-portal-blue-lt border border-portal-blue/30 rounded-lg">
          <span className="text-sm font-semibold text-portal-blue mr-1">
            {selected.size} selected
          </span>
          <button
            onClick={toggleAll}
            className="text-xs font-semibold text-portal-blue hover:text-portal-blue underline underline-offset-2"
          >
            Deselect All
          </button>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runBulkAction([...selected], 'approve')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-portal-green text-white text-xs font-semibold rounded-lg hover:bg-portal-green disabled:opacity-50 transition-colors"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approve & Publish
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'draft')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-portal-row-hover text-portal-text text-xs font-semibold rounded-lg hover:bg-portal-border-2 disabled:opacity-50 transition-colors border border-portal-border"
            >
              <FileText size={12} />
              Move to Draft
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'archive')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-portal-row-hover text-portal-sub text-xs font-semibold rounded-lg hover:bg-portal-border-2 disabled:opacity-50 transition-colors border border-portal-border"
            >
              <Archive size={12} />
              Archive
            </button>
            <button
              onClick={() => runBulkAction([...selected], 'trash')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-portal-red text-xs font-semibold rounded-lg hover:bg-portal-red-lt disabled:opacity-50 transition-colors border border-portal-red/30"
            >
              <Trash2 size={12} />
              Move to Trash
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-portal-muted">
          {total === 0
            ? 'No articles'
            : `Showing ${rangeStart}–${rangeEnd} of ${total} article${total !== 1 ? 's' : ''}`}
        </p>
        {totalPages > 1 && (
          <p className="text-[11px] text-portal-muted">Page {page} of {totalPages}</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1.25rem_1fr_8rem_10rem_5rem_6rem_8rem] gap-x-6 items-center px-4 py-2 border-b border-portal-border bg-portal-bg">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allChecked}
              ref={el => { if (el) el.indeterminate = someChecked }}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-portal-border-2 text-portal-blue cursor-pointer"
              aria-label="Select all articles"
            />
          </div>
          <div />
          <Link
            href={sortHref('title')}
            scroll={false}
            className="text-[11px] font-semibold text-portal-muted uppercase tracking-wider hover:text-portal-blue inline-flex items-center gap-1"
            title="Sort by title A→Z"
          >
            Title
            {showTitleIndicator
              ? <ChevronDown size={11} />
              : <ArrowUpDown size={10} className="opacity-40" />}
          </Link>
          <div className="text-[11px] font-semibold text-portal-muted uppercase tracking-wider hidden md:block">Status</div>
          <div className="text-[11px] font-semibold text-portal-muted uppercase tracking-wider hidden lg:block">Section</div>
          <Link
            href={sortHref('views')}
            scroll={false}
            className={`text-[11px] font-semibold uppercase tracking-wider hidden md:inline-flex items-center gap-1 ${
              showViewsIndicator ? 'text-portal-blue' : 'text-portal-muted hover:text-portal-blue'
            }`}
            title="Sort by views (highest first)"
          >
            <BarChart3 size={10} />
            Views
            {showViewsIndicator && <ChevronDown size={11} />}
          </Link>
          <Link
            href={sortLocked ? '#' : sortHref(dateNextSort)}
            scroll={false}
            className={`text-[11px] font-semibold uppercase tracking-wider hidden xl:inline-flex items-center gap-1 ${
              sortLocked ? 'opacity-40 pointer-events-none' : showDateIndicator ? 'text-portal-blue' : 'text-portal-muted hover:text-portal-blue'
            }`}
            title={activeSort === 'newest' ? 'Sort oldest first' : 'Sort newest first'}
          >
            Date
            {showDateIndicator
              ? (activeSort === 'newest' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)
              : <ArrowUpDown size={10} className="opacity-40" />}
          </Link>
          <div className="text-[11px] font-semibold text-portal-muted uppercase tracking-wider">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-portal-border">
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

            // Publish/draft state is shown by the leading dot (green=published,
            // orange=draft). The Status column is reserved for non-routine
            // states that need attention — review/revision/imported.
            const isDraft = !a.published && (a.editorial_review_status === 'draft' || !a.editorial_review_status)
            const dotColor = a.published ? 'bg-portal-green' : isDraft ? 'bg-portal-amber' : 'bg-portal-border-2'
            const dotTitle = a.published ? 'Published' : isDraft ? 'Draft' : st.label
            const showStatusPill = !a.published && !isDraft

            return (
              <div
                key={a.id}
                className={`grid grid-cols-[2rem_1.25rem_1fr_8rem_10rem_5rem_6rem_8rem] gap-x-6 items-center px-4 py-3 transition-colors ${
                  isSelected ? 'bg-portal-blue-lt' : 'hover:bg-portal-bg'
                }`}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(a.id)}
                    className="w-4 h-4 rounded border-portal-border-2 text-portal-blue cursor-pointer"
                    aria-label={`Select ${a.title}`}
                  />
                </div>

                {/* Publish state dot */}
                <div className="flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${dotColor}`} title={dotTitle} />
                </div>

                {/* Title (with missing-image + brand badges inline) */}
                <div className="min-w-0 flex items-center gap-2">
                  {/* Brand badge — origin slug; tooltip lists syndicated brands
                      if any. Hidden when the article is on the default brand
                      AND not syndicated anywhere (most rows fit this — keeps
                      the list visually quiet until multi-brand matters). */}
                  {a.brand_slug && (a.brand_slug !== 'rrp' || (a.syndicated_to_brands?.length ?? 0) > 0) && (
                    <span
                      title={
                        (a.syndicated_to_brands?.length ?? 0) > 0
                          ? `${marketShort(a.brand_slug)} → ${a.syndicated_to_brands!.map(marketShort).join(', ')}`
                          : marketShort(a.brand_slug)
                      }
                      className="text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-full border border-portal-blue/30 bg-portal-blue-lt text-portal-blue"
                    >
                      {marketShort(a.brand_slug)}
                      {(a.syndicated_to_brands?.length ?? 0) > 0 && (
                        <span className="ml-0.5 opacity-70">+{a.syndicated_to_brands!.length}</span>
                      )}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-portal-text truncate">{a.title}</p>
                  {!a.hero_image_url && (
                    <span title="Missing hero image" className="shrink-0">
                      <ImageOff size={12} className="text-portal-red" />
                    </span>
                  )}
                </div>

                {/* Status — only shown for non-routine states */}
                <div className="hidden md:block">
                  {showStatusPill && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
                      {st.label}
                    </span>
                  )}
                </div>

                {/* Section */}
                <div className="hidden lg:block">
                  <span className="text-xs text-portal-sub whitespace-nowrap">{sec}</span>
                </div>

                {/* Views */}
                <div className="hidden md:block tabular-nums text-right">
                  <span className={`text-xs whitespace-nowrap ${
                    (a.view_count ?? 0) > 0 ? 'text-portal-text font-semibold' : 'text-portal-border-2'
                  }`}>
                    {fmtViews(a.view_count)}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden xl:block">
                  <span className="text-xs text-portal-muted whitespace-nowrap">{date}</span>
                </div>

                {/* Row actions */}
                <div className="flex items-center gap-1">
                  {!a.published && (
                    <button
                      onClick={() => runBulkAction([a.id], 'approve')}
                      disabled={busy}
                      className="px-2.5 py-1 text-xs font-semibold text-portal-green bg-portal-green-lt hover:bg-portal-green-lt rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  <Link
                    href={`/admin/articles/${a.id}/edit`}
                    className="px-2.5 py-1 text-xs font-semibold text-portal-blue hover:bg-portal-blue-lt rounded-lg transition-colors whitespace-nowrap"
                  >
                    Edit
                  </Link>
                  {/* Absolute, on the article's OWN brand domain. A relative
                      href resolved against app.keepsharing.com, which hosts the
                      admin for every brand and serves none of these public
                      routes — so "view live" 404'd. Keyed off the row's
                      brand_slug rather than the switcher, so a syndicated
                      article opens on the brand that published it. */}
                  {a.published && (
                    <a
                      href={publicUrl(articleHref(a), a.brand_slug ?? 'rrp')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-portal-muted hover:text-portal-text rounded-lg hover:bg-portal-row-hover transition-colors"
                      title="View live article"
                    >
                      <Eye size={13} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            href={page > 1 ? buildQuery({ filter: activeFilter, sort: activeSort, page: page - 1 }) : '#'}
            scroll={false}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
              page <= 1
                ? 'border-portal-border text-portal-border-2 pointer-events-none'
                : 'border-portal-border-2 text-portal-text hover:bg-portal-bg'
            }`}
          >
            <ChevronLeft size={12} /> Previous
          </Link>

          <span className="text-[11px] text-portal-sub">
            Page <strong className="text-portal-text">{page}</strong> of {totalPages}
          </span>

          <Link
            href={page < totalPages ? buildQuery({ filter: activeFilter, sort: activeSort, page: page + 1 }) : '#'}
            scroll={false}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
              page >= totalPages
                ? 'border-portal-border text-portal-border-2 pointer-events-none'
                : 'border-portal-border-2 text-portal-text hover:bg-portal-bg'
            }`}
          >
            Next <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}
