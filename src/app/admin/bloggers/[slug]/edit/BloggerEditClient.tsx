'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, CheckCircle2, AlertCircle, Plus, X, Mail, Send, Key } from 'lucide-react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'
import { FieldLabel, FieldHint, SectionHelp } from '@/components/admin/AdminHelp'

interface QuickTake { question: string; answer: string }

interface InitialState {
  display_name:      string
  tagline:           string
  email:             string
  profile_image_url: string
  family_image_url:  string
  bio:               string
  quick_takes:       QuickTake[]
  is_active:         boolean
  has_login:         boolean
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
  const [inviting, setInviting]   = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null)

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
      const { has_login: _hasLogin, ...rest } = form
      void _hasLogin
      const payload = {
        ...rest,
        quick_takes: cleanedQuickTakes.length > 0 ? cleanedQuickTakes : null,
        email:       form.email.trim() || null,
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

  async function sendInvite() {
    setInviting(true)
    setInviteMsg(null)
    try {
      const res  = await fetch(`/api/admin/bloggers/${slug}/invite`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setInviteMsg({ text: json?.error ?? `Invite failed (${res.status})`, ok: false }); return }
      setInviteMsg({ text: 'Magic link emailed to blogger.', ok: true })
      setTimeout(() => setInviteMsg(null), 6000)
    } catch (e) {
      setInviteMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setInviting(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-pink-400 bg-white'

  return (
    <div className="space-y-6">

      <SectionHelp variant="tip" title="How this works">
        Edit her public profile here. To let her write her own posts, set her
        email below and click <strong>Send Login Link</strong>. She&apos;ll receive a
        magic link that opens her private blogger portal — no password needed.
      </SectionHelp>

      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white border-b border-portal-border flex items-center justify-between gap-3">
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
      <section className="rounded-xl border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Identity</h2>

        <div>
          <FieldLabel hint="Her full name as it should appear on the byline and in the Meet the Moms grid.">
            Display name
          </FieldLabel>
          <input className={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Hayley Denny" />
        </div>

        <div>
          <FieldLabel hint='One short line introducing her. Think "elevator pitch" — who she is and what she writes about.'>
            Tagline
          </FieldLabel>
          <input className={inp} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="One short line — e.g. Working mom of 2, marathon walker, Prattville native." />
          <FieldHint className="mt-1">Shown under her name on the profile + in Meet the Moms cards.</FieldHint>
        </div>

        <label className="flex items-center gap-2 text-sm pt-1">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Active (shows on public Mom Knows Best pages)
        </label>

        <p className="text-[11px] text-portal-muted pt-2 border-t border-portal-border">
          Public profile: <code className="px-1 bg-gray-100 rounded">{publicPath}</code>
        </p>
      </section>

      {/* ── Blogger Portal Access ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-pink-200 bg-pink-50/40 p-5 space-y-3">
        <h2 className="text-sm font-bold text-portal-text flex items-center gap-2">
          <Key size={14} className="text-pink-600" />
          Blogger Portal Access
        </h2>
        <FieldHint className="-mt-1">
          Save the email first, then click <strong>Send Login Link</strong> below. Her link arrives in seconds and signs her in without a password.
        </FieldHint>

        <div>
          <FieldLabel hint="Email she'll use to log in. Must match exactly — typos break the magic link. She'll receive an email from Supabase Auth with a one-click sign-in.">
            Login email
          </FieldLabel>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted" />
              <input
                type="email"
                className={`${inp} pl-9`}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="hayley@example.com"
              />
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap ${
                form.has_login
                  ? 'bg-green-100 text-green-700'
                  : form.email
                    ? 'bg-portal-amber-lt text-portal-amber'
                    : 'bg-gray-100 text-portal-sub'
              }`}
            >
              {form.has_login ? 'Active login' : form.email ? 'Not yet invited' : 'No login'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-pink-200/60">
          <div className="min-w-0 flex-1">
            {inviteMsg && (
              <span className={`text-xs font-semibold inline-flex items-center gap-1 ${inviteMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
                {inviteMsg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                {inviteMsg.text}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={sendInvite}
            disabled={inviting || !form.email || !initial.email}
            title={!initial.email ? 'Save the email first, then send the login link.' : ''}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-pink-300 text-pink-700 rounded-lg hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            {inviting ? 'Sending…' : 'Send Login Link'}
          </button>
        </div>
      </section>

      {/* ── Photos ────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-portal-border bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-portal-text">Photos</h2>

        <div>
          <FieldLabel hint="Square crop works best. This is the small face shot that runs everywhere — bylines, post sidebars, the Meet the Moms grid.">
            Profile portrait
          </FieldLabel>
          <FieldHint className="mb-2">Used in Meet the Moms cards, the post sidebar, and the profile page header.</FieldHint>
          <HeroImageUpload
            value={form.profile_image_url}
            onChange={url => set('profile_image_url', url)}
            context="asset"
          />
        </div>

        <div className="pt-3 border-t border-portal-border">
          <FieldLabel hint="Optional. Wider photo with her family. Used only as the hero background on her profile page — if empty, we fall back to the profile portrait above.">
            Family photo
          </FieldLabel>
          <FieldHint className="mb-2">Hero background on her profile page.</FieldHint>
          <HeroImageUpload
            value={form.family_image_url}
            onChange={url => set('family_image_url', url)}
            context="asset"
          />
        </div>
      </section>

      {/* ── Bio ───────────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-portal-border bg-white p-5 space-y-2">
        <h2 className="text-sm font-bold text-portal-text">Bio</h2>
        <p className="text-[11px] text-portal-muted">Longer about-me paragraph(s). Line breaks preserved.</p>
        <textarea
          rows={8}
          className={`${inp} resize-y`}
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
          placeholder="A few paragraphs about who she is, where she's from, her family, what she loves writing about..."
        />
      </section>

      {/* ── Quick Takes ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-portal-border bg-white p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-portal-text">Quick Takes</h2>
            <p className="text-[11px] text-portal-muted mt-0.5">Short, fun Q&amp;A shown on her profile. Skip any she doesn&apos;t want to answer — empty rows are dropped on save.</p>
          </div>
          {form.quick_takes.length === 0 && (
            <button type="button" onClick={loadDefaults} className="text-xs font-semibold text-pink-600 hover:underline">
              Load suggested questions
            </button>
          )}
        </div>

        <div className="space-y-3">
          {form.quick_takes.map((qt, i) => (
            <div key={i} className="rounded-lg border border-portal-border bg-portal-bg/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <input
                  className="flex-1 px-3 py-1.5 text-xs font-bold text-portal-text uppercase tracking-wider rounded border border-portal-border bg-white outline-none focus:border-pink-400"
                  value={qt.question}
                  onChange={e => updateQuickTake(i, 'question', e.target.value)}
                  placeholder="Question"
                />
                <button
                  type="button"
                  onClick={() => removeQuickTake(i)}
                  title="Remove this question"
                  className="text-portal-muted hover:text-red-500 p-1"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-portal-text border border-portal-border rounded-lg hover:bg-portal-bg"
        >
          <Plus size={12} /> Add question
        </button>
      </section>
    </div>
  )
}
