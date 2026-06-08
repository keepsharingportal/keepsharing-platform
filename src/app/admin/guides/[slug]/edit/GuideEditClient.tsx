'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

interface InitialState {
  // guide_types
  display_name:       string
  short_description:  string
  pitch:              string
  editorial_intro:    string
  hero_image_url:     string
  // guide_configs
  print_cover_url:    string
  issuu_url:          string
  homepage_image_url: string
  primary_cta_label:  string
  primary_cta_url:    string
  is_active:          boolean
  featured_month:     number | null   // 1-12, drives homepage Featured Guide tile
}

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface Props {
  slug:       string
  publicPath: string
  initial:    InitialState
}

export function GuideEditClient({ slug, publicPath, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<InitialState>(initial)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  function set<K extends keyof InitialState>(k: K, v: InitialState[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/guides/${slug}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ text: json?.error ?? `Save failed (${res.status})`, ok: false })
        return
      }
      setMsg({ text: 'Saved. Public page refreshed.', ok: true })
      router.refresh()
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-xs font-bold text-portal-sub uppercase tracking-wider mb-1.5'

  return (
    <div className="space-y-6">

      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white border-b border-portal-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {msg && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${msg.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-red-100 text-red-700'} inline-flex items-center gap-1`}>
              {msg.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              {msg.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Identity</h2>

        <div>
          <label className={lbl}>Guide title</label>
          <input className={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="e.g. Summer Fun Guide" />
          <p className="text-[11px] text-portal-muted mt-1">Shown as the hero heading on <code>{publicPath}</code>.</p>
        </div>

        <div>
          <label className={lbl}>Subtitle / pitch</label>
          <textarea rows={2} className={`${inp} resize-y`} value={form.pitch} onChange={e => set('pitch', e.target.value)} placeholder="One-sentence positioning shown under the hero title." />
        </div>

        <div>
          <label className={lbl}>Short description (SEO / cards)</label>
          <textarea rows={2} className={`${inp} resize-y`} value={form.short_description} onChange={e => set('short_description', e.target.value)} placeholder="Used for meta descriptions and homepage cards." />
        </div>

        <div>
          <label className={lbl}>Long editorial intro</label>
          <textarea rows={6} className={`${inp} resize-y`} value={form.editorial_intro} onChange={e => set('editorial_intro', e.target.value)} placeholder="The longer description shown in the &quot;About This Guide&quot; sidebar widget. Line breaks supported." />
        </div>

        <label className="flex items-center gap-2 text-sm pt-1">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
          Guide is active (shown on public site)
        </label>

        <div className="pt-3 border-t border-portal-border">
          <label className={lbl}>Featured in month</label>
          <p className="text-[11px] text-portal-muted mb-2">
            When today&apos;s month matches this, this guide takes the homepage&apos;s
            top-right Featured Guide tile. One guide per month — set the others to
            different months. Leave as &quot;None&quot; if this guide doesn&apos;t own a
            specific monthly issue.
          </p>
          <select
            value={form.featured_month ?? ''}
            onChange={e => set('featured_month', e.target.value ? Number(e.target.value) : null)}
            className={`${inp} cursor-pointer`}
          >
            <option value="">— None —</option>
            {MONTHS.slice(1).map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Images ────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-portal-text">Images</h2>

        <div>
          <label className={lbl}>Hero image — top of public guide page</label>
          <HeroImageUpload
            value={form.hero_image_url}
            onChange={url => set('hero_image_url', url)}
            context="asset"
          />
        </div>

        <div className="pt-2 border-t border-portal-border">
          <label className={lbl}>Homepage feature image</label>
          <p className="text-[11px] text-portal-muted mb-2">Used by the homepage Summer Fun block and the &quot;Featured Guide&quot; tile when this guide is featured. If empty, falls back to the hero image.</p>
          <HeroImageUpload
            value={form.homepage_image_url}
            onChange={url => set('homepage_image_url', url)}
            context="asset"
          />
        </div>

        <div className="pt-2 border-t border-portal-border">
          <label className={lbl}>Print cover</label>
          <p className="text-[11px] text-portal-muted mb-2">The print magazine cover for this issue. Optional — shown in the digital edition box alongside the Issuu link.</p>
          <HeroImageUpload
            value={form.print_cover_url}
            onChange={url => set('print_cover_url', url)}
            context="asset"
          />
        </div>
      </section>

      {/* ── Print edition link ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Print Edition</h2>
        <p className="text-[11px] text-portal-muted -mt-2">Connect the print issue. The web guide is the expanded digital edition of the same theme.</p>

        <div>
          <label className={lbl}>Issuu flip-version URL</label>
          <input
            type="url"
            className={inp}
            value={form.issuu_url}
            onChange={e => set('issuu_url', e.target.value)}
            placeholder="https://issuu.com/keepsharing/docs/..."
          />
          {form.issuu_url && (
            <a href={form.issuu_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-portal-blue hover:underline mt-1.5">
              <ExternalLink size={11} /> Test link
            </a>
          )}
        </div>
      </section>

      {/* ── Primary CTA ────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-portal-border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-portal-text">Primary CTA</h2>
        <p className="text-[11px] text-portal-muted -mt-2">Optional CTA used by the homepage Summer Fun block and other featured-guide modules.</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>CTA label</label>
            <input className={inp} value={form.primary_cta_label} onChange={e => set('primary_cta_label', e.target.value)} placeholder="e.g. Browse Listings, View Guide" />
          </div>
          <div>
            <label className={lbl}>CTA URL</label>
            <input
              type="url"
              className={inp}
              value={form.primary_cta_url}
              onChange={e => set('primary_cta_url', e.target.value)}
              placeholder={publicPath}
            />
          </div>
        </div>
      </section>

    </div>
  )
}
