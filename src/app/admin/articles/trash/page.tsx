// ── /admin/articles/trash ─────────────────────────────────────────────────────
// Soft-deleted articles. Restore them (clear deleted_at) or permanently delete
// (drop the row). Trashed articles never appear on public pages.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TrashedArticle {
  id:            string
  title:         string
  slug:          string
  column_slug:   string | null
  author_name:   string | null
  hero_image_url: string | null
  deleted_at:    string
  published_at:  string | null
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function TrashPage() {
  const supabase = createClient()
  const [articles, setArticles] = useState<TrashedArticle[]>([])
  const [loading, setLoading]   = useState(true)
  const [busyId, setBusyId]     = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)

  const [migrationMissing, setMigrationMissing] = useState(false)

  async function load() {
    setLoading(true)
    setMigrationMissing(false)
    const { data, error } = await supabase
      .from('guide_articles')
      .select('id, title, slug, column_slug, author_name, hero_image_url, deleted_at, published_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error && /deleted_at|column.*does not exist/i.test(error.message)) {
      setMigrationMissing(true)
      setArticles([])
    } else {
      setArticles((data as TrashedArticle[]) ?? [])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: string) {
    setBusyId(id)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'restore' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ text: j.error ?? `Restore failed (${res.status})`, ok: false })
        return
      }
      setMsg({ text: '✓ Restored', ok: true })
      load()
    } finally { setBusyId(null) }
  }

  async function permanentDelete(id: string, title: string) {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    setBusyId(id)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/articles/${id}?permanent=true`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ text: j.error ?? `Delete failed (${res.status})`, ok: false })
        return
      }
      setMsg({ text: '✓ Permanently deleted', ok: true })
      load()
    } finally { setBusyId(null) }
  }

  async function emptyTrash() {
    if (articles.length === 0) return
    if (!confirm(`Permanently delete all ${articles.length} trashed articles? This cannot be undone.`)) return
    setMsg(null)
    for (const a of articles) {
      await fetch(`/api/admin/articles/${a.id}?permanent=true`, { method: 'DELETE' })
    }
    setMsg({ text: `✓ Emptied trash (${articles.length} articles deleted)`, ok: true })
    load()
  }

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/articles" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-muted hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Back to All Articles
          </Link>
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-rose-600" />
            <h1 className="text-xl font-bold text-portal-text tracking-tight">Trash</h1>
          </div>
          <p className="text-sm text-portal-sub mt-1">
            Articles you&apos;ve moved to trash. Restore them, or permanently delete to free the slug.
          </p>
        </div>
        {articles.length > 0 && (
          <button
            type="button"
            onClick={emptyTrash}
            className="text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-lg"
          >
            Empty Trash ({articles.length})
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
          msg.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-portal-red-lt border-portal-red/30 text-portal-red'
        }`}>
          {msg.text}
        </div>
      )}

      {migrationMissing && (
        <div className="rounded-xl border border-amber-300 bg-portal-amber-lt px-5 py-4">
          <p className="text-sm font-bold text-amber-900 mb-1">Trash needs a database migration</p>
          <p className="text-sm text-portal-amber leading-relaxed">
            Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/076_article_soft_delete.sql</code> in the Supabase SQL editor.
            Once the <code className="bg-portal-amber-lt px-1 rounded">deleted_at</code> column exists, the
            trash + restore + permanent-delete actions will be active.
          </p>
        </div>
      )}

      {/* LIST */}
      <section className="bg-white border border-portal-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-portal-muted flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-portal-sub mb-1">Trash is empty</p>
            <p className="text-xs text-portal-muted">Articles you move to trash will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {articles.map(a => (
              <li key={a.id} className="p-4 flex items-center gap-4">
                {a.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.hero_image_url} alt={a.title} className="w-16 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-portal-text truncate">{a.title}</p>
                  <p className="text-xs text-portal-muted truncate">
                    {a.column_slug ?? 'No column'} · {a.author_name ?? 'No author'} · trashed {fmtDate(a.deleted_at)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => restore(a.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-portal-border text-xs font-semibold text-portal-text hover:bg-portal-bg disabled:opacity-40"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => permanentDelete(a.id, a.title)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-portal-red/30 bg-white text-xs font-semibold text-portal-red hover:bg-portal-red-lt disabled:opacity-40"
                  >
                    <Trash2 size={12} /> Delete forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
