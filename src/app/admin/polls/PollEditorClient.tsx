'use client'

// Shared editor used by /admin/polls/new and /admin/polls/[id].
// Tracks form state in the same shape /api/admin/polls expects + handles
// submit/delete with router refresh + redirect.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

interface BrandOpt { slug: string; label: string }

interface PollInitial {
  id?:             string
  brand_slug:      string | null
  question:        string
  options:         string[]
  opens_at:        string | null
  closes_at:       string | null
  is_active:       boolean
  internal_notes:  string | null
}

interface Props {
  mode:    'create' | 'edit'
  brands:  BrandOpt[]
  initial?: PollInitial
}

const BLANK: PollInitial = {
  brand_slug:     null,
  question:       '',
  options:        ['', '', '', ''],
  opens_at:       null,
  closes_at:      null,
  is_active:      true,
  internal_notes: null,
}

// datetime-local needs YYYY-MM-DDTHH:mm format
function toInputDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PollEditorClient({ mode, brands, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<PollInitial>(initial ?? BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function setOption(i: number, v: string) {
    setForm(f => {
      const next = [...f.options]
      next[i] = v
      return { ...f, options: next }
    })
  }
  function addOption() {
    if (form.options.length >= 6) return
    setForm(f => ({ ...f, options: [...f.options, ''] }))
  }
  function removeOption(i: number) {
    if (form.options.length <= 2) return
    setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))
  }

  async function submit() {
    setError(null)
    const cleaned = form.options.map(s => s.trim()).filter(Boolean)
    if (!form.question.trim() || cleaned.length < 2) {
      setError('Need a question and at least 2 options.')
      return
    }
    setSubmitting(true)
    try {
      const body = {
        ...(mode === 'edit' ? { id: form.id } : {}),
        brand_slug:     form.brand_slug,
        question:       form.question.trim(),
        options:        cleaned,
        opens_at:       form.opens_at,
        closes_at:      form.closes_at,
        is_active:      form.is_active,
        internal_notes: form.internal_notes,
      }
      const res = await fetch('/api/admin/polls', {
        method:  mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Save failed.'); return }
      if (mode === 'create') {
        router.push(`/admin/polls/${j.poll.id}`)
      } else {
        router.refresh()
      }
    } finally { setSubmitting(false) }
  }

  async function destroy() {
    if (mode !== 'edit' || !form.id) return
    if (!confirm('Delete this poll AND all responses? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/polls', {
        method:  'DELETE',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: form.id }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError(j.error ?? 'Delete failed.'); return }
      router.push('/admin/polls')
    } finally { setDeleting(false) }
  }

  const inp = 'portal-input'

  return (
    <div className="portal-card p-5 space-y-4">
      <div>
        <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Brand scope</label>
        <select
          className={inp}
          value={form.brand_slug ?? ''}
          onChange={e => setForm(f => ({ ...f, brand_slug: e.target.value || null }))}
        >
          <option value="">All brands (parents + fifty-plus)</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.label}</option>)}
        </select>
        <p className="text-[11px] text-portal-muted mt-1 leading-snug">
          Pick a specific brand to run this poll only there, or leave as &ldquo;All brands&rdquo; for cross-platform engagement.
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Question</label>
        <textarea
          className={inp}
          rows={2}
          value={form.question}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          placeholder="What's your favorite local weekend activity?"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Options (2-6)</label>
        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={inp}
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={form.options.length <= 2}
                className="portal-btn portal-btn-ghost portal-btn-sm"
                title="Remove option"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        {form.options.length < 6 && (
          <button type="button" onClick={addOption} className="portal-btn portal-btn-ghost portal-btn-sm mt-2">
            <Plus className="h-3.5 w-3.5" /> Add option
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Opens at</label>
          <input
            type="datetime-local"
            className={inp}
            value={toInputDate(form.opens_at)}
            onChange={e => setForm(f => ({ ...f, opens_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
          />
          <p className="text-[11px] text-portal-muted mt-1">Blank = immediately</p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Closes at</label>
          <input
            type="datetime-local"
            className={inp}
            value={toInputDate(form.closes_at)}
            onChange={e => setForm(f => ({ ...f, closes_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
          />
          <p className="text-[11px] text-portal-muted mt-1">Blank = open indefinitely</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="poll-active"
          type="checkbox"
          checked={form.is_active}
          onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4 accent-portal-blue"
        />
        <label htmlFor="poll-active" className="text-sm font-semibold text-portal-text">Active</label>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-portal-sub uppercase tracking-wider mb-1.5">Internal notes (not shown publicly)</label>
        <textarea
          className={inp}
          rows={2}
          value={form.internal_notes ?? ''}
          onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))}
          placeholder="What prompted this poll, who suggested it, follow-up plans, etc."
        />
      </div>

      {error && <p className="text-sm text-portal-red">{error}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-portal-border">
        <div>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={destroy}
              disabled={deleting}
              className="portal-btn portal-btn-red portal-btn-sm"
            >
              {deleting ? 'Deleting…' : 'Delete poll'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="portal-btn portal-btn-primary"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create poll' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
