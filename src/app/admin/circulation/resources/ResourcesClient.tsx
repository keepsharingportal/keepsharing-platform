'use client'

// Resources Directory client. Mirrors admin/resources.php from the
// v3_FINAL portal source: category-grouped tables with row-level Edit +
// Hide/Show toggles, Add/Edit modal accessed from the page header.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export interface ResourceRow {
  id:          string
  name:        string
  category:    string | null
  description: string | null
  address:     string | null
  city:        string | null
  phone:       string | null
  email:       string | null
  website:     string | null
  active:      boolean
  sort_order:  number
  logo_path:   string | null
  photo_path:  string | null
}

interface Props { resources: ResourceRow[] }

const DEFAULT_CATS = ['Health', 'Education', 'Family Services', 'Community', 'Senior Services', 'Faith']

export function ResourcesClient({ resources }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<null | { kind: 'new' } | { kind: 'edit'; row: ResourceRow }>(null)
  const [busy,  setBusy]  = useState<string | null>(null)

  async function toggleActive(r: ResourceRow) {
    setBusy(r.id)
    try {
      const res = await fetch('/api/admin/circulation/resources', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: r.id, active: !r.active }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? 'Failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  const grouped = useMemo(() => {
    const known = new Set<string>()
    for (const r of resources) if (r.category) known.add(r.category)
    const cats = Array.from(known).sort()
    const buckets: Array<{ cat: string; rows: ResourceRow[] }> = []
    for (const c of cats) {
      const rows = resources.filter(r => r.category === c)
      if (rows.length > 0) buckets.push({ cat: c, rows })
    }
    const uncat = resources.filter(r => !r.category)
    if (uncat.length > 0) buckets.push({ cat: 'Uncategorized', rows: uncat })
    return buckets
  }, [resources])

  const allCats = useMemo(() => {
    const s = new Set<string>(DEFAULT_CATS)
    for (const r of resources) if (r.category) s.add(r.category)
    return Array.from(s).sort()
  }, [resources])

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div><h1 className="ph-title">Resources directory</h1></div>
        <div className="ph-actions">
          <button type="button" onClick={() => setModal({ kind: 'new' })} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add resource
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="alert alert-info mb-3">
          Resources appear on the public &ldquo;Find a copy&rdquo; maps under a <strong>Resources</strong> tab. Use for community partners, family services, healthcare, schools, etc.
        </div>

        {grouped.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="text-sub">No resources yet. Add your first one above.</p>
          </div>
        ) : grouped.map(g => (
          <div key={g.cat} className="mb-4">
            <div className="fw-700 text-sub text-xs mb-2" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>{g.cat}</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <tr key={r.id} style={{ opacity: r.active ? 1 : 0.45 }}>
                      <td>
                        {r.logo_path && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={r.logo_path} alt="" style={{ height: 22, width: 'auto', verticalAlign: 'middle', marginRight: 6 }} />
                        )}
                        <strong>{r.name}</strong>
                        {r.description && (
                          <div className="text-muted text-xs">
                            {r.description.length > 80 ? r.description.slice(0, 80) + '…' : r.description}
                          </div>
                        )}
                      </td>
                      <td className="text-sub text-sm">{r.category ?? ''}</td>
                      <td className="text-sub text-sm">
                        {r.address ?? ''}{r.city ? `, ${r.city}` : ''}
                      </td>
                      <td className="mono text-sm">{r.phone ?? ''}</td>
                      <td>
                        <span className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>{r.active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td>
                        <button type="button" onClick={() => setModal({ kind: 'edit', row: r })} className="btn btn-ghost btn-xs">Edit</button>{' '}
                        <button
                          type="button"
                          onClick={() => toggleActive(r)}
                          disabled={busy === r.id}
                          className={`btn btn-xs ${r.active ? 'btn-ghost' : 'btn-green'}`}
                        >
                          {r.active ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ResourceModal
          existing={modal.kind === 'edit' ? modal.row : undefined}
          knownCategories={allCats}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function ResourceModal({ existing, knownCategories, onClose, onSaved }: {
  existing?: ResourceRow
  knownCategories: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name,       setName]       = useState(existing?.name ?? '')
  const [category,   setCategory]   = useState(existing?.category ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [address,    setAddress]    = useState(existing?.address ?? '')
  const [city,       setCity]       = useState(existing?.city ?? 'Montgomery')
  const [phone,      setPhone]      = useState(existing?.phone ?? '')
  const [email,      setEmail]      = useState(existing?.email ?? '')
  const [website,    setWebsite]    = useState(existing?.website ?? '')
  const [sortOrder,  setSortOrder]  = useState<number>(existing?.sort_order ?? 0)
  const [active,     setActive]     = useState(existing?.active ?? true)
  const [logoPath,   setLogoPath]   = useState(existing?.logo_path ?? '')
  const [photoPath,  setPhotoPath]  = useState(existing?.photo_path ?? '')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    if (!name.trim()) { setErr('Name required.'); return }
    setBusy(true)
    setErr(null)
    try {
      const body = {
        id:          existing?.id,
        name:        name.trim(),
        category:    category.trim() || null,
        description: description.trim() || null,
        address:     address.trim() || null,
        city:        city.trim() || null,
        phone:       phone.trim() || null,
        email:       email.trim() || null,
        website:     website.trim() || null,
        sort_order:  sortOrder,
        active,
        logo_path:   logoPath.trim() || null,
        photo_path:  photoPath.trim() || null,
      }
      const res = await fetch('/api/admin/circulation/resources', {
        method:  existing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="portal-app" style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{existing ? 'Edit resource' : 'Add resource'}</div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
          <div className="fg">
            <label>Category</label>
            <input list="cat-list" value={category} onChange={e => setCategory(e.target.value)} placeholder="Health, Education, Family…" />
            <datalist id="cat-list">
              {knownCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="fg"><label>Description</label><textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Address</label><input value={address} onChange={e => setAddress(e.target.value)} /></div>
          <div className="fg"><label>City</label><input value={city} onChange={e => setCity(e.target.value)} /></div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="fg"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>

        <div className="fg"><label>Website</label><input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" /></div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg">
            <label>Logo URL</label>
            <input value={logoPath} onChange={e => setLogoPath(e.target.value)} placeholder="https:// or /uploads/resources/…" />
          </div>
          <div className="fg">
            <label>Photo URL</label>
            <input value={photoPath} onChange={e => setPhotoPath(e.target.value)} placeholder="https://" />
          </div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Sort order</label><input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></div>
          <div className="fg" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={active} onChange={e => setActive(e.target.checked)} /> Active (show publicly)
            </label>
          </div>
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="modal-footer">
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save resource'}</button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
