'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, X } from 'lucide-react'

export function NewBloggerButton() {
  const router = useRouter()
  const [open, setOpen]   = useState(false)
  const [name, setName]   = useState('')
  const [tag,  setTag]    = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!name.trim()) { setError('Display name required'); return }
    setSaving(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/bloggers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ display_name: name.trim(), tagline: tag.trim() || null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json?.error ?? `Error ${res.status}`); return }
      // Land on the edit page so they can finish filling in profile + images + bio
      router.push(`/admin/bloggers/${json.slug}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700"
      >
        <Plus size={12} /> New Mom
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg shadow-md w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-portal-text">Add a Mom Knows Best blogger</h2>
                <p className="text-xs text-portal-sub mt-0.5">You can fill in bio, photos, and Quick Takes on the next screen.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-portal-muted hover:text-portal-text -mt-1">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-portal-sub uppercase tracking-wider mb-1.5">Display name</label>
                <input
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-pink-400 bg-white"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Hayley Denny"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-portal-sub uppercase tracking-wider mb-1.5">Tagline (optional)</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-pink-400 bg-white"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  placeholder="e.g. Working mom of 2, marathon walker"
                />
              </div>

              {error && (
                <p className="text-xs text-portal-red bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
              )}

              <button
                onClick={create}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                {saving ? 'Creating…' : 'Create & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
