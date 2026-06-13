'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Archive } from 'lucide-react'

export interface BusinessProfile {
  id:              string
  name:            string
  normalized_name: string
  address:         string | null
  city:            string | null
  state:           string | null
  zip:             string | null
  lat:             number | null
  lng:             number | null
  contact_name:    string | null
  phone:           string | null
  email:           string | null
  website:         string | null
  instagram:       string | null
  facebook:        string | null
  tiktok:          string | null
  logo_path:       string | null
  description:     string | null
  categories:      string[] | null
  archived_at:     string | null
}

export interface LinkedRow {
  id:        string
  label:     string
  sublabel?: string
  badge?:    string | null
  href:      string
}

interface Props {
  profile:    BusinessProfile
  stops:      LinkedRow[]
  listings:   LinkedRow[]
  advertisers: LinkedRow[]
}

export function BusinessProfileClient({ profile, stops, listings, advertisers }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<BusinessProfile>(profile)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  function set<K extends keyof BusinessProfile>(k: K, v: BusinessProfile[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
    setSaved(null)
  }

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/businesses/${profile.id}`, {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          name:         form.name,
          address:      form.address,
          city:         form.city,
          state:        form.state,
          zip:          form.zip,
          contact_name: form.contact_name,
          phone:        form.phone,
          email:        form.email,
          website:      form.website,
          instagram:    form.instagram,
          facebook:     form.facebook,
          tiktok:       form.tiktok,
          logo_path:    form.logo_path,
          description:  form.description,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      setSaved(new Date().toLocaleTimeString())
      router.refresh()
    } finally { setBusy(false) }
  }

  async function archive() {
    if (!confirm(`Archive "${form.name}"?\n\nThe row stays in place but is hidden from the businesses list, the map tier-assignment job, and the ad-match diagnostic. Linked stops/listings/advertisers retain their FKs.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/businesses/${profile.id}`, {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ archived: true }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Archive failed.'); return }
      router.push('/admin/businesses')
    } finally { setBusy(false) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/businesses" className="text-xs" style={{ color: 'var(--color-portal-blue)' }}>
            <ArrowLeft size={11} style={{ display: 'inline', verticalAlign: -2 }} /> Businesses
          </Link>
          <h1 className="ph-title">{form.name}</h1>
        </div>
        <div className="ph-actions">
          {saved && <span className="text-xs" style={{ color: 'var(--color-portal-green)' }}>✓ Saved at {saved}</span>}
          <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-sm">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {err && <div className="alert alert-error mb-4">{err}</div>}

        <div className="grid-2" style={{ alignItems: 'flex-start' }}>

          {/* ── Profile editor ── */}
          <div className="card">
            <div className="card-title mb-3">Profile</div>

            <div className="fg">
              <label>Business name</label>
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="fg">
              <label>Description / tagline</label>
              <textarea rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.8fr', gap: 12 }}>
              <div className="fg"><label>Address</label><input value={form.address ?? ''} onChange={e => set('address', e.target.value)} /></div>
              <div className="fg"><label>City</label><input value={form.city ?? ''} onChange={e => set('city', e.target.value)} /></div>
              <div className="fg"><label>State</label><input value={form.state ?? ''} onChange={e => set('state', e.target.value)} maxLength={2} /></div>
              <div className="fg"><label>ZIP</label><input value={form.zip ?? ''} onChange={e => set('zip', e.target.value)} maxLength={10} /></div>
            </div>

            <div className="fg">
              <label>Contact name</label>
              <input value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg"><label>Phone</label><input type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} /></div>
              <div className="fg"><label>Email</label><input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} /></div>
            </div>

            <div className="fg"><label>Website</label><input type="url" value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="https://" /></div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg"><label>Instagram</label><input value={form.instagram ?? ''} onChange={e => set('instagram', e.target.value)} placeholder="@handle" /></div>
              <div className="fg"><label>Facebook</label><input value={form.facebook ?? ''} onChange={e => set('facebook', e.target.value)} placeholder="https://facebook.com/page" /></div>
            </div>
            <div className="fg"><label>TikTok</label><input value={form.tiktok ?? ''} onChange={e => set('tiktok', e.target.value)} placeholder="@handle" /></div>

            <div className="fg">
              <label>Logo URL</label>
              <input value={form.logo_path ?? ''} onChange={e => set('logo_path', e.target.value)} placeholder="https:// or /uploads/…" />
              <div className="hint">Paste a hosted URL. Will be used on the public map, guide listings, and advertiser landing page.</div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-portal-border)', marginTop: 14, paddingTop: 12 }}>
              <button type="button" onClick={archive} disabled={busy} className="btn btn-red btn-sm">
                <Archive size={12} /> Archive business
              </button>
            </div>
          </div>

          {/* ── Where this business shows up ── */}
          <div>
            <div className="card mb-3">
              <div className="card-title mb-2">Distribution stops <span className="text-muted text-xs">({stops.length})</span></div>
              {stops.length === 0
                ? <p className="text-muted text-sm">Not a pickup location.</p>
                : stops.map(s => <LinkedRowItem key={s.id} row={s} />)}
            </div>

            <div className="card mb-3">
              <div className="card-title mb-2">Guide listings <span className="text-muted text-xs">({listings.length})</span></div>
              {listings.length === 0
                ? <p className="text-muted text-sm">No directory listings.</p>
                : listings.map(l => <LinkedRowItem key={l.id} row={l} />)}
            </div>

            <div className="card mb-3">
              <div className="card-title mb-2">Advertiser account <span className="text-muted text-xs">({advertisers.length})</span></div>
              {advertisers.length === 0
                ? <p className="text-muted text-sm">No active advertiser relationship.</p>
                : advertisers.map(a => <LinkedRowItem key={a.id} row={a} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LinkedRowItem({ row }: { row: LinkedRow }) {
  return (
    <Link href={row.href} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', marginBottom: 4,
      border: '1px solid var(--color-portal-border)',
      borderRadius: 6,
      fontSize: 12,
      textDecoration: 'none', color: 'inherit',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-600">{row.label}</div>
        {row.sublabel && <div className="text-muted text-xs">{row.sublabel}</div>}
      </div>
      {row.badge && <span className="badge badge-blue" style={{ fontSize: 9 }}>{row.badge}</span>}
    </Link>
  )
}
