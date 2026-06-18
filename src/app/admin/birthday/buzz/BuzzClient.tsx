'use client'

import { useState } from 'react'
import { Plus, Loader2, Edit2, X } from 'lucide-react'
import { CrudInput, CrudTextarea, CrudSelect, CrudActiveToggle, CrudDeleteButton, BRAND_OPTIONS } from '@/components/admin/BirthdayCrudHelpers'
import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

interface Buzz {
  id:            string
  brand_slug:    string
  kind:          string
  body:          string
  from_name:     string | null
  image_url:     string | null
  vendor_id:     string | null
  vendor_name:   string | null
  link_url:      string | null
  posted_at:     string
  expires_at:    string | null
  is_active:     boolean
}

interface Vendor { id: string; slug: string; business_name: string }

const KIND_OPTIONS = [
  { value: 'vendor_spotlight', label: 'Vendor spotlight → Featured Pros section' },
  { value: 'milestone',        label: 'Kid birthday celebration → Buzz' },
  { value: 'shoutout',         label: 'Mom party story (win or honest fail) → Buzz' },
  { value: 'tip',              label: 'Mom-to-mom tip → Buzz' },
  { value: 'editor_pick',      label: 'Editor pick / "we spotted this" → Buzz' },
]

// Maps kind → which public section it appears in. Used by the filter chips
// and the "where this will appear" hint under the form.
const KIND_SURFACE: Record<string, 'Featured Pros' | 'Buzz'> = {
  vendor_spotlight: 'Featured Pros',
  milestone:        'Buzz',
  shoutout:         'Buzz',
  tip:              'Buzz',
  editor_pick:      'Buzz',
}

