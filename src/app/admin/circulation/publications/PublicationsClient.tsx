'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export interface PubRow {
  id:          string
  short_name:  string
  name:        string
  abbrev:      string
  color_hex:   string
  print_total: number
  holdback:    number
  sort_order:  number
  active:      boolean
  website:     string | null
  issuu_url:   string | null
  logo_path:   string | null
}

interface Props { pubs: PubRow[] }

export function PublicationsClient({ pubs }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<null | { kind: 'new' } | { kind: 'edit'; pub: PubRow }>(null)
  const [busy,  setBusy]  = useState<string | null>(null)

  async function toggleActive(p: PubRow) {
    setBusy(p.id)
    try {
      const res = await fetch('/api/admin/circulation/publications', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id: p.id, active: !p.active }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? 'Failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div><h1 className="ph-title">Publications</h1></div>
        <div className="ph-actions">
          <button type="button" onClick={() => setModal({ kind: 'new' })} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add publication
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="alert alert-info mb-4">
          Publications control the columns shown on every route sheet and driver stop list. Add a new magazine here and it automatically appears everywhere — no code changes needed.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {pubs.map(p => (
            <div key={p.id} className="card" style={{ borderLeft: `4px solid ${p.color_hex}` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: p.color_hex }}>{p.short_name}</div>
                  <div className="text-sm">{p.name}</div>
                </div>
                {p.logo_path && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.logo_path} alt={p.short_name} style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
                )}
              </div>
              <div className="text-sm text-sub mb-3">
                Print run: <strong className="mono">{p.print_total.toLocaleString()}</strong> &nbsp;·&nbsp; Hold-back: <strong className="mono">{p.holdback.toLocaleString()}</strong>
                <br />
                Available: <strong className="mono">{(p.print_total - p.holdback).toLocaleString()}</strong>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModal({ kind: 'edit', pub: p })} className="btn btn-ghost btn-sm">Edit</button>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  disabled={busy === p.id}
                  className={`btn btn-sm ${p.active ? 'btn-ghost' : 'btn-green'}`}
                >
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {pubs.length === 0 && (
            <p className="text-muted text-sm">No publications yet.</p>
          )}
        </div>
      </div>

      {modal && (
        <PubModal
          existing={modal.kind === 'edit' ? modal.pub : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function PubModal({ existing, onClose, onSaved }: { existing?: PubRow; onClose: () => void; onSaved: () => void }) {
  const [name,       setName]       = useState(existing?.name ?? '')
  const [shortName,  setShortName]  = useState(existing?.short_name ?? '')
  const [abbrev,     setAbbrev]     = useState(existing?.abbrev ?? '')
  const [colorHex,   setColorHex]   = useState(existing?.color_hex ?? '#1A5FA8')
  const [printTotal, setPrintTotal] = useState<number>(existing?.print_total ?? 5000)
  const [holdback,   setHoldback]   = useState<number>(existing?.holdback ?? 50)
  const [sortOrder,  setSortOrder]  = useState<number>(existing?.sort_order ?? 0)
  const [active,     setActive]     = useState(existing?.active ?? true)
  const [website,    setWebsite]    = useState(existing?.website ?? '')
  const [issuuUrl,   setIssuuUrl]   = useState(existing?.issuu_url ?? '')
  const [logoPath,   setLogoPath]   = useState(existing?.logo_path ?? '')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit() {
    if (!name.trim() || !shortName.trim()) { setErr('Name and short name required.'); return }
    setBusy(true)
    setErr(null)
    try {
      const body = {
        id:          existing?.id,
        name:        name.trim(),
        short_name:  shortName.trim().toLowerCase(),
        abbrev:      abbrev.trim().toUpperCase() || shortName.trim().toUpperCase(),
        color_hex:   colorHex,
        print_total: printTotal,
        holdback,
        sort_order:  sortOrder,
        active,
        website:     website.trim() || null,
        issuu_url:   issuuUrl.trim() || null,
        logo_path:   logoPath.trim() || null,
      }
      const res = await fetch('/api/admin/circulation/publications', {
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
      <div onClick={e => e.stopPropagation()} className="portal-app" style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>{existing ? 'Edit publication' : 'Add publication'}</div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="River Region Parents" /></div>
          <div className="fg"><label>Short name</label><input value={shortName} onChange={e => setShortName(e.target.value)} placeholder="rrp" maxLength={10} /></div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Column abbreviation</label><input value={abbrev} onChange={e => setAbbrev(e.target.value)} placeholder="RRP" maxLength={6} /></div>
          <div className="fg"><label>Brand color</label><input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} /></div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Print total</label><input type="number" min={0} value={printTotal} onChange={e => setPrintTotal(Number(e.target.value))} /></div>
          <div className="fg"><label>Hold-back</label><input type="number" min={0} value={holdback} onChange={e => setHoldback(Number(e.target.value))} /></div>
        </div>

        <div className="fg"><label>Website URL</label><input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://www.riverregionparents.com" /></div>
        <div className="fg"><label>Issuu URL <span style={{ fontWeight: 400, color: 'var(--color-portal-muted)' }}>(digital edition link)</span></label><input type="url" value={issuuUrl} onChange={e => setIssuuUrl(e.target.value)} placeholder="https://issuu.com/…" /></div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Sort order</label><input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></div>
          <div className="fg" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={active} onChange={e => setActive(e.target.checked)} /> Active
            </label>
          </div>
        </div>

        <div className="fg">
          <label>Logo URL <span style={{ fontWeight: 400, color: 'var(--color-portal-muted)' }}>(PNG / SVG, any size)</span></label>
          <input value={logoPath} onChange={e => setLogoPath(e.target.value)} placeholder="https:// or /assets/img/…" />
          <div className="hint">Paste a hosted URL. Inline upload coming next.</div>
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="modal-footer">
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save publication'}</button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
