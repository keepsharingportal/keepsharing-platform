'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, CheckCircle2, AlertTriangle, Trash2, Upload, Loader2 } from 'lucide-react'
import type { AuthorProfile, SocialUrl } from '@/lib/seo/authors'
import { compressIfLarge } from '@/lib/admin/compress-image'

const PLATFORMS = ['twitter', 'linkedin', 'instagram', 'facebook', 'tiktok', 'website', 'other'] as const

export function AuthorEditorClient({ initial }: { initial: AuthorProfile }) {
  const router = useRouter()
  const [form,  setForm]  = useState<AuthorProfile>(initial)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false)
  const headshotFileRef = useRef<HTMLInputElement>(null)

  async function uploadHeadshot(file: File) {
    setUploadingHeadshot(true); setError(null)
    try {
      // Client-side compression so a 3-5 MB headshot doesn't blow past
      // Vercel's ~4.5 MB serverless body cap. compressIfLarge is a
      // no-op for files already under the trigger threshold; larger
      // files get downscaled to a 3000 px long edge at JPEG q0.9.
      const compressed = await compressIfLarge(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('context', `author-headshot-${form.authorSlug}`)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setError((j as { error?: string })?.error ?? `Upload failed (HTTP ${res.status})`); return }
      const url = (j as { url?: string }).url
      if (!url) { setError('Upload returned no URL'); return }
      update('headshotUrl', url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setUploadingHeadshot(false) }
  }

  function update<K extends keyof AuthorProfile>(k: K, v: AuthorProfile[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/admin/seo/authors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Save failed')
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function addSocial() {
    update('socialUrls', [...form.socialUrls, { platform: 'twitter', url: '' }])
  }
  function setSocial(i: number, patch: Partial<SocialUrl>) {
    const next = form.socialUrls.map((s, idx) => idx === i ? { ...s, ...patch } : s)
    update('socialUrls', next)
  }
  function removeSocial(i: number) {
    update('socialUrls', form.socialUrls.filter((_, idx) => idx !== i))
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
      <div className="bg-white border border-portal-border rounded-lg p-5">

        <Field label="Display name">
          <input className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text" value={form.displayName} onChange={e => update('displayName', e.target.value)} />
        </Field>

        <Field label="Job title" hint="Editor, Contributor, Staff Writer">
          <input className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text" value={form.jobTitle ?? ''} onChange={e => update('jobTitle', e.target.value || null)} />
        </Field>

        <Field label="Bio" hint="2-4 sentences. Will appear on the public author page + in Person JSON-LD.">
          <textarea
            className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
            rows={5}
            value={form.bio ?? ''}
            onChange={e => update('bio', e.target.value || null)}
          />
        </Field>

        <Field label="Headshot" hint="Square portrait works best. Uploads go to Supabase Storage and get resized + WebP-encoded automatically.">
          <div className="flex gap-2 items-start">
            <input
              className="flex-1 px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
              value={form.headshotUrl ?? ''}
              onChange={e => update('headshotUrl', e.target.value || null)}
              placeholder="Paste a URL or click Upload →"
            />
            <button
              type="button"
              onClick={() => headshotFileRef.current?.click()}
              disabled={uploadingHeadshot}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-portal-navy bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50 whitespace-nowrap"
            >
              {uploadingHeadshot ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadingHeadshot ? 'Uploading…' : 'Upload'}
            </button>
            <input
              ref={headshotFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeadshot(f); e.target.value = '' }}
            />
          </div>
          {form.headshotUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.headshotUrl} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-portal-border-2 bg-portal-bg" />
            </div>
          )}
        </Field>

        <Field label="Credentials (comma-separated)" hint="MD, RD, MS-Education, Certified Teacher, etc. Emitted as hasCredential.">
          <input
            className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
            value={form.credentials.join(', ')}
            onChange={e => update('credentials', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
        </Field>

        <Field label="Topics they know about (comma-separated)" hint="Drives schema.knowsAbout — leave blank to inherit brand defaults.">
          <input
            className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
            value={form.knowsAbout.join(', ')}
            onChange={e => update('knowsAbout', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
        </Field>

        <Field label="Contact email">
          <input className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text" type="email" value={form.contactEmail ?? ''} onChange={e => update('contactEmail', e.target.value || null)} />
        </Field>

        <Field label="Social URLs" hint="Each becomes a schema.sameAs entry.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.socialUrls.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <select
                  className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
                  style={{ width: 140 }}
                  value={s.platform}
                  onChange={e => setSocial(i, { platform: e.target.value })}
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  className="w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text"
                  placeholder="https://…"
                  value={s.url}
                  onChange={e => setSocial(i, { url: e.target.value })}
                />
                <button type="button" onClick={() => removeSocial(i)} title="Remove" className="px-2.5 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addSocial} className="px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg self-start">
              + Add social link
            </button>
          </div>
        </Field>

      </div>

      <div className="bg-white border border-portal-border rounded-lg p-4 self-start sticky top-4">
        <div className="text-[13px] font-bold text-portal-text mb-2">Save changes</div>
        <p className="text-[12px] text-portal-sub leading-relaxed mb-3">
          Profile saves to <code>seo_authors</code>. Public author page picks it up on next request.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {error && (
          <div className="mt-2.5 p-2 bg-portal-red-lt text-portal-red rounded text-[11px]">
            <AlertTriangle size={11} className="inline mr-1" /> {error}
          </div>
        )}
        {saved && (
          <div className="mt-2.5 p-2 bg-portal-green-lt text-portal-green rounded text-[11px]">
            <CheckCircle2 size={11} className="inline mr-1" /> Saved.
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-bold text-portal-text mb-1">{label}</label>
      {hint && <div className="text-[11px] text-portal-sub mb-1.5">{hint}</div>}
      {children}
    </div>
  )
}
