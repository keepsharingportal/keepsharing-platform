'use client'

// ── Shared editor for column_sponsorships ──────────────────────────────
//
// Used by both /new and /[id] routes. When `initial.id` is set, PATCH.
// Otherwise POST. Same form either way — one source of truth for the
// field labels, validation, image upload, and save UX.
//
// Image upload reuses /api/admin/upload with client-side compression
// (compressIfLarge) so a big source photo stays under Vercel's body cap.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Loader2, Upload, Trash2, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { compressIfLarge } from '@/lib/admin/compress-image'
import { EDUCATION_DISTRICTS } from '@/lib/education-matters/districts'

export interface SponsorshipEditorRow {
  id:                    string | null    // null → creating a new row
  column_slug:           string
  advertiser_account_id: string | null
  start_month:           string           // 'YYYY-MM' for the input, converted at save
  end_month:             string           // 'YYYY-MM' for the input
  status:                'active' | 'pending' | 'ended'
  sponsor_name:          string
  sponsor_url:           string
  sponsor_tagline:       string
  sponsor_description:   string
  sponsor_logo_url:      string
  sponsor_image_url:     string
  sponsor_button_text:   string
  notes:                 string
}

export interface AdvertiserOption {
  id:            string
  business_name: string
}

export function SponsorshipEditorClient({
  initial, advertisers,
}: {
  initial:     SponsorshipEditorRow
  advertisers: AdvertiserOption[]
}) {
  const router = useRouter()
  const [form,    setForm]    = useState<SponsorshipEditorRow>(initial)
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)
  const [uploadingLogo,  setUploadingLogo]  = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const logoInputRef  = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const isNew = !form.id

  function set<K extends keyof SponsorshipEditorRow>(k: K, v: SponsorshipEditorRow[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function upload(file: File, target: 'logo' | 'image') {
    const setBusy = target === 'logo' ? setUploadingLogo : setUploadingImage
    setBusy(true); setError(null)
    try {
      const compressed = await compressIfLarge(file)
      const fd = new FormData()
      fd.append('file', compressed)
      fd.append('context', `column-sponsor-${target}`)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string })?.error ?? `Upload failed (HTTP ${res.status})`)
        return
      }
      const url = (j as { url?: string }).url
      if (!url) { setError('Upload returned no URL.'); return }
      set(target === 'logo' ? 'sponsor_logo_url' : 'sponsor_image_url', url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const body = toPayload(form)
      const url = isNew
        ? '/api/admin/education-matters/sponsorships'
        : `/api/admin/education-matters/sponsorships/${form.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string })?.error ?? `Save failed (HTTP ${res.status})`)
        return
      }
      setSaved(true)
      if (isNew) {
        const newId = (j as { sponsorship?: { id?: string } })?.sponsorship?.id
        if (newId) router.replace(`/admin/education-matters/sponsors/${newId}`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!form.id) return
    if (!confirm(`Delete this sponsorship for ${form.sponsor_name}? This can't be undone.`)) return
    setDeleting(true); setError(null)
    try {
      const res = await fetch(`/api/admin/education-matters/sponsorships/${form.id}`, { method: 'DELETE' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((j as { error?: string })?.error ?? `Delete failed (HTTP ${res.status})`)
        return
      }
      router.replace('/admin/education-matters/sponsors')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
    }
  }

  const inp = 'w-full px-3 py-2 text-[13px] border border-portal-border-2 rounded-lg outline-none focus:border-portal-blue bg-white text-portal-text'
  const btnGhost = 'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-portal-navy bg-white border border-portal-border-2 rounded-lg hover:bg-portal-bg disabled:opacity-50 whitespace-nowrap'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/education-matters/sponsors" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Education Matters Sponsors
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          {isNew ? 'New sponsorship' : form.sponsor_name || 'Sponsorship'}
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          One sponsor per district for a date range. Layout auto-picks the active row by article
          publish date.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
            <div className="bg-white border border-portal-border rounded-lg p-5">

              <div className="grid grid-cols-2 gap-3">
                <Field label="District" hint="Which Education Matters column this covers.">
                  <select className={inp} value={form.column_slug} onChange={e => set('column_slug', e.target.value)}>
                    <option value="">— Pick a district —</option>
                    {EDUCATION_DISTRICTS.map(d => (
                      <option key={d.slug} value={d.slug}>{d.fullName}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inp} value={form.status} onChange={e => set('status', e.target.value as SponsorshipEditorRow['status'])}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="ended">Ended</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start month" hint="First month the sponsor's creative appears.">
                  <input type="month" className={inp} value={form.start_month} onChange={e => set('start_month', e.target.value)} />
                </Field>
                <Field label="End month" hint="Last month the sponsor's creative appears (inclusive).">
                  <input type="month" className={inp} value={form.end_month} onChange={e => set('end_month', e.target.value)} />
                </Field>
              </div>

              <Field label="Business (from your advertiser accounts)" hint="Ties this contract to the master business record so it shows on the business page.">
                <select className={inp} value={form.advertiser_account_id ?? ''} onChange={e => set('advertiser_account_id', e.target.value || null)}>
                  <option value="">— Not linked (external / one-off) —</option>
                  {advertisers.map(a => (
                    <option key={a.id} value={a.id}>{a.business_name}</option>
                  ))}
                </select>
              </Field>

              <hr className="my-4 border-portal-border" />

              <p className="text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-3">Sponsor creative</p>

              <Field label="Sponsor name" hint="Headline on the sponsor strip. Usually the business name.">
                <input className={inp} value={form.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} placeholder="e.g. Pike Road Coffee Shop" />
              </Field>

              <Field label="Learn More URL">
                <input className={inp} type="url" value={form.sponsor_url} onChange={e => set('sponsor_url', e.target.value)} placeholder="https://…" />
              </Field>

              <Field label="Tagline (one line)">
                <input className={inp} value={form.sponsor_tagline} onChange={e => set('sponsor_tagline', e.target.value)} placeholder="Proud supporter of Pike Road families and schools." />
              </Field>

              <Field label="Description (short paragraph)">
                <textarea className={inp + ' min-h-[60px] resize-y'} rows={2} value={form.sponsor_description} onChange={e => set('sponsor_description', e.target.value)} placeholder="Thank you for all you do to make our community strong." />
              </Field>

              <Field label="Button text (optional)" hint='Overrides the default "Learn More" label.'>
                <input className={inp} value={form.sponsor_button_text} onChange={e => set('sponsor_button_text', e.target.value)} placeholder="Learn More" />
              </Field>

              <Field label="Sponsor logo" hint="Square works best. Uploads compress client-side to stay under Vercel's body cap.">
                <div className="flex gap-2 items-start">
                  <input className={`${inp} flex-1`} value={form.sponsor_logo_url} onChange={e => set('sponsor_logo_url', e.target.value)} placeholder="Paste URL or click Upload →" />
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className={btnGhost}>
                    {uploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingLogo ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'logo'); e.target.value = '' }} />
                </div>
                {form.sponsor_logo_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.sponsor_logo_url} alt="" className="h-16 w-16 rounded object-contain bg-portal-bg ring-1 ring-portal-border-2" />
                  </div>
                )}
              </Field>

              <Field label="Sponsor hero image (optional)" hint="Right-side photo under the logo. Used sparingly — often the logo alone is enough.">
                <div className="flex gap-2 items-start">
                  <input className={`${inp} flex-1`} value={form.sponsor_image_url} onChange={e => set('sponsor_image_url', e.target.value)} placeholder="Paste URL or click Upload →" />
                  <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className={btnGhost}>
                    {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingImage ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'image'); e.target.value = '' }} />
                </div>
                {form.sponsor_image_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.sponsor_image_url} alt="" className="h-24 w-40 rounded object-cover bg-portal-bg ring-1 ring-portal-border-2" />
                  </div>
                )}
              </Field>

              <Field label="Internal notes (optional)" hint="Contract number, salesperson, renewal date reminders. Never shown publicly.">
                <textarea className={inp + ' min-h-[52px] resize-y'} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            </div>

            <div className="bg-white border border-portal-border rounded-lg p-4 self-start sticky top-4">
              <div className="text-[13px] font-bold text-portal-text mb-2">
                {isNew ? 'Create sponsorship' : 'Save changes'}
              </div>
              <p className="text-[12px] text-portal-sub leading-relaxed mb-3">
                Saves to <code>column_sponsorships</code>. Layout picks the active row for the
                article&apos;s publish date.
              </p>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <Save size={12} />
                {saving ? 'Saving…' : (isNew ? 'Create sponsorship' : 'Save changes')}
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

              {!isNew && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 text-[12px] font-semibold text-portal-red bg-white border border-portal-red rounded-lg hover:bg-portal-red-lt disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {deleting ? 'Deleting…' : 'Delete sponsorship'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function toPayload(f: SponsorshipEditorRow) {
  // Convert 'YYYY-MM' month inputs into first-of-month / last-of-month
  // dates so the DB range math and exclusion constraint work cleanly.
  return {
    column_slug:           f.column_slug,
    advertiser_account_id: f.advertiser_account_id,
    start_month:           firstOfMonth(f.start_month),
    end_month:             lastOfMonth(f.end_month),
    status:                f.status,
    sponsor_name:          f.sponsor_name,
    sponsor_url:           f.sponsor_url,
    sponsor_tagline:       f.sponsor_tagline,
    sponsor_description:   f.sponsor_description,
    sponsor_logo_url:      f.sponsor_logo_url,
    sponsor_image_url:     f.sponsor_image_url,
    sponsor_button_text:   f.sponsor_button_text,
    notes:                 f.notes,
  }
}

function firstOfMonth(ym: string): string {
  // 'YYYY-MM' → 'YYYY-MM-01'. Pass through 'YYYY-MM-DD' unchanged for
  // safety, so preloaded rows survive a round-trip without shifting.
  if (/^\d{4}-\d{2}$/.test(ym)) return `${ym}-01`
  return ym
}
function lastOfMonth(ym: string): string {
  if (/^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()  // day 0 of next month = last day of this month
    return `${ym}-${String(last).padStart(2, '0')}`
  }
  return ym
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
