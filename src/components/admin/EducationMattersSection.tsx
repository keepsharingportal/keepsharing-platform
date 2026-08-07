'use client'

// ── Admin editor panel — Education Matters sponsor + focus ─────────────
//
// Renders in the admin article editor when the selected column is one
// of the four Education Matters districts. Fields stored inside the
// article's spotlight_data JSONB so no schema migration is required
// (spotlight_data was already available and is unused for these
// non-spotlight columns).
//
// Keys we write on this article's spotlight_data:
//   sponsor_name           — headline of the sponsor strip
//   sponsor_url            — Learn More destination
//   sponsor_tagline        — one-line kicker under the name
//   sponsor_description    — small line under the tagline
//   sponsor_logo_url       — right-side logo (optional)
//   sponsor_image_url      — right-side hero image (optional)
//   sponsor_button_text    — Learn More override
//   focus                  — This Month's Focus (At a Glance card)
//   pull_quote             — override the auto-detected blockquote

import { useRef, useState } from 'react'
import { Loader2, Upload, GraduationCap } from 'lucide-react'
import { getDistrictForColumn } from '@/lib/education-matters/districts'
import { compressIfLarge } from '@/lib/admin/compress-image'

interface Props {
  columnSlug:     string
  spotlightData:  Record<string, string>
  onDataChange:   (next: Record<string, string>) => void
}

export function EducationMattersSection({ columnSlug, spotlightData, onDataChange }: Props) {
  const district = getDistrictForColumn(columnSlug)
  const [uploadingLogo,  setUploadingLogo]  = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError,    setUploadError]    = useState<string | null>(null)
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  if (!district) return null

  function set(key: string, value: string) {
    onDataChange({ ...spotlightData, [key]: value })
  }

  async function upload(file: File, target: 'logo' | 'image') {
    const setBusy = target === 'logo' ? setUploadingLogo : setUploadingImage
    setBusy(true); setUploadError(null)
    try {
      // Client-side compression keeps big source photos under Vercel's
      // ~4.5 MB body cap. No-op for files already under the trigger.
      const compressed = await compressIfLarge(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('context', `education-matters-sponsor-${target}`)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError((j as { error?: string })?.error ?? `Upload failed (HTTP ${res.status})`); return }
      const url = (j as { url?: string }).url
      if (!url) { setUploadError('Upload returned no URL'); return }
      set(target === 'logo' ? 'sponsor_logo_url' : 'sponsor_image_url', url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setBusy(false) }
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'
  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-portal-navy bg-white border border-portal-border rounded-lg hover:bg-portal-bg disabled:opacity-50 whitespace-nowrap'

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-teal-700" />
        <h3 className="text-[13px] font-bold text-teal-900">Education Matters — {district.shortName}</h3>
      </div>
      <p className="text-[11px] text-teal-900/70 -mt-2">
        District branding + <strong>{district.superintendent.name}</strong>&apos;s bio and photo auto-fill from
        the district config. Only fill in the per-month sponsor + focus here.
      </p>

      {/* Focus (At a Glance) */}
      <div>
        <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">This Month&apos;s Focus</label>
        <input
          className={inp}
          value={spotlightData.focus ?? ''}
          onChange={e => set('focus', e.target.value)}
          placeholder={district.focusDefault}
        />
        <p className="text-[11px] text-teal-900/60 mt-1">Shown in the At a Glance card. Defaults to &ldquo;{district.focusDefault}&rdquo; when blank.</p>
      </div>

      {/* Pull quote override */}
      <div>
        <label className="block text-[11px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">Pull Quote (optional)</label>
        <textarea
          className={inp + ' min-h-[60px] resize-y'}
          value={spotlightData.pull_quote ?? ''}
          onChange={e => set('pull_quote', e.target.value)}
          placeholder="e.g. Together, we create the environment where every learner can thrive."
          rows={2}
        />
        <p className="text-[11px] text-teal-900/60 mt-1">If blank, the layout lifts the first blockquote from the body instead.</p>
      </div>

      {/* Sponsor block */}
      <div className="border-t border-teal-200 pt-4 space-y-3">
        <p className="text-[11px] font-black text-teal-900 uppercase tracking-wider">Monthly Sponsor (optional)</p>
        <p className="text-[11px] text-teal-900/70 -mt-2">Renders as a strip under the hero + a small &ldquo;Community Partner&rdquo; mention mid-article. Leave the Name blank to hide both.</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Sponsor Name">
            <input className={inp} value={spotlightData.sponsor_name ?? ''} onChange={e => set('sponsor_name', e.target.value)} placeholder="e.g. Pike Road Coffee Shop" />
          </Field>
          <Field label="Learn More URL">
            <input className={inp} type="url" value={spotlightData.sponsor_url ?? ''} onChange={e => set('sponsor_url', e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <Field label="Tagline (one line)">
          <input className={inp} value={spotlightData.sponsor_tagline ?? ''} onChange={e => set('sponsor_tagline', e.target.value)} placeholder="Proud supporter of Pike Road families and schools." />
        </Field>
        <Field label="Description (short paragraph)">
          <textarea className={inp + ' min-h-[52px] resize-y'} rows={2} value={spotlightData.sponsor_description ?? ''} onChange={e => set('sponsor_description', e.target.value)} placeholder="Thank you for all you do to make our community strong." />
        </Field>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Button Text">
            <input className={inp} value={spotlightData.sponsor_button_text ?? ''} onChange={e => set('sponsor_button_text', e.target.value)} placeholder="Learn More" />
          </Field>
          <div />
        </div>

        <Field label="Sponsor Logo (right side, above image)">
          <div className="flex gap-2">
            <input className={`${inp} flex-1`} value={spotlightData.sponsor_logo_url ?? ''} onChange={e => set('sponsor_logo_url', e.target.value)} placeholder="Paste URL or upload →" />
            <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className={btn}>
              {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadingLogo ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'logo'); e.target.value = '' }} />
          </div>
        </Field>

        <Field label="Sponsor Image (right side, below logo)">
          <div className="flex gap-2">
            <input className={`${inp} flex-1`} value={spotlightData.sponsor_image_url ?? ''} onChange={e => set('sponsor_image_url', e.target.value)} placeholder="Paste URL or upload →" />
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className={btn}>
              {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploadingImage ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'image'); e.target.value = '' }} />
          </div>
        </Field>

        {uploadError && (
          <p className="text-[11px] text-portal-red">Upload error: {uploadError}</p>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-teal-900 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
