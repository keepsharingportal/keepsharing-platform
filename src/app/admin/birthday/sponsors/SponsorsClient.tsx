'use client'

import { useState } from 'react'
import { Edit2, Loader2, Star, X, Plus, ExternalLink } from 'lucide-react'

interface Advertiser {
  id:               string
  slug:             string
  business_name:    string
  hero_photo_url:   string | null
  neighborhood:     string | null
  birthday_tier:    string | null
  birthday_profile: Profile | null
}

interface Profile {
  tagline?: string; phone?: string; email?: string; what_to_know?: string
  good_for_ages?: [number, number]
  indoor_outdoor?: string[]
  gallery?: string[]
  packages?: Array<{ name: string; price?: string; duration?: string; includes?: string[]; note?: string }>
  faq?:      Array<{ q: string; a: string }>
  hours?:    Array<{ day: string; open?: string; close?: string; closed?: boolean }>
}

const TIERS = [
  { value: '',                    label: 'Standard (no tier)' },
  { value: 'featured',            label: 'Featured Partner' },
  { value: 'sponsored_category', label: 'Sponsored Category' },
  { value: 'presenting',          label: 'Presenting Sponsor' },
]

export function SponsorsClient({ initial }: { initial: Advertiser[] }) {
  const [rows, setRows] = useState<Advertiser[]>(initial)
  const [editing, setEditing] = useState<Advertiser | null>(null)
  const [filter, setFilter]   = useState<'all' | 'sponsored' | 'standard'>('all')
  const [search, setSearch]   = useState('')

  async function saveTier(id: string, tier: string) {
    const res = await fetch(`/api/admin/birthday/sponsors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthday_tier: tier || null }),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, birthday_tier: tier || null } : r))
  }

  async function saveProfile(id: string, profile: Profile) {
    const res = await fetch(`/api/admin/birthday/sponsors/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthday_profile: profile }),
    })
    if (res.ok) {
      setRows(rs => rs.map(r => r.id === id ? { ...r, birthday_profile: profile } : r))
      setEditing(null)
    }
  }

  const visible = rows
    .filter(r => filter === 'all' || (filter === 'sponsored' ? !!r.birthday_tier : !r.birthday_tier))
    .filter(r => !search || r.business_name.toLowerCase().includes(search.toLowerCase()))

  const sponsoredCount = rows.filter(r => !!r.birthday_tier).length

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(['all', 'sponsored', 'standard'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-full border ${
                filter === f ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-sub border-portal-border'
              }`}>{f === 'sponsored' ? `Sponsored (${sponsoredCount})` : f}</button>
          ))}
        </div>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…"
          className="ml-auto px-3 py-1.5 text-[12px] border border-portal-border-2 rounded w-64" />
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Business</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Tier</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Profile</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub w-32"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-portal-sub">No matches.</td></tr>}
            {visible.map(r => {
              const filled = !!(r.birthday_profile && Object.keys(r.birthday_profile).length > 0)
              return (
                <tr key={r.id} className={`border-b border-portal-border last:border-b-0 hover:bg-portal-bg ${r.birthday_tier ? 'bg-amber-50/20' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="font-bold text-portal-text">{r.business_name}</div>
                    <div className="text-[10px] text-portal-sub">{r.neighborhood ?? '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select value={r.birthday_tier ?? ''} onChange={e => saveTier(r.id, e.target.value)}
                      className="px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white">
                      {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {r.birthday_tier && <Star size={11} className="inline ml-1 text-amber-500" />}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[11px] font-bold uppercase ${filled ? 'text-emerald-700' : 'text-portal-muted'}`}>
                      {filled ? `✓ ${Object.keys(r.birthday_profile!).length} fields` : 'empty'}
                    </span>
                  </td>
                  <td className="px-3 py-2 flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(r)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-portal-blue hover:bg-portal-bg rounded">
                      <Edit2 size={11} /> Edit profile
                    </button>
                    <a href={`/admin/go/birthday-party-guide/business/${r.slug}`} target="_blank" rel="noopener noreferrer"
                      className="text-portal-sub hover:text-portal-text"><ExternalLink size={11} /></a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProfileEditor
          advertiser={editing}
          onSave={profile => saveProfile(editing.id, profile)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function ProfileEditor({ advertiser, onSave, onCancel }: {
  advertiser: Advertiser
  onSave: (profile: Profile) => void
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [profile, setProfile] = useState<Profile>(advertiser.birthday_profile ?? {})

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(p => ({ ...p, [key]: value }))
  }

  function addPackage() {
    setProfile(p => ({ ...p, packages: [...(p.packages ?? []), { name: '', price: '', duration: '', includes: [], note: '' }] }))
  }
  function removePackage(i: number) {
    setProfile(p => ({ ...p, packages: (p.packages ?? []).filter((_, j) => j !== i) }))
  }
  function updatePackage(i: number, field: string, value: string | string[]) {
    setProfile(p => ({ ...p, packages: (p.packages ?? []).map((pk, j) => j === i ? { ...pk, [field]: value } : pk) }))
  }

  function addFaq() {
    setProfile(p => ({ ...p, faq: [...(p.faq ?? []), { q: '', a: '' }] }))
  }
  function removeFaq(i: number) {
    setProfile(p => ({ ...p, faq: (p.faq ?? []).filter((_, j) => j !== i) }))
  }
  function updateFaq(i: number, field: 'q' | 'a', value: string) {
    setProfile(p => ({ ...p, faq: (p.faq ?? []).map((f, j) => j === i ? { ...f, [field]: value } : f) }))
  }

  function save() {
    setBusy(true)
    // Strip empty packages/faqs
    const clean: Profile = { ...profile }
    if (clean.packages) clean.packages = clean.packages.filter(p => p.name?.trim())
    if (clean.faq)      clean.faq      = clean.faq.filter(f => f.q?.trim() && f.a?.trim())
    if (clean.gallery)  clean.gallery  = clean.gallery.filter(g => g.trim())
    onSave(clean)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-portal-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-[16px] font-bold text-portal-text">Edit profile — {advertiser.business_name}</h2>
            <p className="text-[11px] text-portal-sub">Saves to <code>advertiser_accounts.birthday_profile</code>. Renders on /business/{advertiser.slug}.</p>
          </div>
          <button type="button" onClick={onCancel} className="text-portal-sub hover:text-portal-text"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">Tagline</label>
            <input type="text" value={profile.tagline ?? ''} onChange={e => update('tagline', e.target.value)}
              placeholder="Mobile gymnastics parties for ages 2-6"
              className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Phone</label>
              <input type="tel" value={profile.phone ?? ''} onChange={e => update('phone', e.target.value)}
                className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Email</label>
              <input type="email" value={profile.email ?? ''} onChange={e => update('email', e.target.value)}
                className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Good for ages (min,max)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="min" value={profile.good_for_ages?.[0] ?? ''} onChange={e => update('good_for_ages', [Number(e.target.value), profile.good_for_ages?.[1] ?? 12])}
                  className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
                <input type="number" placeholder="max" value={profile.good_for_ages?.[1] ?? ''} onChange={e => update('good_for_ages', [profile.good_for_ages?.[0] ?? 2, Number(e.target.value)])}
                  className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Indoor / Outdoor</label>
              <div className="flex gap-3 text-[12px] pt-1.5">
                {(['indoor', 'outdoor'] as const).map(k => {
                  const checked = (profile.indoor_outdoor ?? []).includes(k)
                  return (
                    <label key={k} className="flex items-center gap-1 capitalize">
                      <input type="checkbox" checked={checked} onChange={e => {
                        const cur = profile.indoor_outdoor ?? []
                        update('indoor_outdoor', e.target.checked ? [...cur, k] : cur.filter(x => x !== k))
                      }} /> {k}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">What to know (longer description)</label>
            <textarea rows={4} value={profile.what_to_know ?? ''} onChange={e => update('what_to_know', e.target.value)}
              className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded resize-vertical" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">Gallery (one image URL per line)</label>
            <textarea rows={4} value={(profile.gallery ?? []).join('\n')} onChange={e => update('gallery', e.target.value.split('\n').filter(Boolean))}
              placeholder="https://...&#10;https://..."
              className="w-full px-2 py-1.5 text-[11px] font-mono border border-portal-border-2 rounded resize-vertical" />
          </div>

          {/* Packages */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-portal-text">Packages</label>
              <button type="button" onClick={addPackage} className="text-[11px] font-bold text-portal-blue inline-flex items-center gap-0.5"><Plus size={11} />Add package</button>
            </div>
            <div className="space-y-2">
              {(profile.packages ?? []).map((pkg, i) => (
                <div key={i} className="border border-portal-border rounded p-3 space-y-2 bg-portal-bg">
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input type="text" placeholder="Name" value={pkg.name} onChange={e => updatePackage(i, 'name', e.target.value)}
                      className="px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white" />
                    <input type="text" placeholder="$295" value={pkg.price ?? ''} onChange={e => updatePackage(i, 'price', e.target.value)}
                      className="px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white" />
                    <input type="text" placeholder="90 minutes" value={pkg.duration ?? ''} onChange={e => updatePackage(i, 'duration', e.target.value)}
                      className="px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white" />
                  </div>
                  <textarea rows={2} placeholder="Includes (one item per line)" value={(pkg.includes ?? []).join('\n')}
                    onChange={e => updatePackage(i, 'includes', e.target.value.split('\n').filter(Boolean))}
                    className="w-full px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white resize-vertical" />
                  <input type="text" placeholder="Note (optional)" value={pkg.note ?? ''} onChange={e => updatePackage(i, 'note', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white" />
                  <button type="button" onClick={() => removePackage(i)} className="text-[10px] text-portal-red hover:underline">Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-portal-text">FAQ</label>
              <button type="button" onClick={addFaq} className="text-[11px] font-bold text-portal-blue inline-flex items-center gap-0.5"><Plus size={11} />Add Q&A</button>
            </div>
            <div className="space-y-2">
              {(profile.faq ?? []).map((f, i) => (
                <div key={i} className="border border-portal-border rounded p-3 space-y-2 bg-portal-bg">
                  <input type="text" placeholder="Question" value={f.q} onChange={e => updateFaq(i, 'q', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] font-bold border border-portal-border-2 rounded bg-white" />
                  <textarea rows={2} placeholder="Answer" value={f.a} onChange={e => updateFaq(i, 'a', e.target.value)}
                    className="w-full px-2 py-1 text-[11px] border border-portal-border-2 rounded bg-white resize-vertical" />
                  <button type="button" onClick={() => removeFaq(i)} className="text-[10px] text-portal-red hover:underline">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-portal-border flex items-center gap-2 justify-end sticky bottom-0 bg-white rounded-b-2xl">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[12px] font-bold text-portal-sub">Cancel</button>
          <button type="button" onClick={save} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 size={11} className="animate-spin" />} Save profile
          </button>
        </div>
      </div>
    </div>
  )
}