export function BuzzClient({ initial, vendors }: { initial: Buzz[]; vendors: Vendor[] }) {
  const [rows, setRows] = useState<Buzz[]>(initial)
  const [busy, setBusy] = useState(false)
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'Featured Pros' | 'Buzz'>('all')
  // Local copy of the vendors list so the quick-create modal can append
  // a new advertiser without a page refresh.
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  // Which row is open in the edit modal (null = closed)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    brand_slug:  'rrp',
    kind:        'vendor_spotlight',
    body:        '',
    from_name:   '',
    image_url:   '',
    vendor_id:   '',
    vendor_name: '',
    link_url:    '',
    expires_at:  '',
  })

  async function add() {
    if (!draft.body.trim()) return
    setBusy(true)
    try {
      const vendor_name = draft.vendor_id ? vendorList.find(v => v.id === draft.vendor_id)?.business_name ?? null : draft.vendor_name.trim() || null
      const res = await fetch('/api/admin/birthday/buzz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_slug:  draft.brand_slug || 'rrp',
          kind:        draft.kind,
          body:        draft.body.trim(),
          from_name:   draft.from_name.trim() || null,
          image_url:   draft.image_url.trim() || null,
          vendor_id:   draft.vendor_id || null,
          vendor_name,
          link_url:    draft.link_url.trim() || null,
          expires_at:  draft.expires_at || null,
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setRows([j as Buzz, ...rows])
        setDraft({ brand_slug: 'rrp', kind: 'vendor_spotlight', body: '', from_name: '', image_url: '', vendor_id: '', vendor_name: '', link_url: '', expires_at: '' })
      }
    } finally { setBusy(false) }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/birthday/buzz/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) setRows(rs => rs.map(r => r.id === id ? { ...r, is_active: !current } : r))
  }
  async function remove(id: string) {
    if (!confirm('Delete this buzz entry?')) return
    const res = await fetch(`/api/admin/birthday/buzz/${id}`, { method: 'DELETE' })
    if (res.ok) setRows(rs => rs.filter(r => r.id !== id))
  }

  const visibleRows = surfaceFilter === 'all'
    ? rows
    : rows.filter(r => KIND_SURFACE[r.kind] === surfaceFilter)
  const featuredProsCount = rows.filter(r => KIND_SURFACE[r.kind] === 'Featured Pros').length
  const communityCount    = rows.filter(r => KIND_SURFACE[r.kind] === 'Buzz').length

  return (
    <div className="space-y-4">
      {/* Where-it-goes guide. Without this the kind dropdown is mysterious. */}
      <div className="bg-portal-blue-lt rounded-lg p-3 text-[11px] text-portal-text leading-relaxed">
        <strong className="text-portal-text">Two public sections feed from this table:</strong>
        <ul className="mt-1 space-y-0.5">
          <li>
            <span className="font-bold text-[#ff7a59]">Featured Birthday Pros</span> (paid editorial spotlights — magazine
            hero + 4 supporting layout). Picks up entries where Kind = <code>vendor_spotlight</code>. Top 5 by posted date win the slots; #1 becomes the Editor&apos;s Pick hero.
          </li>
          <li>
            <span className="font-bold text-portal-sub">Birthday Buzz</span> (community chatter — no paid placements).
            Picks up every other kind: kid celebrations (<code>milestone</code>), mom party stories (<code>shoutout</code>), mom-to-mom tips (<code>tip</code>), editor picks (<code>editor_pick</code>).
          </li>
        </ul>
      </div>

      {/* Surface filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { v: 'all',           l: `All (${rows.length})` },
          { v: 'Featured Pros', l: `Featured Pros (${featuredProsCount})` },
          { v: 'Buzz',          l: `Community Buzz (${communityCount})` },
        ] as const).map(opt => (
          <button key={opt.v} type="button" onClick={() => setSurfaceFilter(opt.v as typeof surfaceFilter)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-full border ${
              surfaceFilter === opt.v ? 'bg-portal-navy text-white border-portal-navy' : 'bg-white text-portal-sub border-portal-border'
            }`}
          >{opt.l}</button>
        ))}
      </div>

      <div className="bg-white border border-portal-border rounded-lg p-4 space-y-3">
        <div className="text-[13px] font-bold text-portal-text">New entry</div>
        {draft.kind && (
          <div className="text-[11px] text-portal-sub">
            Will appear in: <strong className="text-portal-text">{KIND_SURFACE[draft.kind] ?? '—'}</strong>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-2">
          <CrudSelect label="Kind" value={draft.kind} onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))} options={KIND_OPTIONS} />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-portal-text">Vendor (for vendor_spotlight)</label>
              <button type="button" onClick={() => setQuickCreateOpen(true)}
                className="text-[10px] font-bold text-portal-blue hover:underline">
                + Add new vendor
              </button>
            </div>
            <p className="text-[10px] text-portal-sub mb-1">Links the slide to the business profile page.</p>
            <select value={draft.vendor_id} onChange={e => setDraft(d => ({ ...d, vendor_id: e.target.value }))}
              className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white outline-none focus:border-portal-blue">
              <option value="">— None —</option>
              {vendorList.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
            </select>
          </div>
          <CrudSelect label="Brand" value={draft.brand_slug} onChange={e => setDraft(d => ({ ...d, brand_slug: e.target.value }))} options={BRAND_OPTIONS.filter(b => b.value)} />
        </div>
        <CrudTextarea label="Body *" hint="2-3 sentences. First sentence becomes the headline; rest is the pitch."
          rows={3} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
          placeholder="Custom Cakes by Sarah turns 5! Award-winning custom cakes for the most important birthdays in the River Region." />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-portal-text mb-1">Image *</label>
            <p className="text-[10px] text-portal-sub mb-1.5">Upload from your computer OR paste a URL. Wide image works best (~3:2).</p>
            <HeroImageUpload
              value={draft.image_url}
              onChange={(url: string) => setDraft(d => ({ ...d, image_url: url }))}
              context="asset"
              emptyWarning={false}
            />
          </div>
          <div className="space-y-2">
            <CrudInput type="text" label="Attribution (optional)" hint="Shown as 'From Sarah, Pike Road'"
              value={draft.from_name} onChange={e => setDraft(d => ({ ...d, from_name: e.target.value }))} />
            <CrudInput type="url" label="External link (if no vendor picked)"
              value={draft.link_url} onChange={e => setDraft(d => ({ ...d, link_url: e.target.value }))} placeholder="https://…" />
          </div>
        </div>
        <CrudInput type="date" label="Expires (optional)" hint="Falls off the carousel automatically after this date."
          value={draft.expires_at} onChange={e => setDraft(d => ({ ...d, expires_at: e.target.value }))} />
        <button type="button" onClick={add} disabled={busy || !draft.body.trim() || !draft.image_url.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add to Buzz
        </button>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr className="text-left">
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub w-20">Image</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Body</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Vendor / kind</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Posted</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase text-portal-sub">Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-portal-sub">{surfaceFilter === 'all' ? 'Nothing buzzing yet.' : `Nothing in ${surfaceFilter} yet.`}</td></tr>}
            {visibleRows.map(r => (
              <tr key={r.id} className="border-b border-portal-border last:border-b-0 hover:bg-portal-bg">
                <td className="px-3 py-2 cursor-pointer" onClick={() => setEditingId(r.id)}>
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image_url} alt="" className="w-16 h-12 object-cover rounded bg-portal-bg" />
                  )}
                </td>
                <td className="px-3 py-2 text-portal-text max-w-md cursor-pointer" onClick={() => setEditingId(r.id)}>{r.body}</td>
                <td className="px-3 py-2 text-portal-sub cursor-pointer" onClick={() => setEditingId(r.id)}>
                  <div className="font-bold text-portal-text">{r.vendor_name ?? '—'}</div>
                  <div className="text-[10px] uppercase text-portal-sub">{r.kind}</div>
                </td>
                <td className="px-3 py-2 text-portal-sub text-[11px] cursor-pointer" onClick={() => setEditingId(r.id)}>{new Date(r.posted_at).toLocaleDateString()}</td>
                <td className="px-3 py-2"><CrudActiveToggle active={r.is_active} onChange={() => toggleActive(r.id, r.is_active)} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditingId(r.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-blue hover:underline">
                      <Edit2 size={11} /> Edit
                    </button>
                    <CrudDeleteButton onClick={() => remove(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {quickCreateOpen && (
        <QuickAddVendorModal
          onClose={() => setQuickCreateOpen(false)}
          onCreated={(v) => {
            setVendorList(vs => [...vs, v].sort((a, b) => a.business_name.localeCompare(b.business_name)))
            setDraft(d => ({ ...d, vendor_id: v.id }))
            setQuickCreateOpen(false)
          }}
        />
      )}

      {editingId && (() => {
        const row = rows.find(r => r.id === editingId)
        if (!row) return null
        return (
          <EditBuzzModal
            row={row}
            vendors={vendorList}
            onClose={() => setEditingId(null)}
            onSaved={(updated) => {
              setRows(rs => rs.map(r => r.id === updated.id ? updated : r))
              setEditingId(null)
            }}
          />
        )
      })()}
    </div>
  )
}

function EditBuzzModal({ row, vendors, onClose, onSaved }: {
  row:      Buzz
  vendors:  Vendor[]
  onClose:  () => void
  onSaved:  (row: Buzz) => void
}) {
  const [kind,       setKind]       = useState(row.kind)
  const [vendorId,   setVendorId]   = useState(row.vendor_id ?? '')
  const [brandSlug,  setBrandSlug]  = useState(row.brand_slug)
  const [body,       setBody]       = useState(row.body)
  const [imageUrl,   setImageUrl]   = useState(row.image_url ?? '')
  const [fromName,   setFromName]   = useState(row.from_name ?? '')
  const [linkUrl,    setLinkUrl]    = useState(row.link_url ?? '')
  const [expiresAt,  setExpiresAt]  = useState(row.expires_at ? row.expires_at.slice(0, 10) : '')
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function save() {
    setBusy(true); setError(null)
    try {
      const vendor_name = vendorId ? vendors.find(v => v.id === vendorId)?.business_name ?? null : null
      const res = await fetch(`/api/admin/birthday/buzz/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          brand_slug:  brandSlug || 'rrp',
          body:        body.trim(),
          image_url:   imageUrl.trim() || null,
          from_name:   fromName.trim() || null,
          vendor_id:   vendorId || null,
          vendor_name,
          link_url:    linkUrl.trim() || null,
          expires_at:  expiresAt || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'Save failed.'); return }
      onSaved({
        ...row,
        kind,
        brand_slug:  brandSlug || 'rrp',
        body:        body.trim(),
        image_url:   imageUrl.trim() || null,
        from_name:   fromName.trim() || null,
        vendor_id:   vendorId || null,
        vendor_name,
        link_url:    linkUrl.trim() || null,
        expires_at:  expiresAt || null,
      })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 py-3 border-b border-portal-border flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-[15px] font-bold text-portal-text">Edit buzz entry</h2>
            <p className="text-[11px] text-portal-sub">
              {KIND_SURFACE[kind] && <>Currently appears in: <strong className="text-portal-text">{KIND_SURFACE[kind]}</strong></>}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-portal-sub hover:text-portal-text"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <CrudSelect label="Kind" value={kind} onChange={e => setKind(e.target.value)} options={KIND_OPTIONS} />
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Vendor</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                className="w-full px-2 py-1.5 text-[12px] border border-portal-border-2 rounded bg-white">
                <option value="">— None —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.business_name}</option>)}
              </select>
            </div>
            <CrudSelect label="Brand" value={brandSlug} onChange={e => setBrandSlug(e.target.value)} options={BRAND_OPTIONS.filter(b => b.value)} />
          </div>

          <CrudTextarea label="Body *" hint="First sentence becomes the headline; rest is the pitch. Wrap a mom quote in &quot;…&quot; to pull it as an italic block."
            rows={4} value={body} onChange={e => setBody(e.target.value)} />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-portal-text mb-1">Image</label>
              <HeroImageUpload value={imageUrl} onChange={setImageUrl} context="asset" emptyWarning={false} />
            </div>
            <div className="space-y-2">
              <CrudInput label="Attribution" hint="Shown as 'From Sarah, Pike Road'"
                value={fromName} onChange={e => setFromName(e.target.value)} />
              <CrudInput type="url" label="External link" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" />
              <CrudInput type="date" label="Expires" hint="Falls off automatically." value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          {error && <div className="bg-portal-red-lt text-portal-red rounded p-2 text-[12px]">{error}</div>}
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-3 border-t border-portal-border flex items-center gap-2 justify-end rounded-b-2xl">
          <button type="button" onClick={onClose} className="text-[12px] text-portal-sub hover:text-portal-text">Cancel</button>
          <button type="button" onClick={save} disabled={busy || !body.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 size={11} className="animate-spin" />} Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAddVendorModal({ onClose, onCreated }: {
  onClose:   () => void
  onCreated: (vendor: Vendor) => void
}) {
  const [name,    setName]    = useState('')
  const [website, setWebsite] = useState('')
  const [phone,   setPhone]   = useState('')
  const [hood,    setHood]    = useState('')
  const [hook,    setHook]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/birthday/vendors/quick-create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          business_name: name.trim(),
          website_url:   website.trim() || undefined,
          contact_phone: phone.trim()   || undefined,
          neighborhood:  hood.trim()    || undefined,
          card_hook:     hook.trim()    || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.error ?? 'Could not create vendor.'); return }
      onCreated({ id: j.id, slug: j.slug, business_name: j.business_name })
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full my-12" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-portal-border">
          <h2 className="text-[15px] font-bold text-portal-text">Quick-add vendor</h2>
          <p className="text-[11px] text-portal-sub mt-0.5">
            Creates an advertiser account so this spotlight can link to a profile page.
            Fill in the full birthday profile (packages, hours, gallery) later at <code>/admin/birthday/sponsors</code>.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <CrudInput label="Business name *" value={name} onChange={e => setName(e.target.value)} placeholder="Adventure Sports" autoFocus />
          <CrudInput label="Website" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://advsports2.com" />
          <CrudInput label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(334) 555-1234" />
          <CrudInput label="Neighborhood (optional)" value={hood} onChange={e => setHood(e.target.value)} placeholder="Midtown" />
          <CrudInput label="One-line pitch (optional)" value={hook} onChange={e => setHook(e.target.value)} placeholder="Indoor pool party packages year-round." />
          {error && <div className="bg-portal-red-lt text-portal-red rounded p-2 text-[12px]">{error}</div>}
        </div>
        <div className="px-5 py-3 border-t border-portal-border flex items-center gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-[12px] text-portal-sub hover:text-portal-text">Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 size={11} className="animate-spin" />} Create & select
          </button>
        </div>
      </div>
    </div>
  )
}
