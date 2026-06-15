'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react'
import type { AuthorProfile, SocialUrl } from '@/lib/seo/authors'

const PLATFORMS = ['twitter', 'linkedin', 'instagram', 'facebook', 'tiktok', 'website', 'other'] as const

export function AuthorEditorClient({ initial }: { initial: AuthorProfile }) {
  const router = useRouter()
  const [form,  setForm]  = useState<AuthorProfile>(initial)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [saved,  setSaved]  = useState(false)

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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>

        <Field label="Display name">
          <input className="form-input" value={form.displayName} onChange={e => update('displayName', e.target.value)} />
        </Field>

        <Field label="Job title" hint="Editor, Contributor, Staff Writer">
          <input className="form-input" value={form.jobTitle ?? ''} onChange={e => update('jobTitle', e.target.value || null)} />
        </Field>

        <Field label="Bio" hint="2-4 sentences. Will appear on the public author page + in Person JSON-LD.">
          <textarea
            className="form-input"
            rows={5}
            value={form.bio ?? ''}
            onChange={e => update('bio', e.target.value || null)}
          />
        </Field>

        <Field label="Headshot URL" hint="Full URL to a square portrait (CDN, Supabase storage, etc.)">
          <input className="form-input" value={form.headshotUrl ?? ''} onChange={e => update('headshotUrl', e.target.value || null)} />
        </Field>

        <Field label="Credentials (comma-separated)" hint="MD, RD, MS-Education, Certified Teacher, etc. Emitted as hasCredential.">
          <input
            className="form-input"
            value={form.credentials.join(', ')}
            onChange={e => update('credentials', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
        </Field>

        <Field label="Topics they know about (comma-separated)" hint="Drives schema.knowsAbout — leave blank to inherit brand defaults.">
          <input
            className="form-input"
            value={form.knowsAbout.join(', ')}
            onChange={e => update('knowsAbout', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
        </Field>

        <Field label="Contact email">
          <input className="form-input" type="email" value={form.contactEmail ?? ''} onChange={e => update('contactEmail', e.target.value || null)} />
        </Field>

        <Field label="Social URLs" hint="Each becomes a schema.sameAs entry.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {form.socialUrls.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <select
                  className="form-input"
                  style={{ width: 140 }}
                  value={s.platform}
                  onChange={e => setSocial(i, { platform: e.target.value })}
                >
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  className="form-input"
                  placeholder="https://…"
                  value={s.url}
                  onChange={e => setSocial(i, { url: e.target.value })}
                />
                <button type="button" onClick={() => removeSocial(i)} className="btn btn-secondary" title="Remove" style={{ padding: '6px 10px' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addSocial} className="btn btn-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }}>
              + Add social link
            </button>
          </div>
        </Field>

      </div>

      <div className="card" style={{ padding: 16, alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
        <div className="fw-700 text-portal-text" style={{ fontSize: 13, marginBottom: 8 }}>Save changes</div>
        <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
          Profile saves to <code>seo_authors</code>. Public author page picks it up on next request.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
        >
          <Save size={12} />
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {error && (
          <div style={{ marginTop: 10, padding: 8, background: 'var(--color-portal-red-lt, #fee2e2)', borderRadius: 4, fontSize: 11, color: 'var(--color-portal-red)' }}>
            <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
            {error}
          </div>
        )}
        {saved && (
          <div style={{ marginTop: 10, padding: 8, background: 'var(--color-portal-green-lt, #ecfdf5)', borderRadius: 4, fontSize: 11, color: 'var(--color-portal-green)' }}>
            <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
            Saved.
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="fw-700 text-portal-text" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
      {hint && <div className="text-portal-sub" style={{ fontSize: 11, marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  )
}
