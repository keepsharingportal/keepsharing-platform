'use client'

import { useState } from 'react'
import { Plus, Loader2, Star } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'

interface Deal {
  id:           string
  brand_slug:   string
  advertiser_id: string | null
  business_name: string
  category:     string
  headline:     string
  offer:        string
  redeem_how:   string | null
  promo_code:   string | null
  image_url:    string | null
  link_url:     string | null
  valid_from:   string | null
  valid_until:  string | null
  display_order: number
  is_active:    boolean
  is_featured:  boolean
  view_count:   number
  click_count:  number
}

const CATEGORIES = [
  { value: 'venue',         label: 'Venue' },
  { value: 'cake',          label: 'Cake / treats' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'rental',        label: 'Rental' },
  { value: 'printables',    label: 'Printables' },
  { value: 'gifts',         label: 'Gifts' },
  { value: 'other',         label: 'Other' },
]

export function DealsClient({ initial, vendors }: { initial: Deal[]; vendors: Array<{ id: string; business_name: string }> }) {
  const [rows, setRows] = useState<Deal[]>(initial)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({
    brand_slug: 'rrp', advertiser_id: '', business_name: '', category: 'venue',
    headline: '', offer: '', redeem_how: '', promo_code: '',
    image_url: '', link_url: '', valid_until: '', is_featured: false,
  })

  async function add() {
    if (!draft.headline.trim() || !draft.offer.trim() || !draft.business_name.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/birthday/deals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug:    draft.brand_slug || 'rrp',
          advertiser_id: draft.advertiser_id || null,
          business_name: draft.business_name.trim(),
          category:      draft.category,
          headline:      draft.headline.trim(),
          offer:         draft.offer.trim(),
          redeem_how:    draft.redeem_how.trim() || null,
          promo_code:    draft.promo_code.trim() || null,
          image_url:     draft.image_url.trim() || null,
          link_url:      draft.link_url.trim() || null,
          valid_until:   draft.valid_until || null,
          is_featured:   draft.is_featured,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Deal, ...rows])
        setDraft({ brand_slug: 'rrp', advertiser_id: '', business_name: '', category: 'venue', headline: '', offer: '', redeem_how: '', promo_code: '', image_url: '', link_url: '', valid_until: '', is_featured: false })
      }
    } finally { setBusy(false) }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/birthday/deals/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } as Deal : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this deal?')) return
    const res = await fetch(`/api/admin/birthday/deals/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  function onVendorChange(advertiser_id: string) {
    const v = vendors.find(x => x.id === advertiser_id)
    setDraft(d => ({ ...d, advertiser_id, business_name: v?.business_name ?? d.business_name }))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New deal</div>
        <div className="grid sm:grid-cols-4 gap-2">
          <CrudSelect label="Advertiser (link to profile)" value={draft.advertiser_id} onChange={e => onVendorChange(e.target.value)}
            options={[{ value: '', label: '— Manual entry —' }, ...vendors.map(v => ({ value: v.id, label: v.business_name }))]} />
          <CrudInput label="Business name *" value={draft.business_name} onChange={e => setDraft(d => ({ ...d, business_name: e.target.value }))} />
          <CrudSelect label="Category" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} options={CATEGORIES} />
          <CrudSelect label="Brand" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS.filter(b => b.value)} />
        </div>
        <CrudInput label="Headline *" hint="15% off all weekend rentals" value={draft.headline} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} />
        <CrudTextarea label="Offer *" hint="The full deal explanation, 1-2 sentences." rows={2} value={draft.offer} onChange={e => setDraft(d => ({ ...d, offer: e.target.value }))} />
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudInput label="How to redeem" value={draft.redeem_how} onChange={e => setDraft(d => ({ ...d, redeem_how: e.target.value }))} placeholder="Mention RRP at booking" />
          <CrudInput label="Promo code" value={draft.promo_code} onChange={e => setDraft(d => ({ ...d, promo_code: e.target.value }))} placeholder="RRPBIRTHDAY" />
          <CrudInput type="date" label="Valid until" value={draft.valid_until} onChange={e => setDraft(d => ({ ...d, valid_until: e.target.value }))} />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <CrudInput type="url" label="Image URL" value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} />
          <CrudInput type="url" label="Booking / link URL" value={draft.link_url} onChange={e => setDraft(d => ({ ...d, link_url: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={draft.is_featured} onChange={e => setDraft(d => ({ ...d, is_featured: e.target.checked }))} />
          <Star size={11} className="text-amber-500" /> Featured deal (appears first + larger)
        </label>
        <button type="button" onClick={add} disabled={busy || !draft.headline.trim() || !draft.offer.trim() || !draft.business_name.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add deal
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Business</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Headline</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Category</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Valid until</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Featured</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-portal-sub">No deals yet — first one&apos;s on you.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className={`border-b border-portal-border last:border-b-0 hover:bg-portal-bg ${r.is_featured ? 'bg-amber-50/30' : ''}`}>
                <td className="px-3 py-2 text-portal-text font-bold">{r.business_name}</td>
                <td className="px-3 py-2 text-portal-sub">{r.headline}</td>
                <td className="px-3 py-2 text-portal-sub text-[10px] uppercase">{r.category}</td>
                <td className="px-3 py-2 text-portal-sub">{r.valid_until ? new Date(r.valid_until + 'T12:00').toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => patch(r.id, { is_featured: !r.is_featured })}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.is_featured ? 'bg-amber-100 text-amber-800' : 'bg-portal-bg text-portal-sub'}`}>
                    {r.is_featured && <Star size={9} className="inline mr-0.5" />} {r.is_featured ? 'featured' : 'standard'}
                  </button>
                </td>
                <td className="px-3 py-2"><CrudActiveToggle active={r.is_active} onChange={() => patch(r.id, { is_active: !r.is_active })} /></td>
                <td className="px-3 py-2"><CrudDeleteButton onClick={() => remove(r.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
