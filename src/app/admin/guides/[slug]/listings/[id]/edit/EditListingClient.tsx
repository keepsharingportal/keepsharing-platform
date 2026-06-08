'use client'

// EditListingClient — Zoho-style sectioned form for one guide listing.
// Sections:
//   Identity                  — business name + inline contact info
//   Guide placement           — tier, category, year, published flag
//   Editorial                 — card hook, notes
//   CRM association           — link to advertiser_account, with the
//                                'Promote to Featured + create CRM
//                                record' shortcut for the bridge event.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, Loader2, AlertCircle, ExternalLink,
  Building2, BookOpen, Tag, Link2, Sparkles, Unlink,
} from 'lucide-react'

export interface AdvertiserOption {
  id:            string
  business_name: string
}

export interface EditableListing {
  id:                    string
  advertiser_account_id: string | null
  guide_type_slug:       string | null
  listing_tier:          string | null
  category:              string | null
  subcategory:           string | null
  is_published:          boolean | null
  listing_year:          number | null
  display_order:         number | null
  tags:                  string[] | null
  notes:                 string | null
  business_name:         string | null
  office_phone:          string | null
  mobile_phone:          string | null
  website_url:           string | null
  contact_email:         string | null
  address:               string | null
  city_state_zip:        string | null
  neighborhood:          string | null
  hero_photo_url:        string | null
  card_hook:             string | null
  guide_data:            Record<string, unknown> | null
  linked_advertiser_name: string | null
}

interface Props {
  slug:        string
  guideName:   string
  listing:     EditableListing
  advertisers: AdvertiserOption[]
}

