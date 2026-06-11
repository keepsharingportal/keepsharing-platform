'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2 } from 'lucide-react'
import { MARKETS } from '@/lib/markets'
import { saveListingAction, deleteListingAction } from './actions'

interface Category {
  brand_slug: string
  slug:       string
  name:       string
  emoji:      string | null
}

interface Props {
  categories: Category[]
  listing?:   Record<string, unknown>
}

export function ListingEditor({ categories, listing }: Props) {
  const router = useRouter()
  const isEdit = !!listing
  const [brandSlug, setBrandSlug] = useState((listing?.brand_slug as string) ?? 'rrp')
  const [kind,     setKind]      = useState<'business' | 'expert'>((listing?.kind as 'business' | 'expert') ?? 'business')
  const [name,     setName]      = useState((listing?.name        as string) ?? '')
  const [slug,     setSlug]      = useState((listing?.slug        as string) ?? '')
  const [summary,  setSummary]   = useState((listing?.summary     as string) ?? '')
  const [description, setDescription] = useState((listing?.description as string) ?? '')
  const [categorySlugs, setCategorySlugs] = useState<string[]>((listing?.category_slugs as string[]) ?? [])
  const [address, setAddress] = useState((listing?.address as string) ?? '')
  const [city,    setCity]    = useState((listing?.city    as string) ?? '')
  const [state,   setState]   = useState((listing?.state   as string) ?? '')
  const [zip,     setZip]     = useState((listing?.zip     as string) ?? '')
  const [phone,   setPhone]   = useState((listing?.phone   as string) ?? '')
  const [website, setWebsite] = useState((listing?.website as string) ?? '')
  const [email,   setEmail]   = useState((listing?.email   as string) ?? '')
  const [hours,   setHours]   = useState((listing?.hours   as string) ?? '')
  const [heroImageUrl, setHeroImageUrl] = useState((listing?.hero_image_url as string) ?? '')
  const [isFeatured,   setIsFeatured]   = useState((listing?.is_featured as boolean) ?? false)
  const [advertiserAccountId, setAdvertiserAccountId] = useState((listing?.advertiser_account_id as string) ?? '')
  const [status, setStatus] = useState<'pending' | 'published' | 'archived'>((listing?.status as 'pending' | 'published' | 'archived') ?? 'published')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [deleting, startDelete] = useTransition()

  // Categories scoped to the active brand. Picker shows only this brand's
  // categories so we don't accidentally tag an AOP listing with a RRP
  // category — they're independent sets per brand.
  const brandCategories = categories.filter(c => c.brand_slug === brandSlug)

  function save() {
    setErr(null); setMsg(null)
    start(async () => {
      const out = await saveListingAction({
        id:                  isEdit ? (listing!.id as string) : undefined,
        brandSlug, kind, name, slug, summary, description, categorySlugs,
        address, city, state, zip, phone, website, email, hours,
        heroImageUrl, isFeatured,
        advertiserAccountId: advertiserAccountId.trim() || null,
        status,
      })
      if (!out.ok) { setErr(out.error); return }
      setMsg('Saved.')
      if (!isEdit) router.push(`/admin/directory/${out.id}`)
    })
  }

  function remove() {
    if (!isEdit) return
    if (!confirm('Permanently delete this listing? This can\'t be undone.')) return
    startDelete(async () => {
      const out = await deleteListingAction(listing!.id as string)
      if (!out.ok) { setErr(out.error); return }
      router.push('/admin/directory')
    })
  }

  return (
    <div className="space-y-6">
      {/* Brand + status header */}
      <section className="bg-white border border-portal-border rounded-lg p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Brand</label>
          <select
            value={brandSlug}
            onChange={e => setBrandSlug(e.target.value)}
            disabled={isEdit}
            className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white disabled:opacity-50"
          >
            {MARKETS.map(m => <option key={m.slug} value={m.slug}>{m.displayName}</option>)}
          </select>
          {isEdit && <p className="text-[10px] text-portal-muted mt-1">Locked once saved — move via new listing.</p>}
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Kind</label>
          <select value={kind} onChange={e => setKind(e.target.value as 'business' | 'expert')} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            <option value="business">Business</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'pending' | 'published' | 'archived')} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </section>

      {/* Core */}
      <section className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full text-sm px-3 py-2 border border-portal-border rounded-md bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto from name" className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-md bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Summary (one liner)</label>
          <input value={summary} onChange={e => setSummary(e.target.value)} className="w-full text-sm px-3 py-2 border border-portal-border rounded-md bg-white" maxLength={200} />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Description</label>
          <textarea rows={8} value={description} onChange={e => setDescription(e.target.value)} className="w-full text-sm px-3 py-2 border border-portal-border rounded-md bg-white resize-y" />
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white border border-portal-border rounded-lg p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-2">Categories</h3>
        {brandCategories.length === 0 ? (
          <p className="text-xs text-portal-muted">No categories defined for this brand yet. Add some at <span className="font-mono">/admin/directory/categories</span>.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {brandCategories.map(c => {
              const on = categorySlugs.includes(c.slug)
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategorySlugs(p => on ? p.filter(s => s !== c.slug) : [...p, c.slug])}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                    on
                      ? 'bg-portal-blue text-white border-portal-blue'
                      : 'bg-white text-portal-text border-portal-border hover:border-portal-blue'
                  }`}
                >
                  {c.emoji} {c.name}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Contact */}
      <section className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Contact &amp; location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Address" value={address} onChange={setAddress} />
          <Input label="City"    value={city}    onChange={setCity} />
          <Input label="State"   value={state}   onChange={setState} />
          <Input label="ZIP"     value={zip}     onChange={setZip} />
          <Input label="Phone"   value={phone}   onChange={setPhone} />
          <Input label="Website" value={website} onChange={setWebsite} placeholder="https://..." />
          <Input label="Email"   value={email}   onChange={setEmail} />
          <Input label="Hours"   value={hours}   onChange={setHours} placeholder="Mon–Fri 9–5" />
        </div>
      </section>

      {/* Featured / advertiser link */}
      <section className="bg-white border border-portal-border rounded-lg p-5 space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Featured &amp; advertiser link</h3>
        <label className="flex items-center gap-2 text-xs text-portal-text">
          <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
          Featured (appears at the top of the directory + category)
        </label>
        <Input label="Linked advertiser_account_id (optional)" value={advertiserAccountId} onChange={setAdvertiserAccountId} placeholder="UUID — auto-features when set" />
      </section>

      {/* Hero image */}
      <section className="bg-white border border-portal-border rounded-lg p-5">
        <Input label="Hero image URL" value={heroImageUrl} onChange={setHeroImageUrl} placeholder="https://..." />
      </section>

      {err && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
      {msg && <p className="text-xs text-portal-green">{msg}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-4 py-2 rounded-md disabled:opacity-50"
        >
          <Save size={12} /> {pending ? 'Saving…' : 'Save'}
        </button>
        {isEdit && (
          <button
            onClick={remove}
            disabled={deleting}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900"
          >
            <Trash2 size={11} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white"
      />
    </div>
  )
}
