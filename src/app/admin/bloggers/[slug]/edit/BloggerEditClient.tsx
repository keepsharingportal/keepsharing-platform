'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

interface QuickTake { question: string; answer: string }

interface InitialState {
  display_name:      string
  tagline:           string
  profile_image_url: string
  family_image_url:  string
  bio:               string
  quick_takes:       QuickTake[]
  is_active:         boolean
}

interface Props {
  slug:       string
  publicPath: string
  initial:    InitialState
}

const DEFAULT_QUICK_TAKES: QuickTake[] = [
  { question: 'Favorite local spot for a coffee break',           answer: '' },
  { question: 'Go-to weekend activity with the kids',             answer: '' },
  { question: 'One thing you wish you knew as a new mom',         answer: '' },
  { question: 'Currently reading / watching',                     answer: '' },
]

export function BloggerEditClient({ slug, publicPath, initial }: Props) {
  const router = useRouter()
  const [form, setForm]       = useState<InitialState>(initial)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null)

  function set<K extends keyof InitialState>(k: K, v: InitialState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function updateQuickTake(i: number, field: 'question' | 'answer', v: string) {
    setForm(f => {
      const next = [...f.quick_takes]
      next[i] = { ...next[i], [field]: v }
      return { ...f, quick_takes: next }
    })
  }

  function addQuickTake() {
    setForm(f => ({ ...f, quick_takes: [...f.quick_takes, { question: '', answer: '' }] }))
  }

  function removeQuickTake(i: number) {
    setForm(f => ({ ...f, quick_takes: f.quick_takes.filter((_, j) => j !== i) }))
  }

  function loadDefaults() {
    setForm(f => ({ ...f, quick_takes: f.quick_takes.length === 0 ? DEFAULT_QUICK_TAKES : f.quick_takes }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      // Filter out empty Q&A rows before save
      const cleanedQuickTakes = form.quick_takes.filter(qt => qt.question.trim() && qt.answer.trim())
      const payload = {
        ...form,
        quick_takes: cleanedQuickTakes.length > 0 ? cleanedQuickTakes : null,
      }
      const res = await fetch(`/api/admin/bloggers/${slug}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ text: json?.error ?? `Save failed (${res.status})`, ok: false }); return }
      setMsg({ text: 'Saved. Public profile refreshed.', ok: true })
      router.refresh()
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-pink-400 bg-white'
  const lbl = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5'

  return (
    <div className="space-y-6">

      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {msg && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} inline-flex items-center gap-1`}>
              {msg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {msg.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Identity</h2>

        <div>
          <label className={lbl}>Display name</label>
          <input className={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Hayley Denny" />
        </div>

        <div>
          <label className={lbl}>Tagline</label>
          <input className={inp} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="One short line — e.g. Working mom of 2, marathon walker, Prattville native." />
          <p className="text-[11px] text-gray-400 mt-1">Shown under her name on the profile + in Meet the Moms cards.</p>
        </div>

        <label className="flex items-center gap-2 text-sm pt-1">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Active (shows on public Mom Knows Best pages)
        </label>

        <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
          Public profile: <code className="px-1 bg-gray-100 rounded">{publicPath}</code>
        </p>
      </section>

      {/* ── Photos ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-gray-900">Photos</h2>

        <div>
          <label className={lbl}>Profile portrait</label>
          <p className="text-[11px] text-gray-400 mb-2">Square photo of her. Used in Meet the Moms cards, the post sidebar, and the profile page header.</p>
          <HeroImageUpload
            value={form.profile_image_url}
            onChange={url => set('profile_image_url', url)}
            context="asset"
          />
        </div>

        <div className="pt-3 border-t border-gray-100">
          <label className={lbl}>Family photo</label>
          <p className="text-[11px] text-gray-400 mb-2">Wider photo of her with family. Used as the hero background on her profile page.</p>
          <HeroImageUpload
            value={form.family_image_url}
            onChange={url => set('family_image_url', url)}
            context="asset"
          />
        </div>
      </section>

      {/* ── Bio ───────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-900">Bio</h2>
        <p className="text-[11px] text-gray-400">Longer about-me paragraph(s). Line breaks preserved.</p>
        <textarea
          rows={8}
          className={`${inp} resize-y`}
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
          placeholder="A few paragraphs about who she is, where she's from, her family, what she loves writing about..."
        />
      </section>

      {/* ── Quick Takes ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Quick Takes</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Short, fun Q&amp;A shown on her profile. Skip any she doesn&apos;t want to answer — empty rows are dropped on save.</p>
          </div>
          {form.quick_takes.length === 0 && (
            <button type="button" onClick={loadDefaults} className="text-xs font-semibold text-pink-600 hover:underline">
              Load suggested questions
            </button>
          )}
        </div>

        <div className="space-y-3">
          {form.quick_takes.map((qt, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <input
                  className="flex-1 px-3 py-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider rounded border border-gray-200 bg-white outline-none focus:border-pink-400"
                  value={qt.question}
                  onChange={e => updateQuickTake(i, 'question', e.target.value)}
                  placeholder="Question"
                />
                <button
                  type="button"
                  onClick={() => removeQuickTake(i)}
                  title="Remove this question"
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                className={`${inp} resize-y`}
                value={qt.answer}
                onChange={e => updateQuickTake(i, 'answer', e.target.value)}
                placeholder="Answer"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuickTake}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Plus size={12} /> Add question
        </button>
      </section>
    </div>
  )
}