export function EditListingClient({ slug, guideName, listing, advertisers }: Props) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [saved, setSaved]       = useState(false)

  // Inline identity
  const [businessName, setBusinessName] = useState(listing.business_name ?? '')
  const [officePhone,  setOfficePhone]  = useState(listing.office_phone ?? '')
  const [mobilePhone,  setMobilePhone]  = useState(listing.mobile_phone ?? '')
  const [website,      setWebsite]      = useState(listing.website_url ?? '')
  const [email,        setEmail]        = useState(listing.contact_email ?? '')
  const [address,      setAddress]      = useState(listing.address ?? '')
  const [cityStateZip, setCityStateZip] = useState(listing.city_state_zip ?? '')
  const [neighborhood, setNeighborhood] = useState(listing.neighborhood ?? '')
  const [heroPhoto,    setHeroPhoto]    = useState(listing.hero_photo_url ?? '')

  // Guide placement
  const [tier,        setTier]        = useState(listing.listing_tier ?? 'community')
  const [category,    setCategory]    = useState(listing.category ?? '')
  const [subcategory, setSubcategory] = useState(listing.subcategory ?? '')
  const [listingYear, setListingYear] = useState<string>(listing.listing_year != null ? String(listing.listing_year) : '')
  const [isPublished, setIsPublished] = useState(listing.is_published ?? true)

  // Editorial
  const [cardHook, setCardHook] = useState(listing.card_hook ?? '')
  const [notes,    setNotes]    = useState(listing.notes ?? '')

  // CRM association picker — when not linked, the editor can type a
  // canonical advertiser name (datalist provides suggestions). Typing
  // an exact existing name → save sets advertiser_account_id to that
  // row. Leaving blank → keep unlinked.
  const [advPickerName, setAdvPickerName] = useState('')

  const backHref = `/admin/guides/${slug}/listings`

  async function onSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      // Resolve advertiser picker text to an id if it matches an
      // existing advertiser. Empty input = no change to link.
      let advertiserPatch: Record<string, unknown> = {}
      const picked = advPickerName.trim()
      if (picked) {
        const hit = advertisers.find(a => a.business_name.toLowerCase() === picked.toLowerCase())
        if (hit) advertiserPatch = { advertiser_account_id: hit.id }
        // If they typed a name that doesn't match, ignore the picker —
        // they should use the Promote button for create-new-advertiser.
      }

      const patch = {
        business_name:   businessName.trim() || null,
        office_phone:    officePhone.trim()  || null,
        mobile_phone:    mobilePhone.trim()  || null,
        website_url:     website.trim()      || null,
        contact_email:   email.trim()        || null,
        address:         address.trim()      || null,
        city_state_zip:  cityStateZip.trim() || null,
        neighborhood:    neighborhood.trim() || null,
        hero_photo_url:  heroPhoto.trim()    || null,
        card_hook:       cardHook.trim()     || null,
        notes:           notes.trim()        || null,
        listing_tier:    tier,
        category:        category.trim()     || null,
        subcategory:     subcategory.trim()  || null,
        listing_year:    listingYear.trim() === '' ? null : Number(listingYear),
        is_published:    isPublished,
        ...advertiserPatch,
      }

      const res = await fetch(`/api/admin/guide-listings/${listing.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setSaved(true)
      setAdvPickerName('')
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!confirm(`Delete this listing for "${businessName || '(unnamed)'}" in ${guideName}? This can't be undone.`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guide-listings/${listing.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      router.push(backHref)
    } finally {
      setDeleting(false)
    }
  }

  async function onPromote() {
    const name = businessName.trim() || advPickerName.trim()
    if (!name) {
      setError('Set a business name first — Promote needs something to attach to.')
      return
    }
    // Decide mode: if the picker matched an existing advertiser, link;
    // otherwise create new with the name.
    const picked = advPickerName.trim()
    const existing = picked
      ? advertisers.find(a => a.business_name.toLowerCase() === picked.toLowerCase())
      : null
    const confirmMsg = existing
      ? `Promote this listing to Featured AND link it to existing advertiser "${existing.business_name}"?`
      : `Promote this listing to Featured AND create a new CRM advertiser record for "${name}"?`
    if (!confirm(confirmMsg)) return

    setPromoting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guide-listings/${listing.id}/promote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(
          existing
            ? { mode: 'link',   advertiser_account_id: existing.id }
            : { mode: 'create', business_name: name }
        ),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      // Jump to the new (or just-linked) advertiser's CRM profile so
      // the editor can keep building out the relationship.
      if (json.advertiser?.id) {
        router.push(`/admin/advertisers/${json.advertiser.id}`)
      } else {
        router.refresh()
      }
    } finally {
      setPromoting(false)
    }
  }

  async function onUnlink() {
    if (!confirm('Unlink this listing from its advertiser? The listing stays here as content; the advertiser_account is untouched.')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/guide-listings/${listing.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ advertiser_account_id: null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white'

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

      {/* Header */}
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft size={12} /> Back to {guideName} listings
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{businessName || '(unnamed listing)'}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {guideName} listing
              {listing.advertiser_account_id && listing.linked_advertiser_name && (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <Link2 size={11} /> Linked to <Link className="text-primary hover:underline" href={`/admin/advertisers/${listing.advertiser_account_id}`}>{listing.linked_advertiser_name}</Link>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800 inline-flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {saved && !error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
          Saved.
        </div>
      )}

      {/* Identity */}
      <Section icon={<Building2 size={14} />} title="Identity">
        <FieldRow label="Business name">
          <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className={inp} />
        </FieldRow>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow label="Office phone">
            <input type="tel" value={officePhone} onChange={e => setOfficePhone(e.target.value)} className={inp} />
          </FieldRow>
          <FieldRow label="Mobile phone">
            <input type="tel" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} className={inp} />
          </FieldRow>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow label="Website">
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)} className={inp} placeholder="https://" />
          </FieldRow>
          <FieldRow label="Contact email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
          </FieldRow>
        </div>
        <FieldRow label="Address">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inp} />
        </FieldRow>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow label="City, State, Zip">
            <input type="text" value={cityStateZip} onChange={e => setCityStateZip(e.target.value)} className={inp} />
          </FieldRow>
          <FieldRow label="Neighborhood">
            <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inp} />
          </FieldRow>
        </div>
        <FieldRow label="Hero photo URL" hint="Shown on featured-tier listings.">
          <input type="url" value={heroPhoto} onChange={e => setHeroPhoto(e.target.value)} className={inp} placeholder="https://" />
        </FieldRow>
      </Section>

      {/* Guide placement */}
      <Section icon={<BookOpen size={14} />} title="Guide placement">
        <FieldRow label="Tier">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {(['community', 'enhanced', 'featured'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-4 py-2 text-sm font-semibold capitalize ${tier === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </FieldRow>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow label="Category">
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className={inp} />
          </FieldRow>
          <FieldRow label="Subcategory">
            <input type="text" value={subcategory} onChange={e => setSubcategory(e.target.value)} className={inp} />
          </FieldRow>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldRow label="Listing year">
            <input type="number" value={listingYear} onChange={e => setListingYear(e.target.value)} className={inp} placeholder="2026" />
          </FieldRow>
          <FieldRow label="Published">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm pt-1">
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
              <span>{isPublished ? 'Live on the public site' : 'Hidden (draft)'}</span>
            </label>
          </FieldRow>
        </div>
      </Section>

      {/* Editorial */}
      <Section icon={<Tag size={14} />} title="Editorial">
        <FieldRow label="Card hook" hint="One-line tagline that shows in directory cards.">
          <input type="text" value={cardHook} onChange={e => setCardHook(e.target.value)} className={inp} />
        </FieldRow>
        <FieldRow label="Internal notes" hint="Not shown to readers — for editorial / sales context.">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inp} />
        </FieldRow>
      </Section>

      {/* CRM association */}
      <Section icon={<Link2 size={14} />} title="CRM Association">
        {listing.advertiser_account_id ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm space-y-2">
            <p className="text-emerald-900">
              Linked to CRM advertiser <Link href={`/admin/advertisers/${listing.advertiser_account_id}`} className="font-bold hover:underline inline-flex items-center gap-1">
                {listing.linked_advertiser_name ?? 'View advertiser'} <ExternalLink size={11} />
              </Link>
            </p>
            <button
              type="button"
              onClick={onUnlink}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-white border border-rose-200 rounded-full hover:bg-rose-50 disabled:opacity-40"
            >
              <Unlink size={12} /> Unlink
            </button>
          </div>
        ) : (
          <>
            <FieldRow
              label="Associate with existing advertiser"
              hint="Type or pick a CRM business. Leave blank to keep this listing as pure directory content."
            >
              <input
                type="text"
                value={advPickerName}
                onChange={e => setAdvPickerName(e.target.value)}
                list={`adv-${listing.id}`}
                placeholder="Type a business name…"
                className={inp}
              />
              <datalist id={`adv-${listing.id}`}>
                {advertisers.map(a => <option key={a.id} value={a.business_name} />)}
              </datalist>
            </FieldRow>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm space-y-2">
              <p className="text-amber-900 font-semibold inline-flex items-center gap-1.5">
                <Sparkles size={14} /> Promote to Featured
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                One click: flips this listing to <b>featured</b> tier AND either links to the typed advertiser above
                (if it matches an existing CRM record) or creates a new advertiser_account seeded from this listing&apos;s info.
                This is the bridge that turns directory content into a paying customer.
              </p>
              <button
                type="button"
                onClick={onPromote}
                disabled={promoting || saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-40"
              >
                {promoting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {promoting ? 'Promoting…' : 'Promote to Featured'}
              </button>
            </div>
          </>
        )}
      </Section>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-700 bg-white border border-rose-200 rounded-full hover:bg-rose-50 disabled:opacity-40"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete listing
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || busy}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {title}
      </header>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1 leading-snug">{hint}</p>}
    </div>
  )
}
